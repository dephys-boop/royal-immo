import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import type { Property } from '../../types/database';
import { formatFCFA, transactionLabel } from '../../utils/format';

interface IvoryCoastMapProps {
  properties: Property[];
}

// Bounding box roughly covering Southern & Central Côte d'Ivoire (San Pedro to Bouaké, Assinie to Yopougon)
const MIN_LAT = 4.6;
const MAX_LAT = 8.0;
const MIN_LNG = -6.9;
const MAX_LNG = -3.0;

export const IvoryCoastMap: React.FC<IvoryCoastMapProps> = ({ properties }) => {
  const [selected, setSelected] = useState<Property | null>(properties[0] || null);
  const [focusAbidjan, setFocusAbidjan] = useState(true);

  const bounds = focusAbidjan
    ? { minLat: 5.10, maxLat: 5.44, minLng: -4.15, maxLng: -3.25 }
    : { minLat: MIN_LAT, maxLat: MAX_LAT, minLng: MIN_LNG, maxLng: MAX_LNG };

  const project = (lat: number | null, lng: number | null) => {
    const safeLat = lat ?? 5.34;
    const safeLng = lng ?? -4.0;
    const x = ((safeLng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = (1 - (safeLat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return {
      x: Math.max(6, Math.min(94, x)),
      y: Math.max(8, Math.min(92, y)),
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0E172E]">
      <div className="lg:col-span-2 relative min-h-[420px] rounded-xl overflow-hidden border border-slate-200 bg-[#EEF3FB] dark:border-slate-700 dark:bg-[#091229]">
        {/* Top map controls */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-white/95 p-1 border border-slate-200 shadow-xs dark:bg-[#0B1633]/95 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setFocusAbidjan(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              focusAbidjan
                ? 'bg-[#1B3B8C] text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            Grand Abidjan & Littoral
          </button>
          <button
            type="button"
            onClick={() => setFocusAbidjan(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              !focusAbidjan
                ? 'bg-[#1B3B8C] text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            Côte d’Ivoire entière
          </button>
        </div>

        <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-slate-600 dark:bg-[#0B1633]/90 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Localisation par zone : l’adresse exacte des propriétaires reste protégée jusqu’au rendez-vous.
        </div>

        {/* Cartographic Grid & Lagoon Geometry */}
        <svg viewBox="0 0 800 480" className="h-full w-full" aria-label="Carte géolocalisée des biens en Côte d'Ivoire">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="800" height="480" fill="url(#grid)" className="text-slate-900 dark:text-white" />
          {/* Ébrié Lagoon / Atlantic coast decorative cartographic contour */}
          {focusAbidjan && (
            <path
              d="M 0 320 Q 190 290, 340 315 T 620 340 T 800 360 L 800 480 L 0 480 Z"
              fill="#1B3B8C"
              fillOpacity="0.10"
            />
          )}
          <text x="580" y="430" className="fill-slate-400 dark:fill-slate-600 text-[12px] font-medium">
            {focusAbidjan ? 'Lagune Ébrié & Océan Atlantique' : 'République de Côte d’Ivoire'}
          </text>
        </svg>

        {/* Interactive Pins */}
        {properties.map((prop) => {
          const pos = project(prop.latitude, prop.longitude);
          const isSelected = selected?.id === prop.id;
          return (
            <button
              key={prop.id}
              type="button"
              onClick={() => setSelected(prop)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-mono-tabular font-semibold shadow-md transition-transform cursor-pointer ${
                isSelected
                  ? 'z-20 scale-110 bg-[#C89B3C] text-[#0B1633] ring-2 ring-white'
                  : 'z-10 bg-[#0B1633] text-white hover:bg-[#1B3B8C]'
              }`}
            >
              {prop.price_fcfa >= 1000000
                ? `${(prop.price_fcfa / 1000000).toFixed(1)}M`
                : `${Math.round(prop.price_fcfa / 1000)}k`}
            </button>
          );
        })}
      </div>

      {/* Selected Property Preview Drawer */}
      <div className="flex flex-col justify-between">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{selected.category_name} · {transactionLabel(selected.transaction)}</span>
              <span className="font-mono-tabular">{selected.reference}</span>
            </div>
            <img
              src={selected.images[0]?.public_url}
              alt={selected.title}
              referrerPolicy="no-referrer"
              className="w-full aspect-[4/3] rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
            />
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                {selected.title}
              </h4>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-[#C89B3C]" />
                {selected.quartier}, {selected.commune} · {selected.city}
              </p>
              <p className="mt-3 font-mono-tabular text-xl font-bold text-[#1B3B8C] dark:text-[#C89B3C]">
                {formatFCFA(selected.price_fcfa)}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                {selected.description}
              </p>
            </div>
            <Link
              to={`/biens/${selected.slug}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1B3B8C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#142D6B]"
            >
              <Navigation className="h-4 w-4" />
              Consulter la fiche complète
            </Link>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Sélectionnez un marqueur sur la carte pour afficher le bien.
          </div>
        )}
      </div>
    </div>
  );
};
