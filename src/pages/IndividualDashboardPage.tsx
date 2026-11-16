import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  Building,
  Calendar,
  CheckCircle2,
  CreditCard,
  Heart,
  ImagePlus,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { DashboardLayout, type SidebarNavItem } from '../layouts/DashboardLayout';
import { usePlatform } from '../hooks/usePlatform';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog } from '../components/ui/dialog';
import { InvoiceModal } from '../components/brand/InvoiceModal';
import { PropertyCard } from '../components/property/PropertyCard';
import { PrivateDocumentsManager } from '../components/storage/PrivateDocumentsManager';
import { PropertyPhotosModal } from '../components/storage/PropertyPhotosModal';
import { formatDateFR, formatFCFA, paymentProviderLabel, paymentStatusLabel, propertyStatusLabel } from '../utils/format';
import type { PaymentRecord, Property } from '../types/database';

const NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: BarChart3 },
  { id: 'listings', label: 'Mes annonces', icon: Building },
  { id: 'documents', label: 'Documents privés', icon: Lock },
  { id: 'visits', label: 'Demandes de visite', icon: Calendar },
  { id: 'favorites', label: 'Mes favoris', icon: Heart },
  { id: 'payments', label: 'Historique paiements', icon: CreditCard },
  { id: 'profile', label: 'Mon profil', icon: User },
];

export const IndividualDashboardPage: React.FC = () => {
  const { currentUser, properties, favorites, payments, visits, plans, store } = usePlatform();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentRecord | null>(null);
  const [photosProp, setPhotosProp] = useState<Property | null>(null);
  const [renewPropId, setRenewPropId] = useState<string | null>(null);
  const [renewPlanId, setRenewPlanId] = useState(plans[2]?.id || 'plan-30');

  const userId = currentUser?.id || 'demo-user-individual';
  const myProperties = properties.filter((p) => p.owner_id === userId);
  const myPayments = payments.filter((p) => p.user_id === userId);
  const myVisits = visits.filter((v) => v.owner_id === userId);
  const myFavs = properties.filter((p) => favorites.includes(p.id));

  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [whatsapp, setWhatsapp] = useState(currentUser?.whatsapp || '');
  const [city, setCity] = useState(currentUser?.city || 'Abidjan');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileSaved, setProfileSaved] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setPhone(currentUser.phone || '');
      setWhatsapp(currentUser.whatsapp || '');
      setCity(currentUser.city || 'Abidjan');
    }
  }, [currentUser]);

  const totalViews = myProperties.reduce((acc, p) => acc + p.views_count, 0);

  return (
    <DashboardLayout
      title="Espace Particulier"
      subtitle="Gestion personnelle des biens & visites"
      items={NAV_ITEMS}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Mes annonces', value: myProperties.length },
              { label: 'Vues cumulées', value: totalViews },
              { label: 'Demandes de visite', value: myVisits.length },
              { label: 'Biens en favoris', value: myFavs.length },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0E172E]">
                <div className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</div>
                <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">Publier un nouveau bien immobilier</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Tarifs dès 1 000 FCFA pour 7 jours. Paiement Wave, Orange Money, MTN ou Moov.
              </p>
            </div>
            <Link to="/publier">
              <Button variant="gold">Déposer une annonce</Button>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#0E172E]">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold">Mes annonces publiées et en attente</h2>
            <Link to="/publier">
              <Button size="sm">Nouvelle annonce</Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Bien</th>
                  <th className="px-4 py-3 text-right">Prix</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-right">Vues</th>
                  <th className="px-4 py-3 text-left">Expiration</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myProperties.map((prop) => {
                  const st = propertyStatusLabel(prop.status);
                  return (
                    <tr key={prop.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-3">
                        <Link to={`/biens/${prop.slug}`} className="font-semibold hover:text-[#1B3B8C] dark:hover:text-[#C89B3C]">
                          {prop.title}
                        </Link>
                        <div className="text-xs text-slate-500">{prop.commune}, {prop.city}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular font-semibold">{formatFCFA(prop.price_fcfa)}</td>
                      <td className="px-4 py-3 text-xs font-medium">{st.label}</td>
                      <td className="px-4 py-3 text-right font-mono-tabular">{prop.views_count}</td>
                      <td className="px-4 py-3 text-xs font-mono-tabular">{formatDateFR(prop.expires_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPhotosProp(prop)}>
                            <ImagePlus className="h-3.5 w-3.5" />
                            Photos ({prop.images.length})
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRenewPropId(prop.id)}>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Renouveler
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => store.deleteProperty(prop.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'documents' && <PrivateDocumentsManager />}

      {activeTab === 'visits' && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-800 dark:bg-[#0E172E] dark:divide-slate-800">
          {myVisits.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">Aucune demande de visite reçue.</div>
          ) : (
            myVisits.map((v) => (
              <div key={v.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold">{v.visitor_name} · <span className="font-mono-tabular">{v.visitor_phone}</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">{v.property_title} · Souhait : {formatDateFR(v.preferred_date)}</div>
                  {v.message && <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">« {v.message} »</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold mr-2">Statut : {v.status}</span>
                  {v.status === 'pending' && (
                    <Button size="sm" onClick={() => store.updateVisitStatus(v.id, 'confirmed')}>Confirmer</Button>
                  )}
                  {v.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" onClick={() => store.updateVisitStatus(v.id, 'cancelled')}>Annuler</Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myFavs.map((prop) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              isFavorite
              onToggleFavorite={(id) => store.toggleFavorite(id)}
            />
          ))}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-[#0E172E]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Facture</th>
                <th className="px-4 py-3 text-left">Annonce</th>
                <th className="px-4 py-3 text-left">Moyen</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {myPayments.map((pay) => (
                <tr key={pay.id}>
                  <td className="px-4 py-3 font-mono-tabular font-semibold">{pay.invoice_number}</td>
                  <td className="px-4 py-3 text-xs">{pay.property_title}</td>
                  <td className="px-4 py-3 text-xs">{paymentProviderLabel(pay.provider)}</td>
                  <td className="px-4 py-3 text-right font-mono-tabular font-semibold">{formatFCFA(pay.amount_fcfa)}</td>
                  <td className="px-4 py-3 text-xs">{paymentStatusLabel(pay.status).label}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(pay)}>
                      Facture
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'profile' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingProfile(true);
            setProfileError(null);
            setProfileSaved(null);
            try {
              await store.updateProfile({ full_name: fullName, phone, whatsapp, city });
              setProfileSaved('Informations du profil enregistrées avec succès.');
            } catch (err) {
              setProfileError((err as Error).message);
            } finally {
              setSavingProfile(false);
            }
          }}
          className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-[#0E172E]"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold">Informations du profil</h2>
            <span className="text-[11px] font-mono-tabular text-slate-500">Bucket : avatars</span>
          </div>

          {profileError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{profileError}</span>
            </div>
          )}

          {profileSaved && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{profileSaved}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pb-2">
            <div className="h-16 w-16 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt={fullName || 'Avatar'} className="h-full w-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B3B8C] px-3 py-1.5 text-xs font-semibold text-[#1B3B8C] hover:bg-[#1B3B8C]/5 dark:border-[#C89B3C] dark:text-[#C89B3C] cursor-pointer">
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Téléversement...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Changer la photo
                    </>
                  )}
                  <input
                    type="file"
                    disabled={uploadingAvatar}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setUploadingAvatar(true);
                      setProfileError(null);
                      setProfileSaved(null);
                      try {
                        await store.uploadProfilePhoto(file);
                        setProfileSaved('Photo de profil mise à jour dans Supabase Storage (avatars).');
                      } catch (err) {
                        setProfileError((err as Error).message);
                      } finally {
                        setUploadingAvatar(false);
                      }
                    }}
                  />
                </label>

                {currentUser?.avatar_url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploadingAvatar}
                    onClick={async () => {
                      setUploadingAvatar(true);
                      setProfileError(null);
                      setProfileSaved(null);
                      try {
                        await store.removeProfilePhoto();
                        setProfileSaved('Photo de profil retirée.');
                      } catch (err) {
                        setProfileError((err as Error).message);
                      } finally {
                        setUploadingAvatar(false);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    Supprimer
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                JPEG, PNG ou WebP · max 5 Mo
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Nom complet</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Téléphone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">WhatsApp</label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Ville</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer les modifications
          </Button>
        </form>
      )}

      <PropertyPhotosModal property={photosProp} onClose={() => setPhotosProp(null)} />

      <InvoiceModal payment={selectedInvoice} onClose={() => setSelectedInvoice(null)} />

      <Dialog open={Boolean(renewPropId)} onClose={() => setRenewPropId(null)} title="Renouveler la publication">
        <div className="space-y-4">
          {plans.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => setRenewPlanId(pl.id)}
              className={`w-full rounded-lg border p-3.5 flex items-center justify-between text-sm cursor-pointer ${
                renewPlanId === pl.id ? 'border-[#1B3B8C] bg-[#1B3B8C]/5 dark:border-[#C89B3C]' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{pl.name} ({pl.duration_days} jours)</span>
              <span className="font-mono-tabular font-bold">{formatFCFA(pl.price_fcfa)}</span>
            </button>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenewPropId(null)}>Annuler</Button>
            <Button
              onClick={() => {
                if (renewPropId) store.renewProperty(renewPropId, renewPlanId);
                setRenewPropId(null);
              }}
            >
              Confirmer le renouvellement
            </Button>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
};
