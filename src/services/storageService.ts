import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { validateAndCompressImage } from '../utils/imageCompression';

export type PublicStorageBucket = 'property-images' | 'agency-logos' | 'avatars';
export type StorageBucket = PublicStorageBucket | 'private-documents';

export interface UploadedImageAsset {
  storage_path: string;
  public_url: string;
  is_cover: boolean;
  sort_order: number;
}

export interface PrivateDocumentItem {
  name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  created_at: string | null;
  updated_at: string | null;
}

export const MAX_STORAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_DOC_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_DOC_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png']);

function sanitizeFileName(rawName: string): string {
  const base = rawName.replace(/\.[^.]+$/, '');
  const clean = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return clean || 'fichier';
}

function getFileExtension(rawName: string, mimeType: string): string {
  const extFromName = rawName.split('.').pop()?.toLowerCase();
  if (extFromName && /^[a-z0-9]{2,5}$/.test(extFromName)) {
    return extFromName;
  }
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function extractRelativePath(bucket: StorageBucket, pathOrUrl: string): string {
  if (!pathOrUrl.startsWith('http')) return pathOrUrl.replace(/^\/+/, '');
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = pathOrUrl.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(pathOrUrl.slice(idx + marker.length));
  }
  return pathOrUrl;
}

async function requireAuthenticatedUserId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Storage n’est pas configuré.');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`Erreur de vérification de session : ${error.message}`);
  }
  const userId = data.session?.user?.id;
  if (!userId) {
    throw new Error('Session utilisateur requise : veuillez vous connecter avant de téléverser ou consulter des fichiers.');
  }
  return userId;
}

export function validateImageFile(file: File): void {
  if (!file || file.size === 0) {
    throw new Error('Le fichier sélectionné est vide.');
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeOk = file.type ? ALLOWED_IMAGE_MIME.has(file.type) : ALLOWED_IMAGE_EXT.has(ext);
  const extOk = !ext || ALLOWED_IMAGE_EXT.has(ext);
  if (!mimeOk || !extOk) {
    throw new Error(`Format d’image non autorisé (${file.name}). Formats acceptés : JPEG, PNG, WebP.`);
  }
  if (file.size > MAX_STORAGE_FILE_SIZE_BYTES) {
    throw new Error(`L’image ${file.name} dépasse la limite autorisée de 5 Mo.`);
  }
}

export function validatePrivateDocumentFile(file: File): void {
  if (!file || file.size === 0) {
    throw new Error('Le document sélectionné est vide.');
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeOk = file.type ? ALLOWED_DOC_MIME.has(file.type) : ALLOWED_DOC_EXT.has(ext);
  const extOk = !ext || ALLOWED_DOC_EXT.has(ext);
  if (!mimeOk || !extOk) {
    throw new Error(`Format non autorisé (${file.name}). Formats acceptés : PDF, JPEG, PNG uniquement.`);
  }
  if (file.size > MAX_STORAGE_FILE_SIZE_BYTES) {
    throw new Error(`Le document ${file.name} dépasse la taille maximale de 5 Mo.`);
  }
}

export const storageService = {
  /**
   * 1. PROPERTY-IMAGES (public) — chemin strict: property-images/ID_UTILISATEUR/nom-fichier
   */
  async uploadPropertyPhotos(
    _userId: string,
    propertyId: string,
    files: File[]
  ): Promise<UploadedImageAsset[]> {
    const authUserId = await requireAuthenticatedUserId();
    if (!supabase) throw new Error('Client Supabase indisponible.');
    if (!files.length) return [];

    const uploaded: UploadedImageAsset[] = [];

    for (let i = 0; i < files.length; i++) {
      const rawFile = files[i];
      validateImageFile(rawFile);

      const compressed = await validateAndCompressImage(rawFile, 1600, 0.82);
      if (compressed.file.size > MAX_STORAGE_FILE_SIZE_BYTES) {
        throw new Error(`L’image ${rawFile.name} dépasse toujours 5 Mo après compression.`);
      }
      const safeName = sanitizeFileName(rawFile.name);
      const safeProp = sanitizeFileName(propertyId);
      const storagePath = `${authUserId}/${safeProp}-${i + 1}-${Date.now()}-${safeName}.jpg`;

      const { error } = await supabase.storage
        .from('property-images')
        .upload(storagePath, compressed.file, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw new Error(`Échec téléversement de "${rawFile.name}" : ${error.message}`);
      }

      const { data: pub } = supabase.storage.from('property-images').getPublicUrl(storagePath);
      uploaded.push({
        storage_path: storagePath,
        public_url: pub.publicUrl,
        is_cover: i === 0,
        sort_order: i,
      });
    }

    return uploaded;
  },

  /**
   * 2. AGENCY-LOGOS (public) — chemin strict: agency-logos/ID_UTILISATEUR/nom-fichier
   */
  async uploadAgencyLogo(rawFile: File): Promise<{ storage_path: string; public_url: string }> {
    const authUserId = await requireAuthenticatedUserId();
    if (!supabase) throw new Error('Client Supabase indisponible.');

    validateImageFile(rawFile);
    const compressed = await validateAndCompressImage(rawFile, 800, 0.88);
    if (compressed.file.size > MAX_STORAGE_FILE_SIZE_BYTES) {
      throw new Error(`Le logo ${rawFile.name} dépasse la limite de 5 Mo.`);
    }
    const safeName = sanitizeFileName(rawFile.name);
    const storagePath = `${authUserId}/logo-${Date.now()}-${safeName}.jpg`;

    const { error } = await supabase.storage
      .from('agency-logos')
      .upload(storagePath, compressed.file, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw new Error(`Échec téléversement du logo : ${error.message}`);
    }

    const { data: pub } = supabase.storage.from('agency-logos').getPublicUrl(storagePath);
    return {
      storage_path: storagePath,
      public_url: pub.publicUrl,
    };
  },

  /**
   * 3. AVATARS (public) — chemin strict: avatars/ID_UTILISATEUR/nom-fichier
   */
  async uploadAvatar(rawFile: File): Promise<{ storage_path: string; public_url: string }> {
    const authUserId = await requireAuthenticatedUserId();
    if (!supabase) throw new Error('Client Supabase indisponible.');

    validateImageFile(rawFile);
    const compressed = await validateAndCompressImage(rawFile, 640, 0.85);
    if (compressed.file.size > MAX_STORAGE_FILE_SIZE_BYTES) {
      throw new Error(`La photo de profil ${rawFile.name} dépasse la limite de 5 Mo.`);
    }
    const safeName = sanitizeFileName(rawFile.name);
    const storagePath = `${authUserId}/avatar-${Date.now()}-${safeName}.jpg`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(storagePath, compressed.file, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw new Error(`Échec téléversement de la photo de profil : ${error.message}`);
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    return {
      storage_path: storagePath,
      public_url: pub.publicUrl,
    };
  },

  /**
   * 4. PRIVATE-DOCUMENTS (privé) — chemin strict: private-documents/ID_UTILISATEUR/nom-fichier
   */
  async uploadPrivateDocument(
    rawFile: File,
    docTypePrefix = 'document'
  ): Promise<PrivateDocumentItem & { signed_url: string }> {
    const authUserId = await requireAuthenticatedUserId();
    if (!supabase) throw new Error('Client Supabase indisponible.');

    validatePrivateDocumentFile(rawFile);
    const safePrefix = sanitizeFileName(docTypePrefix);
    const safeName = sanitizeFileName(rawFile.name);
    const ext = getFileExtension(rawFile.name, rawFile.type);
    const fileName = `${safePrefix}-${Date.now()}-${safeName}.${ext}`;
    const storagePath = `${authUserId}/${fileName}`;

    const resolvedContentType =
      rawFile.type && ALLOWED_DOC_MIME.has(rawFile.type)
        ? rawFile.type
        : ext === 'pdf'
          ? 'application/pdf'
          : ext === 'png'
            ? 'image/png'
            : 'image/jpeg';

    const { error } = await supabase.storage
      .from('private-documents')
      .upload(storagePath, rawFile, {
        contentType: resolvedContentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Échec téléversement du document "${rawFile.name}" : ${error.message}`);
    }

    const signedUrl = await this.getPrivateDocumentSignedUrl(storagePath, 300);

    return {
      name: fileName,
      storage_path: storagePath,
      size_bytes: rawFile.size,
      mime_type: resolvedContentType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      signed_url: signedUrl,
    };
  },

  async listPrivateDocuments(): Promise<PrivateDocumentItem[]> {
    const authUserId = await requireAuthenticatedUserId();
    if (!supabase) throw new Error('Client Supabase indisponible.');

    const { data, error } = await supabase.storage
      .from('private-documents')
      .list(authUserId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      throw new Error(`Impossible de lister vos documents privés : ${error.message}`);
    }

    return (data || [])
      .filter((item) => item.name && !item.name.startsWith('.'))
      .map((item) => {
        const meta = (item.metadata || {}) as Record<string, unknown>;
        return {
          name: item.name,
          storage_path: `${authUserId}/${item.name}`,
          size_bytes: Number(meta.size ?? 0),
          mime_type: String(meta.mimetype || (item.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')),
          created_at: item.created_at || null,
          updated_at: item.updated_at || null,
        };
      });
  },

  async getPrivateDocumentSignedUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
    const authUserId = await requireAuthenticatedUserId();
    if (!supabase) throw new Error('Client Supabase indisponible.');

    const normalized = extractRelativePath('private-documents', storagePath);
    if (!normalized.startsWith(`${authUserId}/`)) {
      throw new Error('Accès refusé : ce document n’appartient pas à votre dossier utilisateur.');
    }

    const { data, error } = await supabase.storage
      .from('private-documents')
      .createSignedUrl(normalized, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Impossible de générer le lien temporaire sécurisé : ${error?.message || 'URL indisponible'}`);
    }

    return data.signedUrl;
  },

  async deletePrivateDocument(storagePath: string): Promise<void> {
    const authUserId = await requireAuthenticatedUserId();
    if (!supabase) throw new Error('Client Supabase indisponible.');

    const normalized = extractRelativePath('private-documents', storagePath);
    if (!normalized.startsWith(`${authUserId}/`)) {
      throw new Error('Suppression refusée : ce document n’appartient pas à votre dossier utilisateur.');
    }

    const { error } = await supabase.storage.from('private-documents').remove([normalized]);
    if (error) {
      throw new Error(`Impossible de supprimer le document : ${error.message}`);
    }
  },

  async deletePhoto(bucket: StorageBucket, pathOrUrl: string): Promise<void> {
    const authUserId = await requireAuthenticatedUserId();
    if (!supabase) return;

    const normalized = extractRelativePath(bucket, pathOrUrl);
    if (!normalized || normalized.startsWith('http') || normalized.startsWith('/')) return;
    if (!normalized.startsWith(`${authUserId}/`)) {
      throw new Error('Action refusée : vous ne pouvez supprimer que vos propres fichiers.');
    }

    const { error } = await supabase.storage.from(bucket).remove([normalized]);
    if (error) {
      throw new Error(`Échec de suppression dans ${bucket} : ${error.message}`);
    }
  },
};
