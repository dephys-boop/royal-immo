import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  Lock,
  Receipt,
  Settings,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { DashboardLayout, type SidebarNavItem } from '../layouts/DashboardLayout';
import { usePlatform } from '../hooks/usePlatform';
import { Button } from '../components/ui/button';
import { Input, Select } from '../components/ui/input';
import { Dialog } from '../components/ui/dialog';
import { PrivateDocumentsManager } from '../components/storage/PrivateDocumentsManager';
import { PropertyPhotosModal } from '../components/storage/PropertyPhotosModal';
import { formatDateFR, formatFCFA, propertyStatusLabel } from '../utils/format';
import type { Agency, Property } from '../types/database';

const NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: BarChart3 },
  { id: 'listings', label: 'Annonces agence', icon: Building2 },
  { id: 'documents', label: 'Documents privés', icon: Lock },
  { id: 'agents', label: 'Agents & Équipe', icon: Users },
  { id: 'visits', label: 'Visites & Clients', icon: Calendar },
  { id: 'contracts', label: 'Contrats & Baux', icon: FileText },
  { id: 'rents', label: 'Loyers & Factures', icon: Receipt },
  { id: 'settings', label: 'Profil agence', icon: Settings },
];

export const AgencyDashboardPage: React.FC = () => {
  const { currentUser, agencies, properties, agencyMembers, visits, contracts, rentalPayments, store } = usePlatform();
  const [activeTab, setActiveTab] = useState('overview');
  const [photosProp, setPhotosProp] = useState<Property | null>(null);

  const fallbackAgency: Agency = {
    id: '',
    owner_id: currentUser?.id || '',
    name: currentUser?.full_name ? `Agence — ${currentUser.full_name}` : 'Mon Agence Immobilière',
    slug: 'mon-agence',
    logo_url: null,
    description: null,
    address: currentUser?.city || 'Abidjan',
    city: currentUser?.city || 'Abidjan',
    commune: null,
    phone: currentUser?.phone || '',
    whatsapp: currentUser?.whatsapp || null,
    email: currentUser?.email || '',
    rccm_number: null,
    is_verified: false,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const myAgency =
    agencies.find((a) => currentUser && a.owner_id === currentUser.id) ||
    agencies[0] ||
    fallbackAgency;

  const agencyProps = properties.filter((p) =>
    myAgency.id ? p.agency_id === myAgency.id || (currentUser && p.owner_id === currentUser.id) : false
  );
  const agencyVisits = visits.filter((v) => (myAgency.id ? v.agency_id === myAgency.id : false));
  const agencyContracts = contracts.filter((c) => (myAgency.id ? c.agency_id === myAgency.id : false));
  const agencyRents = rentalPayments.filter((r) => (myAgency.id ? r.agency_id === myAgency.id : false));

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [agentModal, setAgentModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('+225 ');
  const [agentRole, setAgentRole] = useState<'senior_agent' | 'agent' | 'assistant'>('agent');

  const [contractModal, setContractModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+225 ');
  const [contractType, setContractType] = useState<'lease' | 'sale' | 'management'>('lease');
  const [contractAmount, setContractAmount] = useState('650000');

  const collectedRent = agencyRents.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount_fcfa, 0);

  return (
    <DashboardLayout
      title="Espace Agence Immobilière"
      subtitle={`${myAgency.name} · Données strictement isolées (RLS)`}
      items={NAV_ITEMS}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Biens gérés', value: agencyProps.length },
              { label: 'Agents actifs', value: agencyMembers.length },
              { label: 'Contrats en cours', value: agencyContracts.length },
              { label: 'Loyers encaissés', value: formatFCFA(collectedRent) },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0E172E]">
                <div className="text-xs text-slate-500 dark:text-slate-400">{k.label}</div>
                <div className="mt-2 font-mono-tabular text-xl font-bold text-slate-900 dark:text-white">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E]">
            <h2 className="text-base font-bold">Journal d’activité récent de l’agence</h2>
            <ul className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li>• Quittance générée pour Olivier Aka (Novembre 2026 — 1 450 000 FCFA)</li>
              <li>• Visite confirmée avec Serge Koffi pour Villa Cocody Ambassades</li>
              <li>• Isolation PostgreSQL active : aucune autre agence ne peut consulter ces dossiers</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-[#0E172E]">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold">Portefeuille d’annonces de {myAgency.name}</h2>
            <Link to="/publier"><Button size="sm">Publier pour l’agence</Button></Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Réf.</th>
                <th className="px-4 py-3 text-left">Bien</th>
                <th className="px-4 py-3 text-right">Prix FCFA</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Vues</th>
                <th className="px-4 py-3 text-right">Photos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {agencyProps.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono-tabular text-xs">{p.reference}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/biens/${p.slug}`} className="hover:underline">{p.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono-tabular font-semibold">{formatFCFA(p.price_fcfa)}</td>
                  <td className="px-4 py-3 text-xs">{propertyStatusLabel(p.status).label}</td>
                  <td className="px-4 py-3 text-right font-mono-tabular">{p.views_count}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setPhotosProp(p)}>
                      <ImagePlus className="h-3.5 w-3.5" />
                      Photos ({p.images.length})
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'documents' && <PrivateDocumentsManager />}

      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold">Équipe commerciale & agents immobiliers</h2>
            <Button size="sm" onClick={() => setAgentModal(true)}>Ajouter un agent</Button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-[#0E172E]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Téléphone</th>
                  <th className="px-4 py-3 text-left">Rôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agencyMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-semibold">{m.full_name}</td>
                    <td className="px-4 py-3 text-xs">{m.email}</td>
                    <td className="px-4 py-3 text-xs font-mono-tabular">{m.phone}</td>
                    <td className="px-4 py-3 text-xs">{m.member_role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-800 dark:bg-[#0E172E] dark:divide-slate-800">
          {agencyVisits.map((v) => (
            <div key={v.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold">{v.visitor_name} · {v.visitor_phone}</div>
                <div className="text-xs text-slate-500">{v.property_title} · {formatDateFR(v.preferred_date)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold mr-2">{v.status}</span>
                {v.status === 'pending' && (
                  <Button size="sm" onClick={() => store.updateVisitStatus(v.id, 'confirmed')}>Confirmer</Button>
                )}
                {v.status === 'confirmed' && (
                  <Button size="sm" variant="outline" onClick={() => store.updateVisitStatus(v.id, 'completed')}>Marquer effectuée</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold">Contrats de bail, vente et gestion</h2>
            <Button size="sm" onClick={() => setContractModal(true)}>Nouveau contrat</Button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-[#0E172E]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Bien</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Montant FCFA</th>
                  <th className="px-4 py-3 text-left">Début</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agencyContracts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-semibold">{c.client_name}</td>
                    <td className="px-4 py-3 text-xs">{c.property_title || 'Bien géré'}</td>
                    <td className="px-4 py-3 text-xs">{c.contract_type}</td>
                    <td className="px-4 py-3 text-right font-mono-tabular font-semibold">{formatFCFA(c.amount_fcfa)}</td>
                    <td className="px-4 py-3 text-xs font-mono-tabular">{formatDateFR(c.start_date)}</td>
                    <td className="px-4 py-3 text-xs">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rents' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-[#0E172E]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Locataire</th>
                <th className="px-4 py-3 text-left">Période</th>
                <th className="px-4 py-3 text-right">Loyer</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Quittance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {agencyRents.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold">{r.client_name}</td>
                  <td className="px-4 py-3 text-xs">{r.period_label}</td>
                  <td className="px-4 py-3 text-right font-mono-tabular font-semibold">{formatFCFA(r.amount_fcfa)}</td>
                  <td className="px-4 py-3 text-xs">{r.status === 'paid' ? 'Payé' : 'À encaisser'}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono-tabular text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {r.receipt_number}
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => store.markRentalPaid(r.id)}>Encaisser & Quittancer</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-800 dark:bg-[#0E172E]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold">Profil officiel de l’agence</h2>
            <span className="text-[11px] font-mono-tabular text-slate-500">Bucket : agency-logos</span>
          </div>

          {logoError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{logoError}</span>
            </div>
          )}

          {logoSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{logoSuccess}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            {myAgency.logo_url ? (
              <img
                src={myAgency.logo_url}
                alt={myAgency.name}
                className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-[#0B1633] text-[#C89B3C] flex items-center justify-center shrink-0">
                <Building2 className="h-7 w-7" />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3B8C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#142D6B] dark:bg-[#C89B3C] dark:text-[#0B1633] cursor-pointer">
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Téléversement...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      {myAgency.logo_url ? 'Modifier le logo' : 'Ajouter un logo'}
                    </>
                  )}
                  <input
                    type="file"
                    disabled={uploadingLogo}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      if (!myAgency.id) {
                        setLogoError('Aucun profil agence enregistré en base pour ce compte.');
                        return;
                      }
                      setUploadingLogo(true);
                      setLogoError(null);
                      setLogoSuccess(null);
                      try {
                        await store.uploadAgencyLogo(myAgency.id, file);
                        setLogoSuccess('Logo d’agence enregistré dans Supabase Storage (agency-logos).');
                      } catch (err) {
                        setLogoError((err as Error).message);
                      } finally {
                        setUploadingLogo(false);
                      }
                    }}
                  />
                </label>

                {myAgency.logo_url && myAgency.id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploadingLogo}
                    onClick={async () => {
                      setUploadingLogo(true);
                      setLogoError(null);
                      setLogoSuccess(null);
                      try {
                        await store.removeAgencyLogo(myAgency.id, myAgency.logo_url);
                        setLogoSuccess('Logo d’agence supprimé.');
                      } catch (err) {
                        setLogoError((err as Error).message);
                      } finally {
                        setUploadingLogo(false);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    Supprimer
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                JPEG, PNG ou WebP · max 5 Mo · affiché sur votre fiche publique
              </p>
            </div>
          </div>

          <div className="text-sm space-y-2">
            <div><strong>Raison sociale :</strong> {myAgency.name}</div>
            <div><strong>RCCM :</strong> {myAgency.rccm_number || 'Non renseigné'}</div>
            <div><strong>Adresse :</strong> {myAgency.address}, {myAgency.city}</div>
            <div><strong>Téléphone / WhatsApp :</strong> {myAgency.phone || 'Non renseigné'}</div>
            <div><strong>Email :</strong> {myAgency.email || 'Non renseigné'}</div>
          </div>
        </div>
      )}

      <PropertyPhotosModal property={photosProp} onClose={() => setPhotosProp(null)} />

      <Dialog open={agentModal} onClose={() => setAgentModal(false)} title="Ajouter un agent à l’agence">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            store.addAgencyAgent({ fullName: agentName, email: agentEmail, phone: agentPhone, memberRole: agentRole });
            setAgentModal(false);
            setAgentName('');
            setAgentEmail('');
          }}
          className="space-y-4"
        >
          <Input required value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Nom complet de l’agent" />
          <Input required type="email" value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="Email professionnel" />
          <Input required value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} placeholder="Téléphone" />
          <Select value={agentRole} onChange={(e) => setAgentRole(e.target.value as typeof agentRole)}>
            <option value="senior_agent">Agent Principal</option>
            <option value="agent">Agent Commercial</option>
            <option value="assistant">Assistant(e)</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAgentModal(false)}>Annuler</Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={contractModal} onClose={() => setContractModal(false)} title="Enregistrer un nouveau contrat">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            store.addContract({
              property_id: agencyProps[0]?.id || null,
              property_title: agencyProps[0]?.title || 'Bien en gestion',
              client_name: clientName,
              client_phone: clientPhone,
              client_email: null,
              contract_type: contractType,
              amount_fcfa: Number(contractAmount),
              deposit_fcfa: 0,
              start_date: new Date().toISOString().slice(0, 10),
              end_date: null,
              status: 'active',
            });
            setContractModal(false);
            setClientName('');
          }}
          className="space-y-4"
        >
          <Input required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom du client / locataire" />
          <Input required value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Téléphone" />
          <Select value={contractType} onChange={(e) => setContractType(e.target.value as typeof contractType)}>
            <option value="lease">Bail locatif</option>
            <option value="sale">Compromis / Vente</option>
            <option value="management">Mandat de gestion</option>
          </Select>
          <Input type="number" required value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} placeholder="Montant FCFA" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setContractModal(false)}>Annuler</Button>
            <Button type="submit">Créer le contrat</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
};
