'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    throw new Error(error.message)
  }

  if (!authData.user) {
    throw new Error('Failed to authenticate user')
  }

  // Fetch user role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    // If profile fetch fails, redirect to default home
    revalidatePath('/', 'layout')
    redirect('/')
  }

  revalidatePath('/', 'layout')

  // Redirect based on role
  const role = profile?.role?.toLowerCase()

  if (role === 'mentor') {
    redirect('/mentor')
  } else if (role === 'admin') {
    redirect('/admin')
  } else {
    // Default redirect for student or null role
    redirect('/')
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('name') as string

  // Sign up the user without email confirmation
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
    throw new Error(signUpError.message)
  }

  if (!authData.user) {
    throw new Error('Failed to create user')
  }

  // Try to fetch the profile, if it doesn't exist, create it
  let profile = null
  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts && !profile) {
    // Wait a bit for the database trigger to create the profile
    if (attempts > 0) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const { data: fetchedProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (!profileError && fetchedProfile) {
      profile = fetchedProfile
      break
    }

    // If profile doesn't exist (PGRST116 error), create it manually
    if (profileError && profileError.code === 'PGRST116') {
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
          role: 'student', // Default role
        })
        .select('role')
        .single()

      if (!createError && createdProfile) {
        profile = createdProfile
        break
      } else {
        console.error('Error creating profile:', createError)
      }
    }

    attempts++
  }

  // If still no profile after all attempts, redirect to home with default student role
  if (!profile) {
    console.error('Could not fetch or create profile after multiple attempts')
    revalidatePath('/', 'layout')
    redirect('/')
  }

  revalidatePath('/', 'layout')

  // Redirect based on role
  const role = profile?.role?.toLowerCase()

  if (role === 'mentor') {
    redirect('/mentor')
  } else if (role === 'admin') {
    redirect('/admin')
  } else {
    // Default redirect for student or null role
    redirect('/')
  }
}
