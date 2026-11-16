import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Building2,
  Home,
  Loader2,
  MapPin,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { usePlatform } from '../hooks/usePlatform';
import { PropertyCard } from '../components/property/PropertyCard';
import { Button } from '../components/ui/button';
import { HERO_VILLA_IMAGE } from '../data/demoData';
import { formatFCFA } from '../utils/format';

const PropertySkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0E172E] animate-pulse">
    <div className="aspect-[4/3] w-full bg-slate-200 dark:bg-slate-800" />
    <div className="p-5 space-y-3">
      <div className="flex justify-between gap-4">
        <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-6 w-36 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-4">
        <div className="h-3 w-14 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-14 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  </div>
);

const AgencySkeleton: React.FC = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E] animate-pulse space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-11 w-11 rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
    <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
    <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
    <div className="h-12 w-full rounded bg-slate-200 dark:bg-slate-800" />
  </div>
);

export const HomePage: React.FC = () => {
  const {
    properties,
    categories,
    agencies,
    plans,
    locations,
    favorites,
    isLoadingData,
    dataError,
    store,
  } = usePlatform();
  const navigate = useNavigate();

  const [tx, setTx] = useState<'sale' | 'rent'>('sale');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Strictement uniquement les biens réellement publiés et non démonstratifs
  const published = useMemo(
    () => properties.filter((p) => p.status === 'published' && !p.is_demo),
    [properties]
  );

  const recentListings = useMemo(
    () =>
      [...published]
        .sort(
          (a, b) =>
            new Date(b.published_at || b.created_at).getTime() -
            new Date(a.published_at || a.created_at).getTime()
        )
        .slice(0, 6),
    [published]
  );

  const featuredListings = useMemo(
    () => published.filter((p) => p.is_featured).slice(0, 6),
    [published]
  );

  const activeAgencies = useMemo(
    () => agencies.filter((a) => a.is_active !== false).slice(0, 6),
    [agencies]
  );

  const cities = useMemo(
    () => Array.from(new Set(locations.map((l) => l.city))).sort((a, b) => a.localeCompare(b)),
    [locations]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (tx) params.set('transaction', tx);
    if (category) params.set('category', category);
    if (city) params.set('city', city);
    if (priceMin.trim()) params.set('priceMin', priceMin.trim());
    if (priceMax.trim()) params.set('priceMax', priceMax.trim());
    navigate(`/catalogue?${params.toString()}`);
  };

  return (
    <PublicLayout>
      {/* 1. GRANDE BANNIÈRE D'ACCUEIL + BARRE DE RECHERCHE */}
      <section className="relative overflow-hidden bg-[#0B1633] text-white">
        <img
          src={HERO_VILLA_IMAGE}
          alt="Villa contemporaine à Cocody Abidjan — ROYAL IMMO Côte d'Ivoire"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070D1D]/95 via-[#0B1633]/75 to-[#0B1633]/45" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-24">
          <div className="max-w-3xl">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-[#C89B3C]">
              ROYAL IMMO · L’immobilier en toute confiance
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.1] tracking-tight text-balance">
              Achetez, louez ou publiez votre bien immobilier en Côte d’Ivoire
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
              Villas à Cocody, appartements à Marcory, bureaux au Plateau, terrains à Bingerville ou résidences à Grand-Bassam et Assinie.
            </p>
          </div>

          {/* Barre de recherche : Transaction (Vente/Location), Type de bien, Ville, Budget min & max */}
          <form
            onSubmit={handleSearch}
            className="mt-9 rounded-xl border border-white/15 bg-white p-4 sm:p-6 text-slate-900 shadow-2xl dark:bg-[#0E172E] dark:border-slate-700 dark:text-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setTx('sale')}
                  className={`rounded-md px-5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    tx === 'sale'
                      ? 'bg-[#1B3B8C] text-white dark:bg-[#C89B3C] dark:text-[#0B1633]'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Vente
                </button>
                <button
                  type="button"
                  onClick={() => setTx('rent')}
                  className={`rounded-md px-5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    tx === 'rent'
                      ? 'bg-[#1B3B8C] text-white dark:bg-[#C89B3C] dark:text-[#0B1633]'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Location
                </button>
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400">
                Recherche en temps réel sur les biens publiés en FCFA
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label
                  htmlFor="search-category"
                  className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Type de bien
                </label>
                <select
                  id="search-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3B8C] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Tous les types</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="search-city"
                  className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Ville
                </label>
                <select
                  id="search-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3B8C] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Toutes les villes</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="search-price-min"
                  className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Budget min (FCFA)
                </label>
                <input
                  id="search-price-min"
                  type="number"
                  min={0}
                  step={50000}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Ex : 250 000"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3B8C] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="search-price-max"
                  className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Budget max (FCFA)
                </label>
                <input
                  id="search-price-max"
                  type="number"
                  min={0}
                  step={50000}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Ex : 150 000 000"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3B8C] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" variant="gold" className="h-11 w-full font-semibold">
                  <Search className="h-4 w-4" />
                  Rechercher
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Alerte d'erreur de chargement Supabase si présente */}
      {dataError && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Impossible de charger certaines données depuis Supabase</p>
                <p className="text-xs opacity-90 mt-0.5">{dataError}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void store.syncFromSupabase()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* 2. SECTION DES ANNONCES RÉCENTES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1B3B8C] dark:text-[#C89B3C]">
              Publications récentes
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Annonces récentes
            </h2>
          </div>

          <Link
            to="/catalogue?sort=newest"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B3B8C] hover:underline dark:text-[#C89B3C]"
          >
            Voir tout le catalogue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoadingData ? (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-[#1B3B8C] dark:text-[#C89B3C]" />
              <span>Chargement des annonces publiées depuis Supabase...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PropertySkeleton />
              <PropertySkeleton />
              <PropertySkeleton />
            </div>
          </div>
        ) : recentListings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 sm:p-12 text-center dark:border-slate-800 dark:bg-[#0E172E]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#1B3B8C] dark:bg-slate-800 dark:text-[#C89B3C]">
              <Home className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              Aucune annonce immobilière publiée pour le moment
            </h3>
            <p className="mt-2 mx-auto max-w-lg text-sm text-slate-600 dark:text-slate-300">
              Aucune annonce active n’est actuellement disponible dans la base publique. Dès qu’un bien est validé et publié sur ROYAL IMMO, il apparaît automatiquement ici.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/publier">
                <Button variant="default">
                  <PlusCircle className="h-4 w-4" />
                  Publier une annonce
                </Button>
              </Link>
              <Link to="/catalogue">
                <Button variant="outline">Explorer le catalogue</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentListings.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                isFavorite={favorites.includes(prop.id)}
                onToggleFavorite={(id) => void store.toggleFavorite(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. SECTION DES BIENS IMMOBILIERS EN VEDETTE */}
      <section className="bg-white border-y border-slate-200 dark:bg-[#0B1633]/60 dark:border-slate-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1B3B8C] dark:text-[#C89B3C]">
                Sélection mise en avant
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Biens immobiliers en vedette
              </h2>
            </div>

            <Link
              to="/catalogue"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B3B8C] hover:underline dark:text-[#C89B3C]"
            >
              Tous les biens disponibles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoadingData ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PropertySkeleton />
              <PropertySkeleton />
              <PropertySkeleton />
            </div>
          ) : featuredListings.length === 0 ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-10 text-center dark:border-slate-800 dark:bg-[#0E172E]">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#C89B3C] border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                Aucun bien en vedette pour le moment
              </h3>
              <p className="mt-1.5 mx-auto max-w-md text-sm text-slate-600 dark:text-slate-300">
                Les biens mis en avant par les agences et propriétaires apparaîtront dans cette vitrine dès leur mise en vedette.
              </p>
              <div className="mt-5">
                <Link to="/publier">
                  <Button variant="gold" size="sm">
                    Mettre un bien en ligne
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredListings.map((prop) => (
                <PropertyCard
                  key={prop.id}
                  property={prop}
                  isFavorite={favorites.includes(prop.id)}
                  onToggleFavorite={(id) => void store.toggleFavorite(id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. SECTION DES AGENCES IMMOBILIÈRES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1B3B8C] dark:text-[#C89B3C]">
              Réseau professionnel
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Agences immobilières
            </h2>
          </div>

          <Link
            to="/agences"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B3B8C] hover:underline dark:text-[#C89B3C]"
          >
            Voir toutes les agences
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoadingData ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AgencySkeleton />
            <AgencySkeleton />
            <AgencySkeleton />
          </div>
        ) : activeAgencies.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#0E172E]">
            <Building2 className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              Aucune agence immobilière enregistrée pour le moment
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              Vous dirigez une agence immobilière en Côte d’Ivoire ? Créez votre espace professionnel vérifié.
            </p>
            <div className="mt-5">
              <Link to="/connexion?mode=register">
                <Button variant="outline" size="sm">
                  Créer un compte agence
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeAgencies.map((agency) => (
              <div
                key={agency.id}
                className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E] flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    {agency.logo_url ? (
                      <img
                        src={agency.logo_url}
                        alt={agency.name}
                        className="h-11 w-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0B1633] text-[#C89B3C]">
                        <Building2 className="h-5 w-5" />
                      </div>
                    )}

                    {agency.is_verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="h-4 w-4" />
                        Agence vérifiée
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                    {agency.name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-[#C89B3C] shrink-0" />
                    <span>
                      {agency.commune ? `${agency.commune} · ` : ''}
                      {agency.city}
                    </span>
                  </p>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                    {agency.description || 'Agence immobilière active sur le marché ivoirien.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                    {agency.listings_count ?? 0} annonce(s) publiée(s)
                  </span>
                  <Link
                    to="/agences"
                    className="font-semibold text-[#1B3B8C] dark:text-[#C89B3C] hover:underline"
                  >
                    Voir la fiche →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. SECTION POURQUOI CHOISIR ROYAL IMMO */}
      <section className="bg-white border-t border-slate-200 dark:bg-[#0B1633]/60 dark:border-slate-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1B3B8C] dark:text-[#C89B3C]">
              Pourquoi choisir ROYAL IMMO
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              La référence de confiance pour l’immobilier en Côte d’Ivoire
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
              Conçue pour les acheteurs, locataires, particuliers et agences immobilières, la plateforme encadre chaque étape de la publication jusqu’à la prise de rendez-vous.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Annonces vérifiées',
                  desc: 'Contrôle administratif des informations et validation avant mise en ligne publique.',
                },
                {
                  icon: MapPin,
                  title: 'Confidentialité géographique',
                  desc: 'Affichage par ville, commune et quartier afin de protéger l’adresse exacte des biens.',
                },
                {
                  icon: Award,
                  title: 'Particuliers & Agences agréées',
                  desc: 'Espaces dédiés avec gestion des visites, favoris et suivi transparent des dossiers.',
                },
                {
                  icon: Wallet,
                  title: 'Tarifs clairs en FCFA',
                  desc: 'Publication à l’annonce sans abonnement forcé, payable par Mobile Money ou carte.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-[#0E172E]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B3B8C]/10 text-[#1B3B8C] dark:bg-[#C89B3C]/15 dark:text-[#C89B3C]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-[#0B1633] p-6 sm:p-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C89B3C]">
              Tarifs de publication
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-white">
              Publiez votre bien en toute transparence
            </h3>
            <p className="mt-1.5 text-xs text-slate-300">
              Formules officielles en FCFA · Orange Money, MTN MoMo, Moov Money, Wave et carte bancaire.
            </p>

            <div className="mt-6 divide-y divide-white/10">
              {plans.map((plan) => (
                <div key={plan.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {plan.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      Diffusion {plan.duration_days} jours
                    </div>
                  </div>
                  <div className="font-mono-tabular text-base font-bold text-[#C89B3C] shrink-0">
                    {formatFCFA(plan.price_fcfa)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row lg:flex-col gap-2.5">
              <Link to="/publier" className="w-full">
                <Button variant="gold" className="w-full">
                  <PlusCircle className="h-4 w-4" />
                  Publier une annonce
                </Button>
              </Link>
              <Link to="/connexion?mode=register" className="w-full">
                <Button
                  variant="outline"
                  className="w-full border-white/25 bg-transparent text-white hover:bg-white/10"
                >
                  Créer un compte gratuit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
