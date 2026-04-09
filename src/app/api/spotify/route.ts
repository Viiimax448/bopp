import { NextResponse } from 'next/server'


const ALBUMS = [
  { query: 'Short n Sweet Sabrina Carpenter' },
  { query: 'BRAT Charli xcx' },
  { query: 'The Tortured Poets Department Taylor Swift' },
  { query: "Harry's House Harry Styles" },
]

const TRACKS = [
  { query: 'Good Luck Babe Chappell Roan' },
  { query: 'Not Like Us Kendrick Lamar' },
  { query: 'Birds of a Feather Billie Eilish' },
  { query: 'Espresso Sabrina Carpenter' },
]

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error('Failed to get Spotify token')
  const data = await res.json()
  return data.access_token
}


async function getAlbumData(token: string, query: string) {
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.albums.items[0] || null
}

async function getTrackData(token: string, query: string) {
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.tracks.items[0] || null
}

export async function GET() {
  try {
    const token = await getSpotifyToken();
    const albumResults = await Promise.all(ALBUMS.map(a => getAlbumData(token, a.query)));
    const trackResults = await Promise.all(TRACKS.map(t => getTrackData(token, t.query)));

    // Mezcla álbumes y canciones para los feeds
    const calificacionVeloz = [
      ...albumResults.slice(0, 1).map(album => ({
        id: album?.id,
        title: album?.name,
        artist: album?.artists?.[0]?.name,
        image: album?.images?.[0]?.url,
        spotifyUrl: album?.external_urls?.spotify,
        type: 'album',
      })),
      ...trackResults.slice(0, 3).map(track => ({
        id: track?.id,
        title: track?.name,
        artist: track?.artists?.[0]?.name,
        image: track?.album?.images?.[0]?.url,
        spotifyUrl: track?.external_urls?.spotify,
        type: 'track',
      })),
    ];

    const tendencias = [
      ...albumResults.slice(1, 3).map(album => ({
        id: album?.id,
        title: album?.name,
        artist: album?.artists?.[0]?.name,
        image: album?.images?.[0]?.url,
        spotifyUrl: album?.external_urls?.spotify,
        type: 'album',
      })),
      ...trackResults.slice(3).map(track => ({
        id: track?.id,
        title: track?.name,
        artist: track?.artists?.[0]?.name,
        image: track?.album?.images?.[0]?.url,
        spotifyUrl: track?.external_urls?.spotify,
        type: 'track',
      })),
    ];

    const finalCalificacionVeloz = calificacionVeloz
      .filter(x => x.id && x.title && x.image)
      .slice(0, 4);
    const finalTendencias = tendencias
      .filter(x => x.id && x.title && x.image)
      .slice(0, 4);

    return NextResponse.json({ calificacionVeloz: finalCalificacionVeloz, tendencias: finalTendencias });
  } catch (e) {
    return NextResponse.json({ calificacionVeloz: [], tendencias: [] });
  }
}
