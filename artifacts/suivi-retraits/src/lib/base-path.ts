// Base path the app is mounted under (artifact routing prefix), stripped of any
// trailing slash so it can be concatenated directly with routes like `/sign-in`.
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}
