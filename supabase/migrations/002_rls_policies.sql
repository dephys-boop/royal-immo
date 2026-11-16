-- ROYAL IMMO - Migration 002: Row Level Security (RLS) Policies
-- Strict multi-tenant isolation, role enforcement, and secure payment protection

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin') AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.belongs_to_agency(target_agency_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agencies WHERE id = target_agency_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.agency_members WHERE agency_id = target_agency_id AND profile_id = auth.uid() AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. profiles
CREATE POLICY "profiles_self_or_admin_select" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_public_agency_agents" ON public.profiles FOR SELECT
  USING (role IN ('agency', 'agent'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  USING (public.is_admin());

-- 2. agencies
CREATE POLICY "agencies_public_read" ON public.agencies FOR SELECT
  USING (is_active = TRUE OR public.belongs_to_agency(id) OR public.is_admin());
CREATE POLICY "agencies_owner_insert" ON public.agencies FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "agencies_owner_update" ON public.agencies FOR UPDATE
  USING (owner_id = auth.uid() OR public.is_admin());

-- 3. agency_members (strictly isolated per agency)
CREATE POLICY "agency_members_isolated_select" ON public.agency_members FOR SELECT
  USING (public.belongs_to_agency(agency_id) OR public.is_admin());
CREATE POLICY "agency_members_owner_manage" ON public.agency_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid())
    OR public.is_admin()
  );

-- 4, 5, 6. public reference catalogs
CREATE POLICY "categories_public_read" ON public.property_categories FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "categories_admin_write" ON public.property_categories FOR ALL USING (public.is_admin());

CREATE POLICY "locations_public_read" ON public.locations FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "locations_admin_write" ON public.locations FOR ALL USING (public.is_admin());

CREATE POLICY "plans_public_read" ON public.publication_plans FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "plans_admin_write" ON public.publication_plans FOR ALL USING (public.is_admin());

-- 7. properties
CREATE POLICY "properties_public_read_published" ON public.properties FOR SELECT
  USING (
    (status = 'published' AND (expires_at IS NULL OR expires_at > NOW()))
    OR owner_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.belongs_to_agency(agency_id))
    OR public.is_admin()
  );

CREATE POLICY "properties_owner_or_agent_insert" ON public.properties FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND status IN ('draft', 'pending_payment')
    AND (agency_id IS NULL OR public.belongs_to_agency(agency_id))
  );

-- Owners cannot self-publish or modify featured badges directly
CREATE POLICY "properties_owner_or_agent_update" ON public.properties FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.belongs_to_agency(agency_id))
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_admin() OR (
      status IN ('draft', 'pending_payment', 'archived')
      AND is_featured = FALSE
    )
  );

CREATE POLICY "properties_owner_or_admin_delete" ON public.properties FOR DELETE
  USING (owner_id = auth.uid() OR public.is_admin());

-- 8. property_images
CREATE POLICY "property_images_select" ON public.property_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (
        (p.status = 'published' AND (p.expires_at IS NULL OR p.expires_at > NOW()))
        OR p.owner_id = auth.uid()
        OR (p.agency_id IS NOT NULL AND public.belongs_to_agency(p.agency_id))
        OR public.is_admin()
      )
    )
  );

CREATE POLICY "property_images_owner_manage" ON public.property_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (
        p.owner_id = auth.uid()
        OR (p.agency_id IS NOT NULL AND public.belongs_to_agency(p.agency_id))
        OR public.is_admin()
      )
    )
  );

-- 9. favorites
CREATE POLICY "favorites_self_manage" ON public.favorites FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 10 & 11. payments & transactions (ONLY Edge Functions / service_role can mark succeeded/verified)
CREATE POLICY "payments_user_read_insert" ON public.payments FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "payments_user_create_pending" ON public.payments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
-- Note: UPDATE/DELETE on payments is restricted to service_role Edge Functions or admins!
CREATE POLICY "payments_admin_read_update" ON public.payments FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "transactions_user_or_admin_read" ON public.transactions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- 12. publication_history
CREATE POLICY "pub_history_read" ON public.publication_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
    OR public.is_admin()
  );

-- 13. visits
CREATE POLICY "visits_participant_read" ON public.visits FOR SELECT
  USING (
    requester_id = auth.uid()
    OR owner_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.belongs_to_agency(agency_id))
    OR public.is_admin()
  );
CREATE POLICY "visits_anyone_insert" ON public.visits FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY "visits_owner_or_agency_update" ON public.visits FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.belongs_to_agency(agency_id))
    OR public.is_admin()
  );

-- 14 & 15. contracts & rental_payments (STRICT agency tenant isolation)
CREATE POLICY "contracts_agency_isolated" ON public.contracts FOR ALL
  USING (public.belongs_to_agency(agency_id) OR public.is_admin())
  WITH CHECK (public.belongs_to_agency(agency_id) OR public.is_admin());

CREATE POLICY "rental_payments_agency_isolated" ON public.rental_payments FOR ALL
  USING (public.belongs_to_agency(agency_id) OR public.is_admin())
  WITH CHECK (public.belongs_to_agency(agency_id) OR public.is_admin());

-- 16. notifications
CREATE POLICY "notifications_self_manage" ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "notifications_self_update_read" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 17. reports
CREATE POLICY "reports_create" ON public.reports FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "reports_admin_manage" ON public.reports FOR ALL USING (public.is_admin());

-- 18. admin_logs
CREATE POLICY "admin_logs_admin_read" ON public.admin_logs FOR SELECT USING (public.is_admin());

-- 19. site_settings
CREATE POLICY "site_settings_public_read" ON public.site_settings FOR SELECT USING (TRUE);
CREATE POLICY "site_settings_super_admin_write" ON public.site_settings FOR ALL USING (public.is_super_admin());
