/**
 * Pictures made by the app (Jogador do jogo, parabéns): loading the images that may go in them and sharing the result
 * through the phone's share sheet (WhatsApp…), or downloading it where sharing is not available (computers).
 */

/** Only images that are already in the app (data URLs) can go into a picture: other links block the export. */
export const loadDataImage = (src?: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!src || !src.startsWith('data:image/')) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Shares (or downloads) the canvas as a PNG. Returns what happened, for the message to the coach. */
export async function shareCanvasImage(
  canvas: HTMLCanvasElement,
  fileName: string,
  text: string
): Promise<'shared' | 'downloaded' | 'cancelled' | 'error'> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return 'error';
  const file = new File([blob], fileName, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return 'cancelled';
  }
  // Computers and browsers without sharing: download the picture
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
