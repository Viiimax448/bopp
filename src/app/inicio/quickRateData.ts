import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { QuickRateItem } from '../../components/QuickRateCarousel';

// Helper para fetch a Spotify con el token del usuario
async function fetchSpotify(endpoint: string, accessToken: string) {
  const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Spotify API error');
  return res.json();
}

export async function getQuickRateItems(userAccessToken: string, userId: string): Promise<QuickRateItem[]> {
  // A: Top tracks del usuario
  const topTracks = await fetchSpotify('me/top/tracks?limit=10', userAccessToken);

  // Unificamos y normalizamos a QuickRateItem
  let items: QuickRateItem[] = [
    ...topTracks.items.map((t: any) => ({
      id: t.id,
      title: t.name,
      artist: t.artists?.[0]?.name || '',
      image: t.album?.images?.[0]?.url || '',
      spotifyUrl: t.external_urls?.spotify,
      type: 'track',
    })),
  ];

  // B: Filtrar los que ya reseñó el usuario
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op: en Server Components, cookies suele ser de solo lectura.
        },
      },
    }
  );
  const { data: reviews } = await supabase
    .from('reviews')
    .select('spotify_id')
    .eq('user_id', userId);
  const reviewedIds = new Set((reviews || []).map((r: any) => r.spotify_id));
  items = items.filter((item) => !reviewedIds.has(item.id));

  // C: Si quedan menos de 5, pedir recomendaciones
  if (items.length < 5) {
    const seeds = items.slice(0, 2).map((i) => i.id).join(',');
    const recs = await fetchSpotify(`recommendations?limit=${5 - items.length}&seed_tracks=${seeds}`, userAccessToken);
    items = [
      ...items,
      ...recs.tracks.map((t: any) => ({
        id: t.id,
        title: t.name,
        artist: t.artists?.[0]?.name || '',
        image: t.album?.images?.[0]?.url || '',
        spotifyUrl: t.external_urls?.spotify,
        type: 'track',
      })),
    ];
  }

  // Solo 5
  return items.slice(0, 5);
}
