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
    // Buscar el álbum real en Spotify con el ID que recibimos
    const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!albumResponse.ok) {
      const errorText = await albumResponse.text();
      if (albumResponse.status === 404) {
        return NextResponse.json({ error: 'Álbum no encontrado' }, { status: 404 });
      }
      console.error('Spotify API error:', albumResponse.status, errorText);
      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    const albumData = await albumResponse.json();
    return NextResponse.json(albumData);

  } catch (error) {
    console.error('Error en el backend de Spotify:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}  3