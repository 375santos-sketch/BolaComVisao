import { CARD_IMAGE, PHOTO_MAX } from './weeklyNewsletter';
import { loadDataImage } from './shareImage';

/**
 * 📰 The scorers' photos of the weekly summary (only when the coach turns them on): each photo of the app is cut to a
 * small square (96×96 JPEG, a few KB) on this phone before it goes to the public link, so the link never holds the
 * full photo. A photo that cannot be drawn, or that is still too big, is left out.
 */
const SIZE = 96;

export async function smallScorerPhotos(sources: Record<string, string>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [name, src] of Object.entries(sources)) {
    try {
      const img = await loadDataImage(src);
      if (!img || !img.width || !img.height) continue;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      // Centre square of the photo (the face is usually in the middle)
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      const small = canvas.toDataURL('image/jpeg', 0.72);
      if (small.length <= PHOTO_MAX && CARD_IMAGE.test(small)) out[name] = small;
    } catch {
      // left out: the page shows the first name alone
    }
  }
  return out;
}
