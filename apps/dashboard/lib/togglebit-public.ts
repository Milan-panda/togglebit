/**
 * Client-side Togglebit wiring. The dashboard loads env from the monorepo root,
 * so `NEXT_PUBLIC_*` can be managed centrally in `/.env`.
 *
 * End users only need NEXT_PUBLIC_TOGGLEBIT_API_KEY (and env). Base URL is optional
 * when using the default hosted API (see SDK default in togglebit package).
 */
export function isTogglebitPublicConfigured(): boolean {
  const k = process.env.NEXT_PUBLIC_TOGGLEBIT_API_KEY
  return typeof k === 'string' && k.trim().length > 0
}
