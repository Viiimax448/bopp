export const getURL = () => {
  // Prefer the actual browser URL when available
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    return origin.endsWith('/') ? origin : `${origin}/`
  }

  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ??
    process?.env?.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000/'

  url = url.includes('http') ? url : `https://${url}`
  url = url.endsWith('/') ? url : `${url}/`
  return url
}
