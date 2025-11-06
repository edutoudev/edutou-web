'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  if (!authData.user) {
    return { error: 'Failed to authenticate user' }
  }

  // Update profile with last login time and fetch role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({
      last_login_at: new Date().toISOString(),
      email: authData.user.email, // Update email in case it changed
    })
    .eq('id', authData.user.id)
    .select('role')
    .single()

  if (profileError) {
    console.error('Error updating profile on login:', profileError)
    // If profile doesn't exist or update fails, try to fetch it
    const { data: fetchedProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (!fetchedProfile) {
      // Profile doesn't exist, create it
      await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || '',
          role: 'student',
          last_login_at: new Date().toISOString(),
        })
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectTo: '/' }
  }

  revalidatePath('/', 'layout')

  // Return redirect path based on role
  const role = profile?.role?.toLowerCase()

  if (role === 'mentor') {
    return { success: true, redirectTo: '/mentor' }
  } else if (role === 'admin') {
    return { success: true, redirectTo: '/admin' }
  } else {
    return { success: true, redirectTo: '/' }
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('name') as string

  // Sign up the user without email confirmation
  // The database trigger (on_auth_user_created) will automatically create a profile
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      // Disable email confirmation
      emailRedirectTo: undefined,
    }
  })

  if (signUpError) {
    return { error: signUpError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // Wait a moment for the database trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 500))

  // Update the auto-created profile with last_login_at and full data
  const { data: profile, error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      email: email,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', authData.user.id)
    .select('role')
    .single()

  if (updateError) {
    console.error('Error updating profile after signup:', updateError)

    // If update failed, profile might not exist yet, try to create it manually
    const { data: createdProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: 'student',
        last_login_at: new Date().toISOString(),
      })
      .select('role')
      .single()

    if (insertError) {
      console.error('Error creating profile manually:', insertError)
      revalidatePath('/', 'layout')
      return { success: true, redirectTo: '/' }
    }

    revalidatePath('/', 'layout')
    const role = createdProfile?.role?.toLowerCase()

    if (role === 'mentor') {
      return { success: true, redirectTo: '/mentor' }
    } else if (role === 'admin') {
      return { success: true, redirectTo: '/admin' }
    } else {
      return { success: true, redirectTo: '/' }
    }
  }

  revalidatePath('/', 'layout')

  // Return redirect path based on role
  const role = profile?.role?.toLowerCase()

  if (role === 'mentor') {
    return { success: true, redirectTo: '/mentor' }
  } else if (role === 'admin') {
    return { success: true, redirectTo: '/admin' }
  } else {
    return { success: true, redirectTo: '/' }
  }
}
