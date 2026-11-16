import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { usePlatform } from '../../hooks/usePlatform';
import type { Property } from '../../types/database';

interface PropertyPhotosModalProps {
  property: Property | null;
  onClose: () => void;
}

export const PropertyPhotosModal: React.FC<PropertyPhotosModalProps> = ({ property, onClose }) => {
  const { properties, store } = usePlatform();
  const [uploading, setUploading] = useState(false);
  const [busyImgId, setBusyImgId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const liveProperty = property ? properties.find((p) => p.id === property.id) || property : null;

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!liveProperty) return;
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await store.addPropertyPhotos(liveProperty.id, files);
      setSuccessMsg(`${files.length} photo(s) ajoutée(s) dans property-images.`);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSetCover = async (imageId: string) => {
    if (!liveProperty) return;
    setBusyImgId(imageId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await store.setPropertyCoverPhoto(liveProperty.id, imageId);
      setSuccessMsg('Photo de couverture mise à jour.');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusyImgId(null);
    }
  };

  const handleDelete = async (imageId: string, storagePathOrUrl: string) => {
    if (!liveProperty) return;
    setBusyImgId(imageId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await store.deletePropertyPhoto(liveProperty.id, imageId, storagePathOrUrl);
      setSuccessMsg('Photo supprimée de Supabase Storage.');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusyImgId(null);
    }
  };

  return (
    <Dialog
      open={Boolean(liveProperty)}
      onClose={onClose}
      title={liveProperty ? `Photos — ${liveProperty.title}` : 'Photos du bien'}
      maxWidthClass="max-w-3xl"
    >
      {liveProperty && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bucket <code className="font-mono-tabular">property-images</code> · JPEG, PNG, WebP (max 5 Mo).
            </p>
            <label className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B3B8C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142D6B] dark:bg-[#C89B3C] dark:text-[#0B1633] cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Téléversement...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  Ajouter des photos
                </>
              )}
              <input
                type="file"
                multiple
                disabled={uploading}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAddPhotos}
              />
            </label>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {liveProperty.images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
              Aucune photo enregistrée pour cette annonce.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {liveProperty.images.map((img, idx) => {
                const isCover = img.is_cover || idx === 0;
                const isBusy = busyImgId === img.id;
                return (
                  <div
                    key={img.id}
                    className={`rounded-xl border overflow-hidden ${
                      isCover
                        ? 'border-[#C89B3C] ring-1 ring-[#C89B3C]'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900">
                      <img
                        src={img.public_url}
                        alt={`Photo ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {isCover && (
                        <span className="absolute top-2 left-2 rounded-md bg-[#0B1633]/90 px-2 py-0.5 text-[10px] font-semibold text-[#C89B3C]">
                          Couverture
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 flex items-center justify-between gap-2 bg-white dark:bg-[#0E172E]">
                      <Button
                        type="button"
                        size="sm"
                        variant={isCover ? 'gold' : 'outline'}
                        disabled={isBusy || isCover}
                        onClick={() => void handleSetCover(img.id)}
                        className="h-7 px-2 text-[11px]"
                      >
                        <Star className="h-3 w-3" />
                        {isCover ? 'Couverture' : 'Définir couverture'}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isBusy}
                        onClick={() => void handleDelete(img.id, img.storage_path || img.public_url)}
                        className="h-7 px-2"
                        aria-label="Supprimer cette photo"
                      >
                        {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};
