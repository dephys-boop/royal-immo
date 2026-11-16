import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, MapPin, MessageSquare, Phone, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { usePlatform } from '../hooks/usePlatform';
import { Button } from '../components/ui/button';

export const AgenciesPage: React.FC = () => {
  const { agencies } = usePlatform();

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-[#1B3B8C] dark:text-[#C89B3C]">Partenaires Agréés</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Agences immobilières en Côte d’Ivoire
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Professionnels disposant d’un espace dédié sécurisé pour leurs mandats, agents, visites, contrats et quittances en FCFA.
            </p>
          </div>
          <Link to="/connexion">
            <Button variant="gold">Créer un espace agence</Button>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agencies.map((ag) => (
            <article
              key={ag.id}
              className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  {ag.logo_url ? (
                    <img
                      src={ag.logo_url}
                      alt={ag.name}
                      className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-[#0B1633] text-[#C89B3C] flex items-center justify-center">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                  {ag.is_verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      Vérifiée
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{ag.name}</h2>
                {ag.rccm_number && (
                  <p className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">RCCM : {ag.rccm_number}</p>
                )}
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{ag.description}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[#C89B3C] shrink-0" />
                    <span>{ag.address}, {ag.city}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono-tabular">
                    <Phone className="h-3.5 w-3.5 text-[#C89B3C] shrink-0" />
                    <span>{ag.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-[#C89B3C] shrink-0" />
                    <span>{ag.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <a
                  href={`https://wa.me/${(ag.whatsapp || ag.phone).replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
                <Link
                  to={`/catalogue?city=${encodeURIComponent(ag.city)}`}
                  className="text-xs font-semibold text-[#1B3B8C] dark:text-[#C89B3C] hover:underline"
                >
                  Voir les annonces ({ag.listings_count || 0})
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
};
