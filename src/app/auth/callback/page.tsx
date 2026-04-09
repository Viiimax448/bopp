'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../utils/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/inicio')
      }
    })

    // Cleanup
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [router])

  return <div className="p-8 text-center">Autenticando...</div>
}
