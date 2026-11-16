import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Select } from '../ui/input';
import { Dialog } from '../ui/dialog';
import { usePlatform } from '../../hooks/usePlatform';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import {
  storageService,
  type PrivateDocumentItem,
} from '../../services/storageService';
import { formatDateFR } from '../../utils/format';

const DOC_TYPES = [
  { value: 'cni-identite', label: 'Pièce d’identité (CNI / Passeport)' },
  { value: 'titre-foncier-acd', label: 'Titre foncier / ACD / Attestation' },
  { value: 'rccm-agrement', label: 'RCCM / Agrément agence' },
  { value: 'contrat-bail', label: 'Contrat / Mandat / Bail' },
  { value: 'justificatif-paiement', label: 'Justificatif de paiement' },
  { value: 'autre-document', label: 'Autre document privé' },
];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export const PrivateDocumentsManager: React.FC = () => {
  const { currentUser } = usePlatform();
  const [docs, setDocs] = useState<PrivateDocumentItem[]>([]);
  const [docType, setDocType] = useState('titre-foncier-acd');
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    mimeType: string;
    signedUrl: string;
  } | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSessionUserId(null);
      return;
    }

    setLoadingList(true);
    setErrorMsg(null);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id || null;
      setSessionUserId(uid);

      if (!uid) {
        setDocs([]);
        return;
      }

      const items = await storageService.listPrivateDocuments();
      setDocs(items);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments, currentUser?.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await storageService.uploadPrivateDocument(file, docType);
      setSuccessMsg(`Document "${file.name}" chiffré et enregistré dans votre espace privé.`);
      await loadDocuments();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleViewSigned = async (doc: PrivateDocumentItem) => {
    setBusyPath(doc.storage_path);
    setErrorMsg(null);
    try {
      const signedUrl = await storageService.getPrivateDocumentSignedUrl(doc.storage_path, 300);
      setPreviewDoc({
        name: doc.name,
        mimeType: doc.mime_type,
        signedUrl,
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusyPath(null);
    }
  };

  const handleDelete = async (doc: PrivateDocumentItem) => {
    setBusyPath(doc.storage_path);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await storageService.deletePrivateDocument(doc.storage_path);
      setDocs((prev) => prev.filter((item) => item.storage_path !== doc.storage_path));
      setSuccessMsg(`Document "${doc.name}" supprimé définitivement.`);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusyPath(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B3B8C]/10 text-[#1B3B8C] dark:bg-[#C89B3C]/15 dark:text-[#C89B3C] shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Coffre-fort de documents privés
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stockage privé isolé (<code className="font-mono-tabular">private-documents</code>). Accès exclusif via URL signées temporaires (5 min).
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadDocuments()}
            disabled={loadingList || !sessionUserId}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {!sessionUserId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Session Supabase authentifiée requise</p>
              <p className="text-xs mt-1 opacity-90">
                Connectez-vous avec votre compte réel pour téléverser et consulter vos documents privés en toute sécurité.
              </p>
            </div>
            <Link to="/connexion">
              <Button size="sm" variant="default">Se connecter</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nature du document
              </label>
              <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1B3B8C] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#142D6B] dark:bg-[#C89B3C] dark:text-[#0B1633] dark:hover:bg-[#B5892E] cursor-pointer transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Téléversement...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Téléverser (PDF, JPEG, PNG)
                  </>
                )}
                <input
                  type="file"
                  disabled={uploading}
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Formats autorisés : PDF, JPEG, PNG uniquement · Taille maximale : 5 Mo par fichier · Dossier strictement réservé à votre identifiant utilisateur.
        </p>

        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {sessionUserId && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#0E172E]">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Mes documents enregistrés ({docs.length})
            </h3>
          </div>

          {loadingList ? (
            <div className="p-10 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#1B3B8C] dark:text-[#C89B3C]" />
              Chargement sécurisé des documents...
            </div>
          ) : docs.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucun document privé téléversé pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {docs.map((doc) => {
                const isBusy = busyPath === doc.storage_path;
                return (
                  <div
                    key={doc.storage_path}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#1B3B8C] dark:bg-slate-800 dark:text-[#C89B3C] shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {doc.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular mt-0.5">
                          {formatFileSize(doc.size_bytes)} · {doc.created_at ? formatDateFR(doc.created_at) : 'Récent'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => void handleViewSigned(doc)}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        Consulter
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isBusy}
                        onClick={() => void handleDelete(doc)}
                        aria-label={`Supprimer ${doc.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc ? `Consultation sécurisée — ${previewDoc.name}` : 'Document privé'}
        maxWidthClass="max-w-3xl"
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <span>Lien temporaire signé (valide 5 minutes)</span>
              <a
                href={previewDoc.signedUrl}
                target="_blank"
                rel="noreferrer"
                download={previewDoc.name}
                className="inline-flex items-center gap-1 font-semibold text-[#1B3B8C] dark:text-[#C89B3C] hover:underline"
              >
                Télécharger le fichier
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {previewDoc.mimeType.includes('pdf') || previewDoc.name.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewDoc.signedUrl}
                title={previewDoc.name}
                className="w-full h-[65vh] rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
              />
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 flex justify-center">
                <img
                  src={previewDoc.signedUrl}
                  alt={previewDoc.name}
                  className="max-h-[65vh] w-auto object-contain"
                />
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};
