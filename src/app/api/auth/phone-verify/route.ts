import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { user_json_url } = await request.json();

  try {
    // 1. Fetch the verified data from phone.email
    const response = await fetch(user_json_url);
    const userData = await response.json();
    const phoneNumber = userData.user_phone_number; // e.g., "+919876543210"

    // 2. Strict check: Ensure it's an Indian number
    if (!phoneNumber.startsWith('+91')) {
      return NextResponse.json({ error: "Only Indian phone numbers are allowed" }, { status: 400 });
    }

    // 3. Initialize Supabase Admin (using Service Role Key)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 4. Find or Create User in Supabase
    let targetUser;
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      phone: phoneNumber,
      phone_confirm: true,
      user_metadata: { full_phone: phoneNumber }
    });

    if (createdUser?.user) {
      targetUser = createdUser.user;
    } else if (createUserError?.message.includes('already registered')) {
      // User exists — fetch their details
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
      targetUser = usersList.users.find(u => u.phone === phoneNumber);
    }

    if (!targetUser) {
      throw new Error("Could not identify or create user");
    }

    // 5. Check if profile exists in the 'profiles' table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', targetUser.id)
      .maybeSingle();

    // 6. Determine redirect destination
    const destination = profile ? '/dashboard' : '/onboarding';

    return NextResponse.json({
      success: true,
      phoneNumber,
      redirectUrl: destination
    });

  } catch (err: any) {
    console.error('Phone verification error:', err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}