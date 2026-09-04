import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";
import { UserRole } from "@/types/database";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, email, password, role } = body as {
      full_name: string;
      email: string;
      password?: string;
      role: UserRole;
    };

    if (!full_name || !email) {
      return NextResponse.json(
        { error: "Full name and email are required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Supabase service role is not configured on the server." },
        { status: 500 }
      );
    }

    const defaultPerms = DEFAULT_PERMISSIONS_BY_ROLE[role || "user"];

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: password || "TempPassword123!",
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: role || "user",
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Ensure profile is present in public.profiles
    const { data: profile, error: profError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        full_name: full_name.trim(),
        email: email.trim(),
        role: role || "user",
        permissions: defaultPerms,
        status: "Active",
      })
      .select()
      .single();

    if (profError) {
      return NextResponse.json(
        { error: `User created in Auth, but profile sync failed: ${profError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
