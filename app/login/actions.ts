'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Helper function to redirect based on user role
async function redirectByRole(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    revalidatePath('/', 'layout')
    redirect('/')
  }

  revalidatePath('/', 'layout')

  const role = profile?.role?.toLowerCase()

  switch (role) {
    case 'mentor':
      redirect('/mentor')
    case 'admin':
      redirect('/admin')
    default:
      redirect('/')
  }
}

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

  await redirectByRole(authData.user.id, supabase)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('name') as string

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
  await redirectByRole(authData.user.id, supabase)
}
