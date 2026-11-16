import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, ImagePlus, Loader2, MoveLeft, MoveRight, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { usePlatform } from '../hooks/usePlatform';
import { Button } from '../components/ui/button';
import { Input, Select, Textarea } from '../components/ui/input';
import { InvoiceModal } from '../components/brand/InvoiceModal';
import { validateAndCompressImage } from '../utils/imageCompression';
import { validateImageFile } from '../services/storageService';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatFCFA } from '../utils/format';
import { RIVIERA_APT_IMAGE } from '../data/demoData';
import type { PaymentProvider, PaymentRecord, TransactionType } from '../types/database';

interface LocalImageItem {
  id: string;
  file?: File;
  previewUrl: string;
  sizeLabel: string;
}

export const PublishPropertyPage: React.FC = () => {
  const { categories, locations, plans, currentUser, store } = usePlatform();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdPayment, setCreatedPayment] = useState<PaymentRecord | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Step 1
  const [categoryName, setCategoryName] = useState('Villa');
  const [transaction, setTransaction] = useState<TransactionType>('sale');

  // Step 2
  const [title, setTitle] = useState('');
  const [priceFcfa, setPriceFcfa] = useState('');
  const [surfaceM2, setSurfaceM2] = useState('');
  const [bedrooms, setBedrooms] = useState('3');
  const [bathrooms, setBathrooms] = useState('3');
  const [hasGarage, setHasGarage] = useState(true);
  const [hasPool, setHasPool] = useState(false);
  const [hasGarden, setHasGarden] = useState(true);
  const [isFurnished, setIsFurnished] = useState(false);
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Step 3: Photos
  const [photos, setPhotos] = useState<LocalImageItem[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);

  // Step 4: Location
  const [city, setCity] = useState('Abidjan');
  const [commune, setCommune] = useState('Cocody');
  const [quartier, setQuartier] = useState('Riviera Golf');
  const [publicHint, setPublicHint] = useState('');
  const [showExactAddress, setShowExactAddress] = useState(false);

  // Step 5: Plan
  const [planId, setPlanId] = useState(plans[2]?.id || 'plan-30');

  // Step 6: Payment
  const [provider, setProvider] = useState<PaymentProvider>('wave');
  const [payerPhone, setPayerPhone] = useState(currentUser?.phone || '+225 07 00 00 00 00');
  const [manualReference, setManualReference] = useState('');

  const cities = useMemo(() => Array.from(new Set(locations.map((l) => l.city))), [locations]);
  const selectedPlan = plans.find((p) => p.id === planId) || plans[2];

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setProcessingPhotos(true);
    try {
      for (const f of files) {
        validateImageFile(f);
        const res = await validateAndCompressImage(f);
        setPhotos((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            file: res.file,
            previewUrl: res.previewUrl,
            sizeLabel: `${res.compressedSizeKB} Ko (compressée depuis ${res.originalSizeKB} Ko)`,
          },
        ]);
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setProcessingPhotos(false);
    }
  };

  const movePhoto = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    const copy = [...photos];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setPhotos(copy);
  };

  const setAsCover = (idx: number) => {
    if (idx <= 0 || idx >= photos.length) return;
    const copy = [...photos];
    const [chosen] = copy.splice(idx, 1);
    copy.unshift(chosen);
    setPhotos(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!title.trim() || !priceFcfa || !surfaceM2 || !description.trim()) {
      setErrorMsg('Veuillez compléter les informations obligatoires du bien.');
      return;
    }

    setSubmitting(true);
    try {
      const cat = categories.find((c) => c.name === categoryName) || categories[0];
      const finalImages =
        photos.length > 0
          ? photos.map((p, idx) => ({
              id: p.id,
              property_id: 'new',
              storage_path: `uploads/${p.id}.jpg`,
              public_url: p.previewUrl,
              is_cover: idx === 0,
              sort_order: idx,
            }))
          : [
              {
                id: 'default-cover',
                property_id: 'new',
                storage_path: 'demo/cover.jpg',
                public_url: RIVIERA_APT_IMAGE,
                is_cover: true,
                sort_order: 0,
              },
            ];

      const res = await store.submitPropertyWithPayment({
        property: {
          agency_id: null,
          agent_id: null,
          category_id: cat.id,
          category_name: cat.name,
          title: title.trim(),
          description: description.trim(),
          transaction,
          price_fcfa: Number(priceFcfa),
          price_period: transaction === 'sale' ? 'total' : transaction === 'seasonal' ? 'day' : 'month',
          city,
          commune,
          quartier,
          public_address_hint: publicHint || null,
          show_exact_address: showExactAddress,
          latitude: 5.34,
          longitude: -3.99,
          surface_m2: Number(surfaceM2),
          bedrooms: Number(bedrooms || 0),
          bathrooms: Number(bathrooms || 0),
          has_garage: hasGarage,
          has_pool: hasPool,
          has_garden: hasGarden,
          is_furnished: isFurnished,
          amenities: [
            hasGarage ? 'Garage' : '',
            hasPool ? 'Piscine' : '',
            hasGarden ? 'Jardin' : '',
            isFurnished ? 'Meublé' : '',
          ].filter(Boolean),
          video_url: videoUrl || null,
          availability_date: new Date().toISOString().slice(0, 10),
          plan_id: selectedPlan.id,
          images: finalImages,
        },
        imageFiles: photos.map((p) => p.file).filter((f): f is File => Boolean(f)),
        planId: selectedPlan.id,
        provider,
        payerPhone,
        manualReference,
      });
      setCreatedPayment(res.payment);
      setStep(7);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-[#1B3B8C] dark:text-[#C89B3C]">Publication à l’annonce · Sans abonnement</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Publier un bien immobilier sur ROYAL IMMO
          </h1>
          {step <= 6 && (
            <div className="mt-5 grid grid-cols-6 gap-2 text-[11px] font-semibold">
              {['1. Type', '2. Détails', '3. Photos', '4. Zone CI', '5. Durée', '6. Paiement'].map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(idx + 1)}
                  className={`rounded-lg py-2 px-1 text-center border transition-colors cursor-pointer ${
                    step === idx + 1
                      ? 'border-[#1B3B8C] bg-[#1B3B8C] text-white dark:border-[#C89B3C] dark:bg-[#C89B3C] dark:text-[#0B1633]'
                      : step > idx + 1
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-[#0E172E]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#0E172E]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold">Type de transaction</h2>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'sale', label: 'Vente', desc: 'Cession définitive / ACD' },
                      { id: 'rent', label: 'Location', desc: 'Bail mensuel résidentiel ou pro' },
                      { id: 'seasonal', label: 'Résidence meublée', desc: 'Location courte durée / nuitée' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTransaction(item.id)}
                      className={`rounded-xl border p-4 text-left cursor-pointer ${
                        transaction === item.id
                          ? 'border-[#1B3B8C] bg-[#1B3B8C]/5 dark:border-[#C89B3C] dark:bg-[#C89B3C]/10'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">{item.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold">Catégorie de bien</h2>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryName(cat.name)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium cursor-pointer ${
                        categoryName === cat.name
                          ? 'border-[#1B3B8C] bg-[#1B3B8C] text-white dark:border-[#C89B3C] dark:bg-[#C89B3C] dark:text-[#0B1633]'
                          : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep(2)}>
                  Étape suivante <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold">Informations principales du bien</h2>
              <div>
                <label className="block text-xs font-semibold mb-1">Titre de l’annonce *</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Villa duplex 5 pièces avec piscine à Cocody Riviera"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Prix en FCFA *</label>
                  <Input
                    type="number"
                    required
                    min={1000}
                    value={priceFcfa}
                    onChange={(e) => setPriceFcfa(e.target.value)}
                    placeholder="Ex : 120000000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Surface (m²) *</label>
                  <Input
                    type="number"
                    required
                    min={10}
                    value={surfaceM2}
                    onChange={(e) => setSurfaceM2(e.target.value)}
                    placeholder="Ex : 400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Chambres</label>
                  <Input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Salles de bain</label>
                  <Input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                {(
                  [
                    { label: 'Garage', val: hasGarage, set: setHasGarage },
                    { label: 'Piscine', val: hasPool, set: setHasPool },
                    { label: 'Jardin', val: hasGarden, set: setHasGarden },
                    { label: 'Meublé', val: isFurnished, set: setIsFurnished },
                  ] as const
                ).map((item) => (
                  <label key={item.label} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={(e) => item.set(e.target.checked)}
                      className="h-4 w-4"
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description complète *</label>
                <Textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez les atouts du bien, les documents disponibles (ACD, CPF, bail...), et l’environnement..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Lien vidéo (optionnel)</label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Photographies du bien</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Téléversement multiple (JPEG, PNG, WebP · max 5 Mo). Compression automatique avant stockage sécurisé dans <code className="font-mono-tabular">property-images</code>.
                </p>
              </div>

              {isSupabaseConfigured && !currentUser && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span>
                    <strong>Connexion requise :</strong> vous devez être connecté à votre compte ROYAL IMMO pour enregistrer vos photos et publier votre annonce.
                  </span>
                  <Link to="/connexion" className="font-semibold underline shrink-0">
                    Se connecter →
                  </Link>
                </div>
              )}

              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center cursor-pointer hover:border-[#1B3B8C] transition-colors">
                {processingPhotos ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-[#1B3B8C] dark:text-[#C89B3C] mb-2" />
                    <span className="text-sm font-semibold">Préparation et compression des photos...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-[#C89B3C] mb-2" />
                    <span className="text-sm font-semibold">Cliquez pour ajouter des photographies</span>
                    <span className="text-xs text-slate-500 mt-1">
                      Vous pourrez prévisualiser, choisir la photo de couverture ou supprimer des clichés avant validation
                    </span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  disabled={processingPhotos}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFilesSelected}
                />
              </label>

              {photos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className={`rounded-xl border overflow-hidden ${
                        idx === 0
                          ? 'border-[#C89B3C] ring-1 ring-[#C89B3C]'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="relative">
                        <img src={photo.previewUrl} alt={`Aperçu ${idx + 1}`} className="w-full aspect-[4/3] object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-2 left-2 rounded-md bg-[#0B1633]/90 px-2 py-0.5 text-[10px] font-semibold text-[#C89B3C]">
                            Photo de couverture
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 space-y-2 bg-white dark:bg-[#0E172E]">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {photo.sizeLabel}
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          {idx === 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#1B3B8C] dark:text-[#C89B3C]">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              Couverture
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAsCover(idx)}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 font-medium text-slate-700 dark:text-slate-200 hover:border-[#C89B3C] cursor-pointer"
                            >
                              <Star className="h-3 w-3 text-[#C89B3C]" />
                              Définir couverture
                            </button>
                          )}
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => movePhoto(idx, -1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer" aria-label="Déplacer à gauche">
                              <MoveLeft className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => movePhoto(idx, 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer" aria-label="Déplacer à droite">
                              <MoveRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhotos(photos.filter((p) => p.id !== photo.id))}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer"
                              aria-label="Supprimer la photo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button type="button" onClick={() => setStep(4)}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold">Localisation en Côte d’Ivoire</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Ville</label>
                  <Select value={city} onChange={(e) => setCity(e.target.value)}>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Commune</label>
                  <Input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Ex : Cocody" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Quartier</label>
                  <Input value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Ex : Riviera Palmeraie" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Indication publique de proximité (optionnel)</label>
                <Input
                  value={publicHint}
                  onChange={(e) => setPublicHint(e.target.value)}
                  placeholder="Ex : À 3 min du boulevard Mitterrand"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExactAddress}
                  onChange={(e) => setShowExactAddress(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  J’autorise l’affichage de la zone précise (par défaut, ROYAL IMMO protège votre adresse exacte).
                </span>
              </label>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button type="button" onClick={() => setStep(5)}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Choisissez la durée de publication</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tarifs officiels ROYAL IMMO en FCFA. Aucun prélèvement automatique ni abonnement.
                </p>
              </div>

              <div className="space-y-3">
                {plans.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setPlanId(pl.id)}
                    className={`w-full rounded-xl border p-4 flex items-center justify-between gap-4 text-left cursor-pointer ${
                      planId === pl.id
                        ? 'border-[#1B3B8C] bg-[#1B3B8C]/5 dark:border-[#C89B3C] dark:bg-[#C89B3C]/10'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        {pl.duration_days} jours — {pl.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{pl.description}</div>
                    </div>
                    <div className="font-mono-tabular text-base font-bold text-[#1B3B8C] dark:text-[#C89B3C]">
                      {formatFCFA(pl.price_fcfa)}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button type="button" onClick={() => setStep(6)}>
                  Passer au paiement <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div className="rounded-xl bg-[#0B1633] text-white p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-300">Forfait sélectionné</div>
                  <div className="text-base font-bold">{selectedPlan.name} ({selectedPlan.duration_days} jours)</div>
                </div>
                <div className="font-mono-tabular text-xl font-bold text-[#C89B3C]">
                  {formatFCFA(selectedPlan.price_fcfa)}
                </div>
              </div>

              <div>
                <h2 className="text-base font-bold mb-3">Moyen de paiement Côte d’Ivoire</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'wave', label: 'Wave' },
                      { id: 'orange_money', label: 'Orange Money' },
                      { id: 'mtn_momo', label: 'MTN Mobile Money' },
                      { id: 'moov_money', label: 'Moov Money' },
                      { id: 'card', label: 'Carte bancaire' },
                      { id: 'manual', label: 'Paiement manuel' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setProvider(m.id)}
                      className={`rounded-lg border p-3 text-xs font-semibold text-left cursor-pointer ${
                        provider === m.id
                          ? 'border-[#1B3B8C] bg-[#1B3B8C] text-white dark:border-[#C89B3C] dark:bg-[#C89B3C] dark:text-[#0B1633]'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {provider === 'card' ? 'Numéro de contact pour reçu' : 'Numéro Mobile Money'}
                </label>
                <Input required value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="+225 07..." />
              </div>

              {provider === 'manual' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Référence du versement / bordereau</label>
                  <Input
                    required
                    value={manualReference}
                    onChange={(e) => setManualReference(e.target.value)}
                    placeholder="Ex : VIR-SGBCI-2026-8842"
                  />
                </div>
              )}

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 text-xs text-slate-600 dark:text-slate-300 flex gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#C89B3C] shrink-0 mt-0.5" />
                <span>
                  Le paiement est vérifié côté serveur via Edge Function. Après confirmation, votre annonce passe en file de validation administrative avant mise en ligne.
                </span>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(5)}>
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button type="submit" variant="gold" disabled={submitting}>
                  <CreditCard className="h-4 w-4" />
                  {submitting ? 'Transmission sécurisée...' : `Soumettre (${formatFCFA(selectedPlan.price_fcfa)})`}
                </Button>
              </div>
            </div>
          )}

          {step === 7 && createdPayment && (
            <div className="py-6 text-center space-y-5">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Annonce soumise avec succès
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                Votre dossier est enregistré avec la facture <strong className="font-mono-tabular">{createdPayment.invoice_number}</strong>.
                Conformément aux règles de sécurité ROYAL IMMO, votre annonce sera publiée dès vérification du paiement et approbation par l’administrateur.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowInvoice(true)}>
                  Voir / Imprimer le reçu
                </Button>
                <Link to="/espace-particulier">
                  <Button type="button" variant="default">Aller à mon espace</Button>
                </Link>
              </div>
            </div>
          )}
        </form>

        <InvoiceModal payment={showInvoice ? createdPayment : null} onClose={() => setShowInvoice(false)} />
      </div>
    </PublicLayout>
  );
};
