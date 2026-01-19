// import { createBrowserClient } from '@supabase/ssr'

// export function createClient() {
//   // Create a supabase client on the browser with project's credentials.
//   return createBrowserClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//   )
// }


import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // This ensures the session is saved in the browser (localStorage/cookies)
        persistSession: true, 
        // This allows the background refresh based on the 20-day limit set in the dashboard
        autoRefreshToken: true, 
        detectSessionInUrl: true
      }
    }
  )
}