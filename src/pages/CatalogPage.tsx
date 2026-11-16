import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, List, Map as MapIcon, RotateCcw, Search } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { usePlatform } from '../hooks/usePlatform';
import { PropertyCard } from '../components/property/PropertyCard';
import { IvoryCoastMap } from '../components/map/IvoryCoastMap';
import { Input, Select } from '../components/ui/input';
import { Button } from '../components/ui/button';
import type { PropertySearchFilters, TransactionType } from '../types/database';

const PAGE_SIZE = 6;

export const CatalogPage: React.FC = () => {
  const { categories, locations, favorites, isLoadingData, store } = usePlatform();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<PropertySearchFilters>({
    query: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    commune: searchParams.get('commune') || '',
    quartier: '',
    transaction: (searchParams.get('transaction') as '' | TransactionType) || '',
    category: searchParams.get('category') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    bedroomsMin: '',
    bathroomsMin: '',
    surfaceMin: '',
    surfaceMax: '',
    hasGarage: false,
    hasPool: false,
    hasGarden: false,
    furnishedOnly: false,
    sort: (searchParams.get('sort') as PropertySearchFilters['sort']) || 'relevance',
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      query: searchParams.get('q') ?? '',
      city: searchParams.get('city') ?? '',
      commune: searchParams.get('commune') ?? '',
      transaction: (searchParams.get('transaction') as '' | TransactionType) ?? '',
      category: searchParams.get('category') ?? '',
      priceMin: searchParams.get('priceMin') ?? '',
      priceMax: searchParams.get('priceMax') ?? '',
      sort: (searchParams.get('sort') as PropertySearchFilters['sort']) || prev.sort,
    }));
    setPage(1);
  }, [searchParams]);

  const cities = useMemo(() => Array.from(new Set(locations.map((l) => l.city))), [locations]);
  const communes = useMemo(
    () =>
      Array.from(
        new Set(
          locations
            .filter((l) => (!filters.city || l.city === filters.city) && l.commune)
            .map((l) => l.commune!)
        )
      ),
    [locations, filters.city]
  );
  const quartiers = useMemo(
    () =>
      Array.from(
        new Set(
          locations
            .filter(
              (l) =>
                (!filters.city || l.city === filters.city) &&
                (!filters.commune || l.commune === filters.commune) &&
                l.quartier
            )
            .map((l) => l.quartier!)
        )
      ),
    [locations, filters.city, filters.commune]
  );

  // Instant suggestions based on query
  const suggestions = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    if (q.length < 2) return [];
    const matches = new Set<string>();
    locations.forEach((l) => {
      if (l.quartier && l.quartier.toLowerCase().includes(q)) matches.add(l.quartier);
      if (l.commune && l.commune.toLowerCase().includes(q)) matches.add(l.commune);
      if (l.city.toLowerCase().includes(q)) matches.add(l.city);
    });
    return Array.from(matches).slice(0, 5);
  }, [filters.query, locations]);

  const results = store.filterProperties(filters);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const paginated = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setFilters({
      query: '',
      city: '',
      commune: '',
      quartier: '',
      transaction: '',
      category: '',
      priceMin: '',
      priceMax: '',
      bedroomsMin: '',
      bathroomsMin: '',
      surfaceMin: '',
      surfaceMax: '',
      hasGarage: false,
      hasPool: false,
      hasGarden: false,
      furnishedOnly: false,
      sort: 'relevance',
    });
    setPage(1);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-[#1B3B8C] dark:text-[#C89B3C]">Catalogue Immobilier Côte d’Ivoire</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Recherche immobilière avancée
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value as PropertySearchFilters['sort'] })}
              className="w-48"
              aria-label="Trier les résultats"
            >
              <option value="relevance">Trier par pertinence</option>
              <option value="newest">Plus récentes</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </Select>

            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Vue grille"
                className={`p-2 rounded-md cursor-pointer ${viewMode === 'grid' ? 'bg-[#1B3B8C] text-white' : 'text-slate-500'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="Vue liste"
                className={`p-2 rounded-md cursor-pointer ${viewMode === 'list' ? 'bg-[#1B3B8C] text-white' : 'text-slate-500'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                aria-label="Vue carte"
                className={`p-2 rounded-md cursor-pointer ${viewMode === 'map' ? 'bg-[#1B3B8C] text-white' : 'text-slate-500'}`}
              >
                <MapIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Filters */}
          <aside className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-[#0E172E]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Filtres combinables</h2>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#1B3B8C] dark:hover:text-[#C89B3C] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Recherche instantanée
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  value={filters.query}
                  onChange={(e) => {
                    setFilters({ ...filters, query: e.target.value });
                    setPage(1);
                  }}
                  placeholder="Titre, quartier, réf..."
                  className="pl-9"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="mt-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-md dark:border-slate-700 dark:bg-slate-900">
                  {suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFilters({ ...filters, query: sug })}
                      className="block w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Transaction</label>
              <Select
                value={filters.transaction}
                onChange={(e) => {
                  setFilters({ ...filters, transaction: e.target.value as '' | TransactionType });
                  setPage(1);
                }}
              >
                <option value="">Toutes transactions</option>
                <option value="sale">Vente</option>
                <option value="rent">Location</option>
                <option value="seasonal">Résidence meublée</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Type de bien</label>
              <Select
                value={filters.category}
                onChange={(e) => {
                  setFilters({ ...filters, category: e.target.value });
                  setPage(1);
                }}
              >
                <option value="">Tous les types</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Ville</label>
              <Select
                value={filters.city}
                onChange={(e) => {
                  setFilters({ ...filters, city: e.target.value, commune: '', quartier: '' });
                  setPage(1);
                }}
              >
                <option value="">Toute la Côte d’Ivoire</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Commune</label>
              <Select
                value={filters.commune}
                onChange={(e) => {
                  setFilters({ ...filters, commune: e.target.value, quartier: '' });
                  setPage(1);
                }}
              >
                <option value="">Toutes communes</option>
                {communes.map((com) => (
                  <option key={com} value={com}>
                    {com}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Quartier</label>
              <Select
                value={filters.quartier}
                onChange={(e) => {
                  setFilters({ ...filters, quartier: e.target.value });
                  setPage(1);
                }}
              >
                <option value="">Tous quartiers</option>
                {quartiers.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Prix min</label>
                <Input
                  type="number"
                  placeholder="FCFA"
                  value={filters.priceMin}
                  onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Prix max</label>
                <Input
                  type="number"
                  placeholder="FCFA"
                  value={filters.priceMax}
                  onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Chambres min</label>
                <Input
                  type="number"
                  min={0}
                  value={filters.bedroomsMin}
                  onChange={(e) => setFilters({ ...filters, bedroomsMin: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">SDB min</label>
                <Input
                  type="number"
                  min={0}
                  value={filters.bathroomsMin}
                  onChange={(e) => setFilters({ ...filters, bathroomsMin: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Surface min (m²)</label>
                <Input
                  type="number"
                  min={0}
                  value={filters.surfaceMin}
                  onChange={(e) => setFilters({ ...filters, surfaceMin: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Surface max (m²)</label>
                <Input
                  type="number"
                  min={0}
                  value={filters.surfaceMax}
                  onChange={(e) => setFilters({ ...filters, surfaceMax: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {(
                [
                  { key: 'hasGarage', label: 'Avec garage' },
                  { key: 'hasPool', label: 'Avec piscine' },
                  { key: 'hasGarden', label: 'Avec jardin' },
                  { key: 'furnishedOnly', label: 'Meublé uniquement' },
                ] as const
              ).map((opt) => (
                <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters[opt.key]}
                    onChange={(e) => setFilters({ ...filters, [opt.key]: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#1B3B8C]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </aside>

          {/* Results Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {isLoadingData ? (
                <span>Chargement des annonces depuis Supabase...</span>
              ) : (
                <>
                  <strong className="font-mono-tabular text-slate-900 dark:text-white">{results.length}</strong> bien(s)
                  correspondant à vos critères
                </>
              )}
            </div>

            {isLoadingData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="h-80 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0E172E] animate-pulse"
                  />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#0E172E]">
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  Aucun bien trouvé pour ces critères.
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Aucune annonce publiée ne correspond actuellement à cette recherche.
                </p>
                <Button variant="outline" className="mt-5" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : viewMode === 'map' ? (
              <IvoryCoastMap properties={results} />
            ) : (
              <>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-5'}>
                  {paginated.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      layout={viewMode}
                      isFavorite={favorites.includes(prop.id)}
                      onToggleFavorite={(id) => store.toggleFavorite(id)}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Précédent
                    </Button>
                    <span className="px-3 text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
