export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_INPUT_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo limit aligned with Supabase Storage

export async function validateAndCompressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.82
): Promise<CompressedImageResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Format non pris en charge (${file.name}). Utilisez JPEG, PNG ou WebP.`);
  }
  if (file.size > MAX_INPUT_SIZE_BYTES) {
    throw new Error(`L'image ${file.name} dépasse la taille maximale autorisée (5 Mo).`);
  }

  const originalSizeKB = Math.round(file.size / 1024);

  const imageBitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Impossible de décoder l’image.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.readAsDataURL(file);
  });

  const scale = Math.min(1, maxWidth / imageBitmap.width);
  const targetWidth = Math.round(imageBitmap.width * scale);
  const targetHeight = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexte graphique indisponible pour la compression.');
  }
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Échec de la compression WebP/JPEG.'))),
      'image/jpeg',
      quality
    );
  });

  const compressedFile = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, '') + '.jpg',
    { type: 'image/jpeg' }
  );

  return {
    file: compressedFile,
    previewUrl: URL.createObjectURL(compressedFile),
    originalSizeKB,
    compressedSizeKB: Math.round(compressedFile.size / 1024),
  };
}
