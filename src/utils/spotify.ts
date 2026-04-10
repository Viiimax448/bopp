// src/utils/spotify.ts
// Utilidad para obtener y cachear el access_token de Spotify

let cachedToken: string | null = null;
let tokenExpiration = 0;

export async function getSpotifyToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiration) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Faltan credenciales de Spotify');
  }

  const authResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const authData = await authResponse.json();
  if (!authResponse.ok) {
    throw new Error(`Error autenticando con Spotify: ${authData.error_description || authData.error || 'Desconocido'}`);
  }

  cachedToken = authData.access_token || '';
  // expires_in viene en segundos, restamos 60s para margen
  tokenExpiration = Date.now() + (authData.expires_in * 1000) - 60000;
  return cachedToken || '';
}
