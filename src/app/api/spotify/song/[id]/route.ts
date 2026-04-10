export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSpotifyToken } from '@/utils/spotify';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // En las versiones nuevas de Next.js, params es una Promesa
  const { id } = await context.params;

  try {
    // Obtener token cacheado
    const accessToken = await getSpotifyToken();
    // Buscar el track real en Spotify con el ID que recibimos
    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!trackResponse.ok) {
      const errorText = await trackResponse.text();
      if (trackResponse.status === 404) {
        return NextResponse.json({ error: 'Canción no encontrada' }, { status: 404 });
      }
      console.error('Spotify API error:', trackResponse.status, errorText);
      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    const trackData = await trackResponse.json();
    return NextResponse.json(trackData);

  } catch (error) {
    console.error('Error en el backend de Spotify:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
