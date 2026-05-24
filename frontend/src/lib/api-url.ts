export function getBackendApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configuredUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is missing. Add it to frontend/.env.local.');
  }

  const baseUrl = configuredUrl.replace(/\/+$/, '');
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

export const BACKEND_API_URL = getBackendApiUrl();
