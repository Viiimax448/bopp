'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../utils/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const redirectAfterAuth = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const emailLocalPart = (user.email ?? "").split("@")[0] ?? "";
      const suggestedFromEmail = emailLocalPart
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 20);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      // Si el backend autogenera username desde el email, tratamos eso como "no completado".
      if (profileError || !profile?.username || profile.username === suggestedFromEmail) {
        router.push('/onboarding');
        return;
      }
      router.push('/feed');
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        redirectAfterAuth();
      }
    });

    // Fallback: si ya hay sesión cuando monta
    redirectAfterAuth();

    // Cleanup
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [router])

  return <div className="p-8 text-center">Autenticando...</div>
}
