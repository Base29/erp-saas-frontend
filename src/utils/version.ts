/**
 * Application version determined from latest git tag or environment
 */
export const APP_VERSION: string =
  (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) ||
  import.meta.env.VITE_APP_VERSION ||
  'v0.2.7'
