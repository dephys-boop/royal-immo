# ROYAL IMMO — Documentation Technique & Guide de Déploiement

## 1. Architecture Générale
- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS v4, composants inspirés de shadcn/ui, Lucide Icons, Framer Motion (`motion`).
- **Backend Exclusif** : Supabase (PostgreSQL, Supabase Auth, Supabase Storage, Supabase Realtime, Edge Functions Deno, Row Level Security).
- **Marché Cible** : Côte d'Ivoire (FCFA / XOF, Abidjan et villes de l'intérieur, Mobile Money & cartes).

## 2. Structure des Dossiers
- `src/assets/` : Identité visuelle et visuels immobiliers haute définition.
- `src/components/` : Composants UI réutilisables (`ui/`, `brand/`, `property/`, `map/`).
- `src/layouts/` : Gabarits `PublicLayout` et `DashboardLayout`.
- `src/pages/` : Pages publiques, catalogue, fiche détaillée, tunnel de publication, espaces Particulier / Agence / Administration.
- `src/services/` : Couche d'accès aux données Supabase (annonces, auth, paiements, stockage, tableaux de bord).
- `src/integrations/supabase/` : Initialisation sécurisée du client `@supabase/supabase-js`.
- `src/types/` & `src/utils/` : Modèles TypeScript stricts, formatage FCFA, compression d'images.
- `supabase/migrations/` : 4 scripts SQL complets (19 tables, RLS multi-tenant, 4 buckets Storage, données Côte d'Ivoire).
- `supabase/functions/` : 3 Edge Functions (`verify-payment`, `expire-listings`, `admin-actions`).

## 3. Déploiement Supabase (Étapes Officielles)
1. Créer un projet sur [Supabase](https://supabase.com).
2. Exécuter dans l'ordre les migrations SQL dans `SQL Editor` ou via `supabase db push` :
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_storage_buckets.sql`
   - `supabase/migrations/004_seed_ivory_coast.sql`
3. Déployer les Edge Functions via Supabase CLI :
   ```bash
   supabase functions deploy verify-payment
   supabase functions deploy expire-listings
   supabase functions deploy admin-actions
   ```
4. Configurer les secrets des Edge Functions (ne jamais exposer côté Vite) :
   ```bash
   supabase secrets set PAYMENT_WEBHOOK_SECRET=votre_secret_webhook
   supabase secrets set CRON_SECRET=votre_secret_cron
   ```
5. Planifier un cron quotidien/horaire sur `expire-listings` via Supabase Cron (`pg_cron` + `pg_net`).
6. Renseigner les variables frontend dans `.env` :
   ```env
   VITE_SUPABASE_URL="https://VOTRE_PROJET.supabase.co"
   VITE_SUPABASE_ANON_KEY="VOTRE_CLE_ANON_PUBLIQUE"
   ```

## 4. Intégration Paiements Côte d'Ivoire
- Solutions supportées : **Orange Money**, **MTN Mobile Money**, **Moov Money**, **Wave**, **Carte bancaire**, et **Paiement manuel avec justificatif**.
- Flux sécurisé :
  1. Le client initie une session via l'Edge Function `verify-payment`.
  2. L'agrégateur agréé (CinetPay, Wave Business, Paystack) envoie un webhook signé (`x-webhook-signature`).
  3. L'Edge Function valide la signature et le montant exact FCFA, enregistre la transaction et passe l'annonce en statut `pending_validation`.
  4. Un administrateur approuve l'annonce via `admin-actions`, calculant automatiquement `expires_at` selon la durée payée (7j, 15j, 30j, 60j, 90j).

## 5. Sécurité & RLS
- Clé `service_role` strictement confinée aux Edge Functions.
- Isolation stricte des agences via `public.belongs_to_agency(agency_id)`.
- Masquage par défaut des adresses exactes des propriétaires (`show_exact_address = false`).
- Impossible pour un utilisateur de modifier son propre rôle ou de passer une annonce en `published` côté client.

## 6. Build & Production
```bash
npm install
npm run lint
npm run build
```
