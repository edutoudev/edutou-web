import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Authenticated user:', user.id)

    // Check if user is admin or mentor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      )
    }

    console.log('User role:', profile?.role)

    if (!profile || !['admin', 'mentor', 'coursemaster'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin/Mentor access required' },
        { status: 403 }
      )
    }

    // Get request body
    const { title, message, targetAudience = 'all_students' } = await request.json()

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    console.log('Broadcasting notification:', { title, targetAudience })

    // Get all students (or target audience)
    let query = supabase.from('profiles').select('id')

    if (targetAudience === 'all_students') {
      query = query.eq('role', 'student')
    } else if (targetAudience === 'all_mentors') {
      query = query.eq('role', 'mentor')
    } else if (targetAudience === 'all_users') {
      // No filter - all users
    }

    const { data: targetUsers, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching target users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch target users', details: usersError.message },
        { status: 500 }
      )
    }

    console.log(`Found ${targetUsers?.length || 0} target users`)

    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No users found for target audience'
      })
    }

    // Create notification for each user
    const notifications = targetUsers.map(targetUser => ({
      user_id: targetUser.id,
      title: title.trim(),
      message: message.trim(),
      created_by: user.id,
      created_by_role: profile.role,
      is_read: false,
    }))

    console.log(`Creating ${notifications.length} notification records...`)

    // Check if service role key exists
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set!')
      return NextResponse.json(
        {
          error: 'Server configuration error',
          details: 'Service role key is missing. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
        },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set!')
      return NextResponse.json(
        {
          error: 'Server configuration error',
          details: 'Supabase URL is missing.'
        },
        { status: 500 }
      )
    }

    console.log('✅ Environment variables present')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Service role key exists:', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...')

    // Use service role client to bypass RLS for bulk insert
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('✅ Service client created')

    // Insert all notifications using service role
    const { data: insertedNotifications, error: insertError } = await serviceClient
      .from('notifications')
      .insert(notifications)
      .select()

    if (insertError) {
      console.error('Error inserting notifications:', insertError)
      console.error('Insert error details:', JSON.stringify(insertError, null, 2))
      return NextResponse.json(
        { error: 'Failed to create notifications', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully created ${insertedNotifications?.length || 0} notifications`)

    return NextResponse.json({
      success: true,
      count: insertedNotifications?.length || 0,
      message: `Notification sent to ${insertedNotifications?.length || 0} user(s)`
    })

  } catch (error) {
    console.error('Error in broadcast API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
