// src/app/auth/callback/route.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Default to dashboard if no 'next' param is provided
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 1. Exchange the temporary code for a session
    // This is where the long-lived refresh token is set in the cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 2. Strict check: Does the profile exist?
        // We check this here to handle the "Auto-login" experience correctly for new vs returning users
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle() 

        if (!profile) {
          // If no profile exists, they must go to onboarding even if the session is valid
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
      
      // 3. Successful login for returning user: Send to Dashboard
      // The cookies set by exchangeCodeForSession will keep them logged in for 20 days
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to the login page if something went wrong
  return NextResponse.redirect(`${origin}/`)
}