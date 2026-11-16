import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bath,
  BedDouble,
  Calendar,
  Check,
  Flag,
  Heart,
  MapPin,
  Maximize2,
  MessageSquare,
  Phone,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { usePlatform } from '../hooks/usePlatform';
import { PropertyImage } from '../components/brand/PropertyImage';
import { PropertyCard } from '../components/property/PropertyCard';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Input, Select, Textarea } from '../components/ui/input';
import { featuredBadgeLabel, formatDateFR, formatFCFA, transactionLabel } from '../utils/format';

export const PropertyDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { properties, favorites, isLoadingData, store } = usePlatform();

  const property = properties.find((p) => p.slug === slug || p.id === slug) || properties[0];
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const [visitOpen, setVisitOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState('2026-11-22T10:00');
  const [visitMessage, setVisitMessage] = useState('');

  const [reportReason, setReportReason] = useState('Information erronée');
  const [reportDetails, setReportDetails] = useState('');

  const similar = useMemo(
    () =>
      property
        ? properties
            .filter((p) => p.id !== property.id && p.status === 'published' && (p.city === property.city || p.category_name === property.category_name))
            .slice(0, 3)
        : [],
    [properties, property]
  );

  if (!property) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 dark:border-slate-800 dark:bg-[#0E172E]">
            <h1 className="font-display text-2xl font-bold text-[#0B1633] dark:text-white">
              {isLoadingData ? 'Chargement du bien immobilier…' : 'Annonce introuvable'}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {isLoadingData
                ? 'Veuillez patienter pendant la récupération des données depuis Supabase.'
                : 'Ce bien n’est plus disponible ou aucune annonce publiée ne correspond à cette URL.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/catalogue">
                <Button variant="default">Voir le catalogue</Button>
              </Link>
              <Link to="/publier">
                <Button variant="gold">Publier une annonce</Button>
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const isFav = favorites.includes(property.id);
  const badge = featuredBadgeLabel(property.featured_badge);
  const activeImg = property.images[activeImageIdx]?.public_url || property.images[0]?.public_url;
  const whatsappClean = (property.owner_whatsapp || '+2250700000000').replace(/[^0-9]/g, '');

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.createVisitRequest({
      propertyId: property.id,
      visitorName,
      visitorPhone,
      visitorEmail,
      preferredDate,
      message: visitMessage,
    });
    setVisitOpen(false);
    setFeedback('Votre demande de visite a été transmise au vendeur/agence.');
    setVisitorName('');
    setVisitorPhone('');
    setVisitMessage('');
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.createReport(property.id, reportReason, reportDetails);
    setReportOpen(false);
    setFeedback('Signalement transmis à l’équipe de modération ROYAL IMMO.');
    setReportDetails('');
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: property.title, url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback('Lien de l’annonce copié dans le presse-papiers.');
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {feedback && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback(null)} className="text-xs font-semibold cursor-pointer">
              Fermer
            </button>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
          <Link to="/" className="hover:underline">Accueil</Link>
          <span>/</span>
          <Link to="/catalogue" className="hover:underline">Catalogue</Link>
          <span>/</span>
          <span>{property.city}</span>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">{property.reference}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Gallery + Description */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-3">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                <PropertyImage src={activeImg} alt={property.title} className="h-full w-full" />
                {badge && (
                  <div className="absolute top-4 left-4 rounded-md bg-[#0B1633]/90 px-3 py-1 text-xs font-semibold text-[#C89B3C]">
                    {badge}
                  </div>
                )}
              </div>

              {property.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {property.images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 cursor-pointer ${
                        idx === activeImageIdx ? 'border-[#1B3B8C] dark:border-[#C89B3C]' : 'border-transparent opacity-70'
                      }`}
                    >
                      <PropertyImage src={img.public_url} alt={`${property.title} ${idx + 1}`} className="h-full w-full" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Header & Specs */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#0E172E]">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-[#1B3B8C] dark:text-[#C89B3C]">
                  {property.category_name} · {transactionLabel(property.transaction)}
                </span>
                <span>·</span>
                <span>Réf. {property.reference}</span>
                <span>·</span>
                <span>Disponibilité : {formatDateFR(property.availability_date)}</span>
              </div>

              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                {property.title}
              </h1>

              <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                <MapPin className="h-4 w-4 text-[#C89B3C]" />
                {property.quartier}, {property.commune} · {property.city}
                {property.public_address_hint && ` (${property.public_address_hint})`}
              </p>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-y border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Surface</div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono-tabular text-base font-bold">
                    <Maximize2 className="h-4 w-4 text-[#C89B3C]" />
                    {property.surface_m2} m²
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Chambres</div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono-tabular text-base font-bold">
                    <BedDouble className="h-4 w-4 text-[#C89B3C]" />
                    {property.bedrooms}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Salles de bain</div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono-tabular text-base font-bold">
                    <Bath className="h-4 w-4 text-[#C89B3C]" />
                    {property.bathrooms}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Standing</div>
                  <div className="mt-1 text-sm font-semibold">
                    {property.is_furnished ? 'Meublé' : 'Non meublé'}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Description détaillée</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                  {property.description}
                </p>
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Équipements & Caractéristiques</h2>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm">
                  {[
                    property.has_garage && 'Garage couvert',
                    property.has_pool && 'Piscine',
                    property.has_garden && 'Jardin privatif',
                    ...property.amenities,
                  ]
                    .filter(Boolean)
                    .map((item) => (
                      <div key={String(item)} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sticky Contact & Purchase Module */}
          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E] space-y-5">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Prix officiel</div>
                <div className="mt-1 font-mono-tabular text-2xl sm:text-3xl font-bold text-[#0B1633] dark:text-white">
                  {formatFCFA(property.price_fcfa)}
                  {property.price_period === 'month' && <span className="text-sm font-normal text-slate-500"> / mois</span>}
                  {property.price_period === 'day' && <span className="text-sm font-normal text-slate-500"> / nuit</span>}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">Publié par</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {property.agency_name || property.owner_name || 'Propriétaire vérifié'}
                  </span>
                  {property.agency_verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      Agréée
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <a
                  href={`tel:${property.owner_phone || '+2250700000000'}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1B3B8C] px-4 text-sm font-semibold text-white hover:bg-[#142D6B]"
                >
                  <Phone className="h-4 w-4" />
                  Appeler le vendeur
                </a>

                <a
                  href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(
                    `Bonjour, je vous contacte via ROYAL IMMO concernant le bien ${property.reference} (${property.title}).`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  Contacter sur WhatsApp
                </a>

                <Button variant="gold" className="h-11 w-full" onClick={() => setVisitOpen(true)}>
                  <Calendar className="h-4 w-4" />
                  Demander une visite
                </Button>

                <Button variant="outline" className="h-10 w-full" onClick={() => setMessageOpen(true)}>
                  Envoyer un message direct
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => store.toggleFavorite(property.id)}
                  className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-red-600 dark:text-slate-300 cursor-pointer"
                >
                  <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                  {isFav ? 'Enregistré' : 'Ajouter aux favoris'}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-[#1B3B8C] dark:text-slate-300 cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  Partager
                </button>

                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-red-600 cursor-pointer"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Signaler
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Similar Properties */}
        {similar.length > 0 && (
          <section className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Biens immobiliers similaires
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {similar.map((item) => (
                <PropertyCard
                  key={item.id}
                  property={item}
                  isFavorite={favorites.includes(item.id)}
                  onToggleFavorite={(id) => store.toggleFavorite(id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Modal Demande de visite */}
        <Dialog open={visitOpen} onClose={() => setVisitOpen(false)} title="Demander une visite">
          <form onSubmit={handleVisitSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Nom complet</label>
              <Input required value={visitorName} onChange={(e) => setVisitorName(e.target.value)} placeholder="Ex : Kouassi Franck" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Téléphone / WhatsApp</label>
                <Input required value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} placeholder="+225 07..." />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Email</label>
                <Input type="email" value={visitorEmail} onChange={(e) => setVisitorEmail(e.target.value)} placeholder="nom@exemple.ci" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Date et heure souhaitées</label>
              <Input type="datetime-local" required value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Précisions</label>
              <Textarea value={visitMessage} onChange={(e) => setVisitMessage(e.target.value)} placeholder="Disponibilités ou questions..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setVisitOpen(false)}>Annuler</Button>
              <Button type="submit" variant="default">Confirmer la demande</Button>
            </div>
          </form>
        </Dialog>

        {/* Modal Message Direct */}
        <Dialog open={messageOpen} onClose={() => setMessageOpen(false)} title="Envoyer un message">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await store.createVisitRequest({
                propertyId: property.id,
                visitorName: visitorName || 'Contact ROYAL IMMO',
                visitorPhone: visitorPhone || '+225 07 00 00 00 00',
                visitorEmail,
                preferredDate: new Date().toISOString(),
                message: visitMessage,
              });
              setMessageOpen(false);
              setFeedback('Message envoyé avec succès au propriétaire/agence.');
            }}
            className="space-y-4"
          >
            <Input required value={visitorName} onChange={(e) => setVisitorName(e.target.value)} placeholder="Votre nom" />
            <Input required value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} placeholder="Votre téléphone" />
            <Textarea required value={visitMessage} onChange={(e) => setVisitMessage(e.target.value)} placeholder="Votre message concernant ce bien..." />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMessageOpen(false)}>Annuler</Button>
              <Button type="submit" variant="default">Envoyer</Button>
            </div>
          </form>
        </Dialog>

        {/* Modal Signalement */}
        <Dialog open={reportOpen} onClose={() => setReportOpen(false)} title="Signaler cette annonce">
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Motif du signalement</label>
              <Select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                <option value="Information erronée">Information ou prix erroné</option>
                <option value="Bien déjà vendu ou loué">Bien déjà vendu ou loué</option>
                <option value="Suspicion de fraude">Suspicion d’annonce frauduleuse</option>
                <option value="Autre">Autre motif</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Détails complémentaires</label>
              <Textarea required value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Expliquez brièvement le problème constaté..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>Annuler</Button>
              <Button type="submit" variant="destructive">Envoyer le signalement</Button>
            </div>
          </form>
        </Dialog>
      </div>
    </PublicLayout>
  );
};
