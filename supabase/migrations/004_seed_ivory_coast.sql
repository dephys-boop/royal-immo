-- ROYAL IMMO - Migration 004: Ivory Coast Locations, Official Categories & Plans

INSERT INTO public.property_categories (name, slug, icon, sort_order) VALUES
  ('Maison', 'maison', 'Home', 1),
  ('Villa', 'villa', 'Castle', 2),
  ('Appartement', 'appartement', 'Building2', 3),
  ('Studio', 'studio', 'DoorOpen', 4),
  ('Terrain', 'terrain', 'Map', 5),
  ('Immeuble', 'immeuble', 'Building', 6),
  ('Magasin', 'magasin', 'Store', 7),
  ('Bureau', 'bureau', 'Briefcase', 8),
  ('Entrepôt', 'entrepot', 'Warehouse', 9),
  ('Résidence', 'residence', 'KeyRound', 10),
  ('Hôtel', 'hotel', 'Hotel', 11),
  ('Autres biens', 'autres-biens', 'Layers', 12)
ON CONFLICT (slug) DO NOTHING;

-- Official ROYAL IMMO Publication Tariffs (FCFA)
INSERT INTO public.publication_plans (code, name, duration_days, price_fcfa, description, sort_order) VALUES
  ('PLAN_7D', 'Essentiel 7 jours', 7, 1000, 'Diffusion standard pendant 7 jours consécutifs', 1),
  ('PLAN_15D', 'Visibilité 15 jours', 15, 1500, 'Diffusion étendue sur 15 jours avec statistiques', 2),
  ('PLAN_30D', 'Standard 30 jours', 30, 2500, 'Plan recommandé : 1 mois complet de visibilité', 3),
  ('PLAN_60D', 'Confort 60 jours', 60, 4000, 'Visibilité longue durée de 2 mois', 4),
  ('PLAN_90D', 'Prestige 90 jours', 90, 5000, 'Couverture trimestrielle complète pour biens d''exception', 5)
ON CONFLICT (code) DO NOTHING;

-- Côte d'Ivoire Cities, Communes & Quartiers
INSERT INTO public.locations (city, commune, quartier, latitude, longitude) VALUES
  ('Abidjan', 'Cocody', 'Riviera Golf', 5.335800, -3.963900),
  ('Abidjan', 'Cocody', 'Riviera Palmeraie', 5.367200, -3.951100),
  ('Abidjan', 'Cocody', 'Angré 8e Tranche', 5.394100, -3.979400),
  ('Abidjan', 'Cocody', 'Deux Plateaux Vallon', 5.363800, -3.997200),
  ('Abidjan', 'Cocody', 'Ambassades', 5.338900, -3.999800),
  ('Abidjan', 'Plateau', 'Centre des Affaires', 5.323500, -4.020700),
  ('Abidjan', 'Marcory', 'Zone 4C', 5.291200, -3.987300),
  ('Abidjan', 'Marcory', 'Biétry', 5.284800, -3.974600),
  ('Abidjan', 'Yopougon', 'Niangon', 5.331500, -4.093400),
  ('Abidjan', 'Yopougon', 'Maroc', 5.352200, -4.075100),
  ('Abidjan', 'Koumassi', 'Grand Carrefour', 5.294300, -3.952200),
  ('Abidjan', 'Treichville', 'Avenue 16', 5.302500, -4.006100),
  ('Abidjan', 'Abobo', 'Dokui', 5.405200, -4.018500),
  ('Bingerville', 'Bingerville', 'Cité Feh Kessé', 5.355400, -3.885100),
  ('Grand-Bassam', 'Grand-Bassam', 'Quartier France', 5.196500, -3.738100),
  ('Assinie', 'Assinie-Mafia', 'Assinie Terminal', 5.141900, -3.297400),
  ('Yamoussoukro', 'Yamoussoukro', 'Habitat', 6.827600, -5.289300),
  ('Bouaké', 'Bouaké', 'Air France', 7.690600, -5.030300),
  ('San Pedro', 'San Pedro', 'Balmer', 4.748500, -6.636300),
  ('Divo', 'Divo', 'Plateau Divo', 5.837200, -5.357200),
  ('Gagnoa', 'Gagnoa', 'Garahio', 6.131900, -5.950600),
  ('Lakota', 'Lakota', 'Centre-Ville', 5.847500, -5.682200);

INSERT INTO public.site_settings (key, value, description) VALUES
  ('brand_info', '{"name": "ROYAL IMMO", "slogan": "L''immobilier en toute confiance", "currency": "FCFA", "support_phone": "+225 27 22 00 00 00", "support_email": "contact@royalimmo.ci"}', 'Informations officielles de la plateforme'),
  ('moderation_policy', '{"require_admin_approval": true, "auto_expire_enabled": true, "allow_manual_payment": true}', 'Politique de modération et de paiement')
ON CONFLICT (key) DO NOTHING;
