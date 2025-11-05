import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options) // ✅ cookie applied on final response
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/error')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const pathname = request.nextUrl.pathname

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role?.toLowerCase()

    if (pathname === '/' && userRole === 'mentor') {
      const url = request.nextUrl.clone()
      url.pathname = '/mentor'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = userRole === 'mentor' ? '/mentor' : '/'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/mentor') && !['admin', 'mentor'].includes(userRole)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response // ✅ always return same response instance
}
