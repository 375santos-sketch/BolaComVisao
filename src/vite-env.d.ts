/// <reference types="vite/client" />

/** P1-01: the id of this build (vite.config.ts), used to register the service worker of this version. */
declare const __BCV_BUILD__: string;

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
