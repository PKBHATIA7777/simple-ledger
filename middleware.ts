import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Fix: Extract properties to match Next.js expectations
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // Fix: Provide an empty string as value for removal
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // This refreshed the session if it's expired - critical for your 20-day goal
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // 1. If user is logged in and tries to access the login page (/), 
  // redirect them to the dashboard immediately.
  if (user && url.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 2. If user is NOT logged in and tries to access protected routes,
  // redirect them to the login page.
  // Note: Add any other protected paths (like /entities, /products) here
  const protectedPaths = ['/dashboard', '/entities', '/products', '/reports', '/entry']
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}