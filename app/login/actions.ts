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

  // Sign up the user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  })

  if (signUpError) {
    throw new Error(signUpError.message)
  }

  if (!authData.user) {
    throw new Error('Failed to create user')
  }

  // The profile will be automatically created by the database trigger
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
