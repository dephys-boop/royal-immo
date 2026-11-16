import React from 'react';
import { Link } from 'react-router-dom';
import { Bath, BedDouble, Heart, MapPin, Maximize2, ShieldCheck } from 'lucide-react';
import type { Property } from '../../types/database';
import { featuredBadgeLabel, formatFCFA, transactionLabel } from '../../utils/format';
import { PropertyImage } from '../brand/PropertyImage';
import { cn } from '../../utils/cn';

interface PropertyCardProps {
  property: Property;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  layout?: 'grid' | 'list';
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isFavorite = false,
  onToggleFavorite,
  layout = 'grid',
}) => {
  const coverUrl = property.images[0]?.public_url;
  const badge = featuredBadgeLabel(property.featured_badge);

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#0E172E]',
        layout === 'list' ? 'flex flex-col md:flex-row' : 'flex flex-col'
      )}
    >
      <Link
        to={`/biens/${property.slug}`}
        className={cn(
          'relative block overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0',
          layout === 'list' ? 'w-full md:w-80 aspect-[4/3]' : 'w-full aspect-[4/3]'
        )}
      >
        <PropertyImage
          src={coverUrl}
          alt={property.title}
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {badge && (
          <div className="absolute top-3 left-3 bg-[#0B1633]/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#C89B3C] rounded-md">
            {badge}
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-12 flex items-center gap-1.5 text-xs font-medium text-white/95">
          <MapPin className="h-3.5 w-3.5 text-[#C89B3C] shrink-0" />
          <span className="truncate">
            {property.quartier}, {property.commune} · {property.city}
          </span>
        </div>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-slate-700 transition-colors hover:bg-white dark:bg-[#0B1633]/90 dark:text-slate-200 cursor-pointer"
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')} />
          </button>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Unboxed clean metadata with typographic separator */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-[#1B3B8C] dark:text-[#C89B3C]">
              {property.category_name} · {transactionLabel(property.transaction)}
            </span>
            <span className="font-mono-tabular">{property.reference}</span>
          </div>

          <Link to={`/biens/${property.slug}`} className="mt-2 block">
            <h3 className="text-base font-semibold leading-snug text-slate-900 group-hover:text-[#1B3B8C] dark:text-white dark:group-hover:text-[#C89B3C] line-clamp-2">
              {property.title}
            </h3>
          </Link>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-lg font-bold text-[#0B1633] dark:text-white">
              {formatFCFA(property.price_fcfa)}
            </span>
            {property.price_period === 'month' && (
              <span className="text-xs text-slate-500 dark:text-slate-400">/ mois</span>
            )}
            {property.price_period === 'day' && (
              <span className="text-xs text-slate-500 dark:text-slate-400">/ nuit</span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-4 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
              {property.surface_m2} m²
            </span>
            {property.bedrooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                {property.bedrooms} ch.
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bath className="h-3.5 w-3.5 text-slate-400" />
                {property.bathrooms} sdb
              </span>
            )}
          </div>

          {property.agency_verified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Vérifié
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
