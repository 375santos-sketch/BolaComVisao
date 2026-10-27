import { compressImageSource } from './imageCompress';

/**
 * The club's look on this phone (entrance screen and colour before the club's data loads): name, main colour and a
 * small copy of the symbol, kept after each visit. Only what any visitor of the club sees (no athletes' data).
 * Also the "modo compacto" preference of this phone.
 */

const BRAND_KEY = 'bcv_club_brand_v1';
const COMPACT_KEY = 'bcv_compact_v1';

interface ClubBrand {
  name?: string;
  color?: string;
  logo?: string;
}

export function loadBrand(): ClubBrand {
  try {
    const raw = JSON.parse(localStorage.getItem(BRAND_KEY) || '{}') as ClubBrand;
    return {
      name: typeof raw.name === 'string' ? raw.name.slice(0, 80) : undefined,
      color: typeof raw.color === 'string' ? raw.color : undefined,
      logo: typeof raw.logo === 'string' && raw.logo.startsWith('data:image/') ? raw.logo : undefined
    };
  } catch {
    return {};
  }
}

const sameBrand = (a: ClubBrand, b: ClubBrand) => a.name === b.name && a.color === b.color && a.logo === b.logo;

let lastLogoSource: string | undefined;
let lastLogoSmall: string | undefined;

/** Keeps the club's look (the symbol shrunk to about 25 KB, so it never fills the phone's storage). */
export async function saveBrand(brand: { name?: string; color?: string; logoSource?: string }) {
  let logo: string | undefined;
  if (brand.logoSource?.startsWith('data:image/')) {
    if (brand.logoSource === lastLogoSource) logo = lastLogoSmall;
    else {
      try {
        logo = await compressImageSource(brand.logoSource, 160, 25_000);
      } catch {
        logo = undefined;
      }
      lastLogoSource = brand.logoSource;
      lastLogoSmall = logo;
    }
  }
  const next: ClubBrand = { name: brand.name?.trim() || undefined, color: brand.color, logo };
  if (sameBrand(next, loadBrand())) return;
  try {
    localStorage.setItem(BRAND_KEY, JSON.stringify(next));
  } catch {
    // Storage full: the entrance screen just shows the app's own look
  }
}

export function loadCompact(): boolean {
  try {
    return localStorage.getItem(COMPACT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Turns "modo compacto" on or off on this phone (smaller spacing and text across the app). */
export function applyCompact(on: boolean, save = true) {
  document.documentElement.classList.toggle('compact', on);
  if (!save) return;
  try {
    if (on) localStorage.setItem(COMPACT_KEY, '1');
    else localStorage.removeItem(COMPACT_KEY);
  } catch {
    // Not saved: it stays on until the app is closed
  }
}
