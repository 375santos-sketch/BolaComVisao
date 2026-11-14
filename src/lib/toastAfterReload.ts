/** A short message to show once after the app starts again (it reloads after signing out or losing access). */
const KEY = 'bcv-toast-after-reload';

export function toastAfterReload(message: string): void {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // Storage unavailable: the message is simply not shown
  }
}

export function takeToastAfterReload(): string | null {
  try {
    const message = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return message;
  } catch {
    return null;
  }
}
