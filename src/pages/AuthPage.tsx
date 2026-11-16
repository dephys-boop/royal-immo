import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, KeyRound, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { usePlatform } from '../hooks/usePlatform';
import { isSupabaseConfigured } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input, Select } from '../components/ui/input';
import type { UserRole } from '../types/database';

export const AuthPage: React.FC = () => {
  const { connectionCheck, store } = usePlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'login' | 'register'>(() =>
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+225 ');
  const [role, setRole] = useState<'individual' | 'agency' | 'customer'>('individual');
  const [agencyName, setAgencyName] = useState('');
  const [city, setCity] = useState('Abidjan');
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingConn, setTestingConn] = useState(false);

  useEffect(() => {
    const paramMode = searchParams.get('mode');
    if (paramMode === 'register') {
      setMode('register');
      setError(null);
    } else if (paramMode === 'login') {
      setMode('login');
      setError(null);
    }
  }, [searchParams]);

  const routeByRole = (r: UserRole) => {
    if (r === 'super_admin' || r === 'admin') navigate('/administration');
    else if (r === 'agency' || r === 'agent') navigate('/espace-agence');
    else navigate('/espace-particulier');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await store.signInWithPassword(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          const user = store.getSnapshot().currentUser;
          routeByRole(user?.role || 'individual');
        }
      } else {
        const res = await store.signUp({ email, password, fullName, phone, role, agencyName, city });
        if (res.error) {
          setError(res.error);
        } else if (res.requiresEmailConfirmation) {
          setInfoMsg('Compte créé ! Veuillez confirmer votre adresse email via le lien reçu dans votre boîte de réception avant de vous connecter.');
          setMode('login');
        } else {
          routeByRole(role);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    await store.runConnectionDiagnostic();
    setTestingConn(false);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#0E172E]">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-900 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setInfoMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md cursor-pointer ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-xs dark:bg-[#1B3B8C] dark:text-white' : 'text-slate-500'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setInfoMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md cursor-pointer ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-xs dark:bg-[#1B3B8C] dark:text-white' : 'text-slate-500'
              }`}
            >
              Créer un compte
            </button>
          </div>

          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'login' ? 'Accéder à votre espace ROYAL IMMO' : 'Inscription sur ROYAL IMMO'}
          </h1>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 flex gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1">Type de compte</label>
                  <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                    <option value="individual">Particulier (propriétaire / vendeur)</option>
                    <option value="agency">Agence immobilière</option>
                    <option value="customer">Acheteur / Locataire</option>
                  </Select>
                </div>

                {role === 'agency' && (
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nom de l’agence immobilière *</label>
                    <Input required value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Ex : Éburnie Prestige Immobilier" />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nom complet *</label>
                    <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kouamé Konan" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Téléphone CI *</label>
                    <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07..." />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Ville principale</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Abidjan" />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1">Adresse email *</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ci" />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Mot de passe *</label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <Button type="submit" variant="default" className="w-full h-11" disabled={loading}>
              <KeyRound className="h-4 w-4" />
              {loading ? 'Authentification...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </Button>
          </form>
        </div>

        {/* Supabase Live Connection Diagnostic & Demo Switcher */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                État de la connexion Supabase
              </h2>
              <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testingConn}>
                <RefreshCw className={`h-3.5 w-3.5 ${testingConn ? 'animate-spin' : ''}`} />
                Tester
              </Button>
            </div>

            {connectionCheck ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Client configuré (.env)</span>
                  <span className="font-semibold">{connectionCheck.configured ? 'Oui' : 'Non'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Serveur Supabase joignable</span>
                  <span className="font-semibold">{connectionCheck.reachable ? 'Oui' : 'Non'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Auth opérationnelle</span>
                  <span className="font-semibold">{connectionCheck.authReady ? 'Oui' : 'Non'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Base PostgreSQL connectée</span>
                  <span className="font-semibold">
                    {connectionCheck.schemaReady
                      ? `Oui (${connectionCheck.propertiesCount} biens · ${connectionCheck.categoriesCount} catégories)`
                      : 'Migrations SQL requises'}
                  </span>
                </div>
                {connectionCheck.errorMessage && (
                  <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 text-amber-800 dark:text-amber-300">
                    {connectionCheck.errorMessage}
                  </p>
                )}
                <div className="pt-2">
                  <Link
                    to="/test-supabase"
                    className="text-xs font-semibold text-[#1B3B8C] dark:text-[#C89B3C] hover:underline"
                  >
                    Ouvrir la page de test complète (publication_plans & session) →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Vérification en cours...</p>
            )}
          </div>

          {(!isSupabaseConfigured || !connectionCheck?.schemaReady) && (
            <div className="rounded-xl border border-[#C89B3C]/40 bg-[#0B1633] p-6 text-white space-y-4">
              <div>
                <div className="text-xs font-semibold text-[#C89B3C]">Accès rapide — Aperçu démonstration</div>
                <p className="mt-1 text-xs text-slate-300">
                  Vous pouvez explorer chaque espace métier avec un profil de démonstration en attendant l’exécution des migrations SQL sur Supabase :
                </p>
              </div>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => { store.loginDemoRole('individual'); routeByRole('individual'); }}
                  className="w-full flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-left hover:bg-white/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <User className="h-4 w-4 text-[#C89B3C]" />
                    Espace Particulier
                  </span>
                  <span className="text-xs text-[#C89B3C]">Ouvrir</span>
                </button>

                <button
                  type="button"
                  onClick={() => { store.loginDemoRole('agency'); routeByRole('agency'); }}
                  className="w-full flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-left hover:bg-white/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <Building2 className="h-4 w-4 text-[#C89B3C]" />
                    Espace Agence Immobilière
                  </span>
                  <span className="text-xs text-[#C89B3C]">Ouvrir</span>
                </button>

                <button
                  type="button"
                  onClick={() => { store.loginDemoRole('super_admin'); routeByRole('super_admin'); }}
                  className="w-full flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-left hover:bg-white/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-[#C89B3C]" />
                    Espace Administrateur
                  </span>
                  <span className="text-xs text-[#C89B3C]">Ouvrir</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};
