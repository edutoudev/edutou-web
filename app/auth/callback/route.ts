import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Helper function to get redirect URL based on role
function getRedirectUrl(role: string | undefined, origin: string): string {
  const normalizedRole = role?.toLowerCase()

  switch (normalizedRole) {
    case 'admin':
      return new URL('/admin', origin).toString()
    case 'mentor':
      return new URL('/mentor', origin).toString()
    default:
      return new URL('/', origin).toString()
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  try {
    const supabase = await createClient()

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Error getting user:', userError)
      return NextResponse.redirect(new URL('/login?error=no_user', requestUrl.origin))
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, create one with default role 'student'
    if (profileError?.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role: 'student',
        })

      if (insertError) {
        console.error('Error creating profile:', insertError)
      }

      return NextResponse.redirect(new URL('/', requestUrl.origin))
    }

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.redirect(new URL('/', requestUrl.origin))
    }

    return NextResponse.redirect(getRedirectUrl(profile?.role, requestUrl.origin))
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(new URL('/login?error=unexpected', requestUrl.origin))
  }
}
