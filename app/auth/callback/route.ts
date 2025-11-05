import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      const supabase = await createClient()

      // Exchange code for session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
      }

      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('Error getting user:', userError)
        return NextResponse.redirect(new URL('/login?error=no_user', requestUrl.origin))
      }

      // Try to get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, create one with default role 'student'
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: 'student', // Default role for new users
          })

        if (insertError) {
          console.error('Error creating profile:', insertError)
          // Continue anyway, redirect to home
          return NextResponse.redirect(new URL('/', requestUrl.origin))
        }

        // Profile created successfully, redirect to home (student default)
        return NextResponse.redirect(new URL('/', requestUrl.origin))
      } else if (profileError) {
        console.error('Error fetching profile:', profileError)
        // If there's an error but not "not found", redirect to home anyway
        return NextResponse.redirect(new URL('/', requestUrl.origin))
      }

      // Profile exists, redirect based on role
      const role = profile?.role?.toLowerCase()

      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', requestUrl.origin))
      } else if (role === 'mentor') {
        return NextResponse.redirect(new URL('/mentor', requestUrl.origin))
      } else {
        // Default redirect for student or null role
        return NextResponse.redirect(new URL('/', requestUrl.origin))
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(new URL('/login?error=unexpected', requestUrl.origin))
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
