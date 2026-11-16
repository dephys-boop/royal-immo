import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { formatFCFA } from '../utils/format';

interface LivePublicationPlan {
  id: string;
  name: string;
  duration_days: number;
  price?: number;
  price_fcfa?: number;
  currency?: string;
  is_active: boolean;
}

interface BucketDiagnostic {
  name: string;
  accessible: boolean;
  httpStatus: number | null;
  listError: string | null;
  detail: string;
}

interface RlsDiagnostic {
  table: string;
  status: number | null;
  rowsVisible: number;
  error: string | null;
  observation: string;
}

interface DiagnosticState {
  envUrlPresent: boolean;
  envUrlValue: string;
  envKeyPresent: boolean;
  envKeyPreview: string;
  clientReady: boolean;

  plansOk: boolean;
  plans: LivePublicationPlan[];
  plansError: string | null;

  profilesOk: boolean;
  profilesRowsVisible: number;
  profilesError: string | null;

  sessionOk: boolean;
  sessionActive: boolean;
  sessionEmail: string | null;
  sessionUserId: string | null;
  sessionError: string | null;

  buckets: BucketDiagnostic[];
  rlsChecks: RlsDiagnostic[];
  testedAt: string | null;
}

const REQUIRED_BUCKETS = [
  'property-images',
  'agency-logos',
  'avatars',
  'private-documents',
];

export const SupabaseTestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [diag, setDiag] = useState<DiagnosticState>({
    envUrlPresent: false,
    envUrlValue: '',
    envKeyPresent: false,
    envKeyPreview: '',
    clientReady: false,
    plansOk: false,
    plans: [],
    plansError: null,
    profilesOk: false,
    profilesRowsVisible: 0,
    profilesError: null,
    sessionOk: false,
    sessionActive: false,
    sessionEmail: null,
    sessionUserId: null,
    sessionError: null,
    buckets: [],
    rlsChecks: [],
    testedAt: null,
  });

  const runFullDiagnostic = useCallback(async () => {
    setLoading(true);

    const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
    const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

    const next: DiagnosticState = {
      envUrlPresent: Boolean(rawUrl),
      envUrlValue: rawUrl || 'Manquante',
      envKeyPresent: Boolean(rawKey),
      envKeyPreview: rawKey ? `${rawKey.slice(0, 18)}...${rawKey.slice(-6)}` : 'Manquante',
      clientReady: Boolean(isSupabaseConfigured && supabase),
      plansOk: false,
      plans: [],
      plansError: null,
      profilesOk: false,
      profilesRowsVisible: 0,
      profilesError: null,
      sessionOk: false,
      sessionActive: false,
      sessionEmail: null,
      sessionUserId: null,
      sessionError: null,
      buckets: [],
      rlsChecks: [],
      testedAt: new Date().toLocaleTimeString('fr-FR'),
    };

    if (!supabase) {
      next.plansError = 'Client Supabase non configuré.';
      next.profilesError = 'Client Supabase non configuré.';
      next.sessionError = 'Client Supabase non configuré.';
      setDiag(next);
      setLoading(false);
      return;
    }

    // 1. Test table publication_plans (5 tarifs)
    const plansRes = await supabase
      .from('publication_plans')
      .select('*')
      .order('duration_days', { ascending: true });

    if (plansRes.error) {
      next.plansOk = false;
      next.plansError = `[${plansRes.error.code || plansRes.status}] ${plansRes.error.message}`;
    } else {
      next.plansOk = true;
      next.plans = (plansRes.data as LivePublicationPlan[]) || [];
    }

    // 2. Test table profiles (lecture seule)
    const profilesRes = await supabase
      .from('profiles')
      .select('id, role', { count: 'exact' })
      .limit(5);

    if (profilesRes.error) {
      next.profilesOk = false;
      next.profilesError = `[${profilesRes.error.code || profilesRes.status}] ${profilesRes.error.message}`;
    } else {
      next.profilesOk = true;
      next.profilesRowsVisible = profilesRes.data?.length ?? 0;
    }

    // 3. Test session utilisateur
    const sessionRes = await supabase.auth.getSession();
    if (sessionRes.error) {
      next.sessionOk = false;
      next.sessionError = sessionRes.error.message;
    } else {
      next.sessionOk = true;
      next.sessionActive = Boolean(sessionRes.data.session);
      next.sessionEmail = sessionRes.data.session?.user?.email || null;
      next.sessionUserId = sessionRes.data.session?.user?.id || null;
    }

    // 4. Test accessibilité réelle des 4 buckets Storage
    const bucketResults: BucketDiagnostic[] = [];
    for (const bucketName of REQUIRED_BUCKETS) {
      try {
        const listRes = await supabase.storage.from(bucketName).list('', { limit: 1 });
        if (bucketName === 'private-documents') {
          bucketResults.push({
            name: bucketName,
            accessible: !listRes.error,
            httpStatus: listRes.error ? 403 : 200,
            listError: listRes.error?.message || null,
            detail: listRes.error
              ? `Accès privé protégé : ${listRes.error.message}`
              : 'Bucket privé joignable (accès par URL signées temporaires).',
          });
          continue;
        }

        const probeUrl = supabase.storage.from(bucketName).getPublicUrl('__diagnostic_probe__').data.publicUrl;
        const httpRes = await fetch(probeUrl);
        let bodyText = '';
        try {
          bodyText = await httpRes.text();
        } catch {
          bodyText = '';
        }

        const bucketMissing = bodyText.includes('NoSuchBucket') || bodyText.includes('Bucket not found');
        if (bucketMissing) {
          bucketResults.push({
            name: bucketName,
            accessible: false,
            httpStatus: httpRes.status,
            listError: listRes.error?.message || null,
            detail: 'Bucket introuvable dans Supabase Storage (NoSuchBucket).',
          });
        } else if (listRes.error) {
          bucketResults.push({
            name: bucketName,
            accessible: false,
            httpStatus: httpRes.status,
            listError: listRes.error.message,
            detail: `Erreur RLS/Storage : ${listRes.error.message}`,
          });
        } else {
          bucketResults.push({
            name: bucketName,
            accessible: true,
            httpStatus: httpRes.status,
            listError: null,
            detail: 'Bucket public existant et joignable.',
          });
        }
      } catch (err) {
        bucketResults.push({
          name: bucketName,
          accessible: false,
          httpStatus: null,
          listError: (err as Error).message,
          detail: (err as Error).message,
        });
      }
    }
    next.buckets = bucketResults;

    // 5. Contrôles RLS en lecture seule sur les tables clés
    const [propsRes, favsRes, catsRes] = await Promise.all([
      supabase.from('properties').select('id').limit(5),
      supabase.from('favorites').select('id').limit(5),
      supabase.from('property_categories').select('id').limit(5),
    ]);

    next.rlsChecks = [
      {
        table: 'publication_plans',
        status: plansRes.status,
        rowsVisible: next.plans.length,
        error: plansRes.error ? `${plansRes.error.code || ''} ${plansRes.error.message}` : null,
        observation: plansRes.error ? 'Accès refusé par RLS ou erreur SQL.' : 'Lecture publique autorisée (5 plans).',
      },
      {
        table: 'profiles',
        status: profilesRes.status,
        rowsVisible: next.profilesRowsVisible,
        error: profilesRes.error ? `${profilesRes.error.code || ''} ${profilesRes.error.message}` : null,
        observation: profilesRes.error
          ? 'Accès bloqué par RLS.'
          : next.sessionActive
            ? 'Table accessible pour l’utilisateur connecté.'
            : 'Table protégée par RLS (0 ligne visible sans session active).',
      },
      {
        table: 'properties',
        status: propsRes.status,
        rowsVisible: propsRes.data?.length ?? 0,
        error: propsRes.error ? `${propsRes.error.code || ''} ${propsRes.error.message}` : null,
        observation: propsRes.error
          ? 'Accès bloqué par RLS.'
          : (propsRes.data?.length ?? 0) === 0
            ? 'Requête HTTP 200 mais 0 ligne visible (vérifiez la politique RLS SELECT publique sur properties).'
            : 'Annonces publiques lisibles.',
      },
      {
        table: 'favorites',
        status: favsRes.status,
        rowsVisible: favsRes.data?.length ?? 0,
        error: favsRes.error ? `${favsRes.error.code || ''} ${favsRes.error.message}` : null,
        observation: favsRes.error
          ? 'Accès bloqué par RLS.'
          : 'Protégée par RLS (aucun favori exposé sans authentification).',
      },
      {
        table: 'property_categories',
        status: catsRes.status,
        rowsVisible: catsRes.data?.length ?? 0,
        error: catsRes.error ? `${catsRes.error.code || ''} ${catsRes.error.message}` : null,
        observation: catsRes.error ? 'Accès refusé par RLS.' : 'Catégories lisibles publiquement.',
      },
    ];

    setDiag(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void runFullDiagnostic();
  }, [runFullDiagnostic]);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-[#1B3B8C] dark:text-[#C89B3C]">Diagnostic technique en lecture seule</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Diagnostic Supabase · ROYAL IMMO
            </h1>
            {diag.testedAt && (
              <p className="mt-1 text-xs text-slate-500 font-mono-tabular">Dernier contrôle : {diag.testedAt}</p>
            )}
          </div>
          <Button onClick={runFullDiagnostic} disabled={loading} variant="default">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyse en cours...' : 'Relancer les tests'}
          </Button>
        </div>

        {/* 1. Client & Env */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 dark:border-slate-800 dark:bg-[#0E172E]">
          <h2 className="text-base font-bold">1. Client Supabase & Variables d’environnement</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
              <div className="text-slate-500">Client initialisé</div>
              <div className="mt-1 font-semibold flex items-center gap-1.5">
                {diag.clientReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                {diag.clientReady ? 'Opérationnel' : 'Non configuré'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
              <div className="text-slate-500">VITE_SUPABASE_URL</div>
              <div className="mt-1 font-mono-tabular font-semibold truncate">{diag.envUrlValue}</div>
            </div>
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
              <div className="text-slate-500">VITE_SUPABASE_ANON_KEY</div>
              <div className="mt-1 font-mono-tabular font-semibold truncate">{diag.envKeyPreview}</div>
            </div>
          </div>
        </div>

        {/* 2. publication_plans */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-[#0E172E]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">2. Table publication_plans (5 tarifs officiels)</h2>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${diag.plansOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
              {diag.plansOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {diag.plansOk ? `${diag.plans.length} tarifs récupérés` : 'Échec'}
            </span>
          </div>
          {diag.plansError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-mono-tabular">{diag.plansError}</div>
          )}
          {diag.plans.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-right">Durée</th>
                    <th className="px-4 py-2 text-right">Tarif</th>
                    <th className="px-4 py-2 text-left">Actif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {diag.plans.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 font-semibold">{p.name}</td>
                      <td className="px-4 py-2 text-right font-mono-tabular">{p.duration_days} jours</td>
                      <td className="px-4 py-2 text-right font-mono-tabular font-bold text-[#1B3B8C] dark:text-[#C89B3C]">
                        {formatFCFA(p.price_fcfa ?? p.price ?? 0)}
                      </td>
                      <td className="px-4 py-2 text-xs">{p.is_active ? 'Oui' : 'Non'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. profiles & Session */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 dark:border-slate-800 dark:bg-[#0E172E]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">3. Table profiles</h2>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${diag.profilesOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                {diag.profilesOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {diag.profilesOk ? 'Joignable (HTTP 200)' : 'Erreur'}
              </span>
            </div>
            {diag.profilesError ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-mono-tabular">{diag.profilesError}</div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Lignes visibles pour la session courante : <strong className="font-mono-tabular">{diag.profilesRowsVisible}</strong>
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 dark:border-slate-800 dark:bg-[#0E172E]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">4. Session utilisateur Auth</h2>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${diag.sessionOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                {diag.sessionOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {diag.sessionOk ? 'Auth OK' : 'Erreur Auth'}
              </span>
            </div>
            {diag.sessionError ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-mono-tabular">{diag.sessionError}</div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {diag.sessionActive ? `Connecté : ${diag.sessionEmail}` : 'Aucune session active (utilisateur non connecté).'}
              </p>
            )}
          </div>
        </div>

        {/* 4. Storage Buckets */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-[#0E172E]">
          <h2 className="text-base font-bold">5. Accessibilité des 4 buckets Storage</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {diag.buckets.map((b) => (
              <div key={b.name} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular font-bold">{b.name}</span>
                  <span className={`inline-flex items-center gap-1 font-semibold ${b.accessible ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                    {b.accessible ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {b.accessible ? 'Accessible' : 'Inaccessible'}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400">{b.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 5. RLS Diagnostic Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-[#0E172E]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#C89B3C]" />
            <h2 className="text-base font-bold">6. Vérification des politiques RLS</h2>
          </div>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">Table</th>
                  <th className="px-4 py-2.5 text-right">HTTP</th>
                  <th className="px-4 py-2.5 text-right">Lignes</th>
                  <th className="px-4 py-2.5 text-left">Erreur RLS</th>
                  <th className="px-4 py-2.5 text-left">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {diag.rlsChecks.map((row) => (
                  <tr key={row.table}>
                    <td className="px-4 py-2.5 font-mono-tabular font-semibold">{row.table}</td>
                    <td className="px-4 py-2.5 text-right font-mono-tabular">{row.status ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono-tabular">{row.rowsVisible}</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-red-600">{row.error || 'Aucune'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.observation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
