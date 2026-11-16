import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  Check,
  CreditCard,
  Flag,
  Layers,
  MapPin,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { DashboardLayout, type SidebarNavItem } from '../layouts/DashboardLayout';
import { usePlatform } from '../hooks/usePlatform';
import { Button } from '../components/ui/button';
import { Input, Select } from '../components/ui/input';
import { formatDateFR, formatFCFA, paymentProviderLabel, paymentStatusLabel, propertyStatusLabel } from '../utils/format';
import type { FeaturedBadge } from '../types/database';

const NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Tableau de bord', icon: BarChart3 },
  { id: 'validation', label: 'Validation annonces', icon: ShieldAlert },
  { id: 'featured', label: 'Annonces à la une', icon: Sparkles },
  { id: 'payments', label: 'Paiements & Transactions', icon: CreditCard },
  { id: 'plans', label: 'Tarifs de publication', icon: Layers },
  { id: 'users_agencies', label: 'Utilisateurs & Agences', icon: Users },
  { id: 'taxonomy', label: 'Catégories & Villes CI', icon: MapPin },
  { id: 'reports', label: 'Signalements', icon: Flag },
  { id: 'logs', label: 'Journaux & Paramètres', icon: Activity },
];

export const AdminDashboardPage: React.FC = () => {
  const {
    properties,
    profiles,
    agencies,
    payments,
    plans,
    categories,
    locations,
    reports,
    adminLogs,
    store,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState('overview');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState('');
  const [newCity, setNewCity] = useState('Abidjan');
  const [newCommune, setNewCommune] = useState('');
  const [newQuartier, setNewQuartier] = useState('');

  const stats = useMemo(() => {
    const publishedCount = properties.filter((p) => p.status === 'published').length;
    const pendingCount = properties.filter((p) => p.status === 'pending_validation' || p.status === 'pending_payment').length;
    const rejectedCount = properties.filter((p) => p.status === 'rejected').length;
    const expiredCount = properties.filter((p) => p.status === 'expired').length;
    const revenueTotal = payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount_fcfa, 0);

    const byCity: Record<string, number> = {};
    properties.forEach((p) => {
      byCity[p.city] = (byCity[p.city] || 0) + 1;
    });

    return {
      publishedCount,
      pendingCount,
      rejectedCount,
      expiredCount,
      revenueTotal,
      byCity: Object.entries(byCity),
    };
  }, [properties, payments]);

  return (
    <DashboardLayout
      title="Administration ROYAL IMMO"
      subtitle="Supervision, modération & paiements"
      items={NAV_ITEMS}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Annonces publiées', value: stats.publishedCount },
              { label: 'En attente de validation', value: stats.pendingCount },
              { label: 'Agences inscrites', value: agencies.length },
              { label: 'Chiffre d’affaires vérifié', value: formatFCFA(stats.revenueTotal) },
              { label: 'Utilisateurs totaux', value: profiles.length },
              { label: 'Paiements enregistrés', value: payments.length },
              { label: 'Annonces refusées', value: stats.rejectedCount },
              { label: 'Annonces expirées', value: stats.expiredCount },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0E172E]">
                <div className="text-xs text-slate-500 dark:text-slate-400">{k.label}</div>
                <div className="mt-2 font-mono-tabular text-xl font-bold text-slate-900 dark:text-white">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E]">
              <h2 className="text-base font-bold">Répartition des annonces par ville (CI)</h2>
              <div className="mt-4 space-y-3">
                {stats.byCity.map(([cityName, count]) => (
                  <div key={cityName} className="flex items-center justify-between text-sm">
                    <span>{cityName}</span>
                    <span className="font-mono-tabular font-semibold">{count} bien(s)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E]">
              <h2 className="text-base font-bold">File prioritaire de modération</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Annonces soumises en attente d’approbation administrative.
              </p>
              <div className="mt-4 space-y-3">
                {properties.filter((p) => p.status === 'pending_validation' || p.status === 'pending_payment').length === 0 ? (
                  <p className="text-xs text-slate-500">Aucune annonce en attente.</p>
                ) : (
                  properties
                    .filter((p) => p.status === 'pending_validation' || p.status === 'pending_payment')
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{p.title}</div>
                          <div className="text-xs text-slate-500">{p.city} · {propertyStatusLabel(p.status).label}</div>
                        </div>
                        <Button size="sm" onClick={() => setActiveTab('validation')}>Modérer</Button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold">Validation des annonces avant publication</h2>
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-800 dark:bg-[#0E172E] dark:divide-slate-800">
            {properties.map((p) => {
              const st = propertyStatusLabel(p.status);
              return (
                <div key={p.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono-tabular text-slate-500">{p.reference} · {st.label}</div>
                    <div className="text-sm font-bold mt-0.5">{p.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {p.quartier}, {p.commune}, {p.city} · {formatFCFA(p.price_fcfa)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={rejectReason[p.id] || ''}
                      onChange={(e) => setRejectReason({ ...rejectReason, [p.id]: e.target.value })}
                      placeholder="Motif si refus..."
                      className="w-48 h-9 text-xs"
                    />
                    <Button size="sm" variant="default" onClick={() => store.adminApproveProperty(p.id)}>
                      <Check className="h-3.5 w-3.5" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => store.adminRejectProperty(p.id, rejectReason[p.id] || 'Dossier incomplet')}
                    >
                      <X className="h-3.5 w-3.5" /> Refuser
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'featured' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-[#0E172E]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Bien</th>
                <th className="px-4 py-3 text-left">Badge actuel</th>
                <th className="px-4 py-3 text-right">Attribution mise en avant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {properties.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-xs">{p.featured_badge || 'Standard'}</td>
                  <td className="px-4 py-3 text-right">
                    <Select
                      value={p.featured_badge || ''}
                      onChange={(e) => store.adminSetFeatured(p.id, (e.target.value || null) as FeaturedBadge | null)}
                      className="w-44 inline-block h-9 text-xs"
                    >
                      <option value="">Aucun badge</option>
                      <option value="featured">À la une</option>
                      <option value="new">Nouveau</option>
                      <option value="exclusive">Exclusivité</option>
                      <option value="price_reduced">Prix réduit</option>
                      <option value="verified">Vérifié</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-[#0E172E]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Facture</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Moyen</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Validation manuelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((pay) => (
                <tr key={pay.id}>
                  <td className="px-4 py-3 font-mono-tabular text-xs">{pay.invoice_number}</td>
                  <td className="px-4 py-3 text-xs">{pay.user_name}</td>
                  <td className="px-4 py-3 text-xs">{paymentProviderLabel(pay.provider)}</td>
                  <td className="px-4 py-3 text-right font-mono-tabular font-semibold">{formatFCFA(pay.amount_fcfa)}</td>
                  <td className="px-4 py-3 text-xs">{paymentStatusLabel(pay.status).label}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {pay.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => store.adminVerifyPayment(pay.id, 'succeeded')}>Valider</Button>
                        <Button size="sm" variant="destructive" onClick={() => store.adminVerifyPayment(pay.id, 'failed')}>Rejeter</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-[#0E172E]">
          <h2 className="text-base font-bold">Gestion dynamique des tarifs de publication (FCFA)</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {plans.map((pl) => (
              <div key={pl.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{pl.name} ({pl.duration_days} jours)</div>
                  <div className="text-xs text-slate-500">{pl.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    defaultValue={pl.price_fcfa}
                    onBlur={(e) => store.adminUpdatePlanPrice(pl.id, Number(e.target.value))}
                    className="w-32 font-mono-tabular h-9"
                  />
                  <span className="text-xs font-semibold">FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users_agencies' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0E172E]">
            <h2 className="text-base font-bold mb-4">Agences immobilières ({agencies.length})</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {agencies.map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#C89B3C]" />
                      {a.name}
                    </div>
                    <div className="text-xs text-slate-500">{a.city} · {a.email}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => store.adminToggleAgencyVerified(a.id)}>
                    {a.is_verified ? 'Retirer certification' : 'Certifier l’agence'}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0E172E]">
            <h2 className="text-base font-bold mb-4">Comptes utilisateurs ({profiles.length})</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {profiles.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <span className="font-mono-tabular text-xs font-semibold">{u.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'taxonomy' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-[#0E172E]">
            <h2 className="text-base font-bold">Catégories de biens ({categories.length})</h2>
            <div className="flex gap-2">
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nouvelle catégorie..." />
              <Button
                onClick={() => {
                  if (newCategory.trim()) {
                    store.adminAddCategory(newCategory.trim());
                    setNewCategory('');
                  }
                }}
              >
                Ajouter
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {categories.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 font-medium">
                  {c.name}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-[#0E172E]">
            <h2 className="text-base font-bold">Localisations Côte d’Ivoire ({locations.length})</h2>
            <div className="grid grid-cols-3 gap-2">
              <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Ville" />
              <Input value={newCommune} onChange={(e) => setNewCommune(e.target.value)} placeholder="Commune" />
              <Input value={newQuartier} onChange={(e) => setNewQuartier(e.target.value)} placeholder="Quartier" />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (newCity.trim()) {
                  store.adminAddLocation(newCity.trim(), newCommune.trim(), newQuartier.trim());
                  setNewCommune('');
                  setNewQuartier('');
                }
              }}
            >
              Ajouter la zone
            </Button>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {locations.map((l) => (
                <div key={l.id} className="py-2">
                  <strong>{l.city}</strong> · {l.commune} · {l.quartier}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-800 dark:bg-[#0E172E] dark:divide-slate-800">
          {reports.map((r) => (
            <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold">{r.reason}</div>
                <div className="text-xs text-slate-500">{r.property_title}</div>
                <p className="text-xs mt-1">{r.details}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold mr-2">{r.status}</span>
                {r.status !== 'resolved' && (
                  <Button size="sm" onClick={() => store.adminResolveReport(r.id, 'resolved')}>Marquer résolu</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0E172E]">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Settings className="h-4 w-4 text-[#C89B3C]" /> Paramètres de modération & niveaux d’administration
            </h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Niveaux actifs : <strong className="font-mono-tabular">super_admin</strong> (paramètres globaux, tarification, logs) et{' '}
              <strong className="font-mono-tabular">admin</strong> (validation annonces, vérification paiements, signalements).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-[#0E172E]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Administrateur</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Table</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {adminLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-xs font-mono-tabular">{formatDateFR(log.created_at)}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{log.admin_name}</td>
                    <td className="px-4 py-3 text-xs font-mono-tabular">{log.action}</td>
                    <td className="px-4 py-3 text-xs">{log.target_table}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
