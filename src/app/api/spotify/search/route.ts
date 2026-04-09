import { NextResponse } from 'next/server';

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('Failed to get Spotify token');
  const data = await res.json();
  return data.access_token;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) {
    return NextResponse.json({ error: 'Missing q param' }, { status: 400 });
  }
  try {
    const token = await getSpotifyToken();
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album,track&limit=10`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Spotify API error');
    const data = await res.json();
    // Unificar tracks y albums
    const tracks = (data.tracks?.items || []).map((t: any) => ({
      id: t.id,
      title: t.name,
      artist: t.artists?.[0]?.name || '',
      image: t.album?.images?.[0]?.url || '',
      type: 'track',
      type_label: 'Canción',
      spotifyUrl: t.external_urls?.spotify,
    }));
    const albums = (data.albums?.items || []).map((a: any) => ({
      id: a.id,
      title: a.name,
      artist: a.artists?.[0]?.name || '',
      image: a.images?.[0]?.url || '',
      type: 'album',
      type_label: 'Álbum',
      spotifyUrl: a.external_urls?.spotify,
    }));
    return NextResponse.json({ results: [...tracks, ...albums] });
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching from Spotify' }, { status: 500 });
  }
}
