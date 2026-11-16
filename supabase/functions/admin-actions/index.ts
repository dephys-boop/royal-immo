// Supabase Edge Function: admin-actions
// Enforces admin/super_admin verification before approving listings, validating manual payments, or logging audits.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: actor } = await supabaseAdmin.from('profiles').select('role, is_active').eq('id', user.id).single();

    if (!actor || !actor.is_active || !['super_admin', 'admin'].includes(actor.role)) {
      return new Response(JSON.stringify({ error: 'Privilèges administrateur requis' }), { status: 403, headers: corsHeaders });
    }

    const { action, property_id, payment_id, rejection_reason, featured_badge } = await req.json();

    if (action === 'approve_property') {
      const { data: prop } = await supabaseAdmin
        .from('properties')
        .select('*, publication_plans(*)')
        .eq('id', property_id)
        .single();

      if (!prop) return new Response(JSON.stringify({ error: 'Bien introuvable' }), { status: 404, headers: corsHeaders });

      // Ensure at least one succeeded payment exists before publication
      const { data: paid } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('property_id', property_id)
        .eq('status', 'succeeded')
        .limit(1);

      if (!paid || paid.length === 0) {
        return new Response(JSON.stringify({ error: 'Aucun paiement vérifié pour cette annonce' }), { status: 400, headers: corsHeaders });
      }

      const durationDays = prop.publication_plans?.duration_days || 30;
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + durationDays * 86400 * 1000);

      await supabaseAdmin
        .from('properties')
        .update({
          status: 'published',
          published_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          rejection_reason: null,
        })
        .eq('id', property_id);

      await supabaseAdmin.from('publication_history').insert({
        property_id,
        plan_id: prop.plan_id,
        action: 'approved',
        actor_id: user.id,
        starts_at: startsAt.toISOString(),
        ends_at: expiresAt.toISOString(),
        notes: 'Annonce approuvée par la modération',
      });

      await supabaseAdmin.from('notifications').insert({
        user_id: prop.owner_id,
        type: 'listing_approved',
        title: 'Annonce publiée sur ROYAL IMMO',
        body: `Votre annonce « ${prop.title} » est désormais en ligne jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}.`,
        link_url: `/biens/${prop.slug}`,
      });

      await supabaseAdmin.from('admin_logs').insert({
        admin_id: user.id,
        action: 'APPROVE_PROPERTY',
        target_table: 'properties',
        target_id: property_id,
        details: { durationDays, expiresAt },
      });

      return new Response(JSON.stringify({ ok: true, status: 'published' }), { headers: corsHeaders });
    }

    if (action === 'reject_property') {
      const { data: prop } = await supabaseAdmin.from('properties').select('owner_id, title').eq('id', property_id).single();
      await supabaseAdmin
        .from('properties')
        .update({ status: 'rejected', rejection_reason: rejection_reason || 'Non conforme à la charte éditoriale' })
        .eq('id', property_id);

      if (prop) {
        await supabaseAdmin.from('notifications').insert({
          user_id: prop.owner_id,
          type: 'listing_rejected',
          title: 'Annonce refusée',
          body: `Votre annonce « ${prop.title} » nécessite une correction : ${rejection_reason || 'Informations incomplètes'}.`,
          link_url: '/espace-particulier',
        });
      }

      await supabaseAdmin.from('admin_logs').insert({
        admin_id: user.id,
        action: 'REJECT_PROPERTY',
        target_table: 'properties',
        target_id: property_id,
        details: { rejection_reason },
      });

      return new Response(JSON.stringify({ ok: true, status: 'rejected' }), { headers: corsHeaders });
    }

    if (action === 'verify_manual_payment') {
      const { data: payment } = await supabaseAdmin.from('payments').select('*').eq('id', payment_id).single();
      if (!payment) return new Response(JSON.stringify({ error: 'Paiement introuvable' }), { status: 404, headers: corsHeaders });

      await supabaseAdmin
        .from('payments')
        .update({ status: 'succeeded', verified_by: user.id, verified_at: new Date().toISOString() })
        .eq('id', payment_id);

      const invoiceNumber = `RI-MAN-${new Date().getFullYear()}-${payment.id.slice(0, 6).toUpperCase()}`;
      await supabaseAdmin.from('transactions').insert({
        payment_id: payment.id,
        user_id: payment.user_id,
        invoice_number: invoiceNumber,
        provider: 'manual',
        amount_fcfa: payment.amount_fcfa,
        fees_fcfa: 0,
        net_amount_fcfa: payment.amount_fcfa,
        status: 'succeeded',
      });

      await supabaseAdmin
        .from('properties')
        .update({ status: 'pending_validation', plan_id: payment.plan_id })
        .eq('id', payment.property_id);

      await supabaseAdmin.from('admin_logs').insert({
        admin_id: user.id,
        action: 'VERIFY_MANUAL_PAYMENT',
        target_table: 'payments',
        target_id: payment_id,
        details: { invoiceNumber },
      });

      return new Response(JSON.stringify({ ok: true, invoiceNumber }), { headers: corsHeaders });
    }

    if (action === 'set_featured') {
      await supabaseAdmin
        .from('properties')
        .update({ is_featured: Boolean(featured_badge), featured_badge: featured_badge || null })
        .eq('id', property_id);

      await supabaseAdmin.from('admin_logs').insert({
        admin_id: user.id,
        action: 'SET_FEATURED_BADGE',
        target_table: 'properties',
        target_id: property_id,
        details: { featured_badge },
      });

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
