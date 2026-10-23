/**
 * Turns an imported photo/drawing into a small JPEG data URL (white background, longest side at most `maxSide`
 * pixels, lowering the quality until it fits in `maxBytes`), so it can be stored in a cloud record (Firestore
 * documents are limited to 1 MB) and drawn in a PDF.
 */
export async function compressImageFile(file: File, maxSide = 1000, maxBytes = 180_000): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('O ficheiro não é uma imagem.');
  const url = URL.createObjectURL(file);
  try {
    return await compressImageSource(url, maxSide, maxBytes);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Athletes' and staff photos: small enough for the phone's storage and the cloud (a few tens of KB each). */
export const PHOTO_MAX_SIDE = 360;
export const PHOTO_MAX_BYTES = 45_000;

/** Same as compressImageFile for an image already loaded as a (data) URL. */
export async function compressImageSource(src: string, maxSide = 1000, maxBytes = 180_000): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    el.src = src;
  });
  let side = maxSide;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível preparar a imagem.');
    ctx.fillStyle = '#ffffff'; // transparent drawings (PNG) become white, not black, in JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (dataUrlBytes(data) <= maxBytes) return data;
    }
    side = Math.round(side * 0.75);
  }
  throw new Error('A imagem é demasiado grande.');
}

/** Approximate size in bytes of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}
