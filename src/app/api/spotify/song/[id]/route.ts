import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // En las versiones nuevas de Next.js, params es una Promesa
  const { id } = await context.params;

  try {
    // 1. Obtener el token de Spotify (Client Credentials)
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authResponse.json();
    if (!authResponse.ok) {
      throw new Error('Falló la autenticación con Spotify');
    }

    // 2. Buscar el track real en Spotify con el ID que recibimos
    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: {
        Authorization: `Bearer ${authData.access_token}`,
      },
    });

    if (!trackResponse.ok) {
      return NextResponse.json({ error: 'Canción no encontrada' }, { status: 404 });
    }

    const trackData = await trackResponse.json();
    return NextResponse.json(trackData);

  } catch (error) {
    console.error('Error en el backend de Spotify:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
