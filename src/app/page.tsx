'use client'
import { createClient } from '@/utils/supabase/client' // We will create this file next

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-8">Simple Ledger</h1>
      <button 
        onClick={handleLogin}
        className="px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
        Sign in with Google
      </button>
    </div>
  )
}