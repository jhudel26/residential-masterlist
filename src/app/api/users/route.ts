import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";
import { CreateUserSchema } from "@/lib/validations/schemas";
import { getErrorMessage } from "@/lib/error-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { applySecurityHeaders, applyCorsHeaders } from "@/lib/security/api-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Rate Limiting Check (10 user creation requests per minute per IP)
  const clientIp = getClientIp(request.headers);
  const limiter = rateLimit(`user-create:${clientIp}`, { limit: 10, windowMs: 60 * 1000 });

  const headers = new Headers({
    "X-RateLimit-Limit": String(limiter.limit),
    "X-RateLimit-Remaining": String(limiter.remaining),
    "X-RateLimit-Reset": String(limiter.reset),
  });

  if (!limiter.allowed) {
    headers.set("Retry-After", String(limiter.retryAfterSeconds || 60));
    const response = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers }
    );
    applySecurityHeaders(response);
    applyCorsHeaders(response, request);
    return response;
  }

  try {
    const rawBody = await request.json();

    // 2. Strict Zod Validation (ensures valid email, full name, and strong password)
    const validationResult = CreateUserSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = getErrorMessage(validationResult.error);
      const response = NextResponse.json({ error: errorMsg }, { status: 400, headers });
      applySecurityHeaders(response);
      applyCorsHeaders(response, request);
      return response;
    }

    const { full_name, email, password, role, permissions } = validationResult.data;

    const adminClient = createAdminClient();
    if (!adminClient) {
      logger.error("Supabase admin service role not configured");
      const response = NextResponse.json(
        { error: "Supabase service role is not configured on the server." },
        { status: 500, headers }
      );
      applySecurityHeaders(response);
      applyCorsHeaders(response, request);
      return response;
    }

    const userPermissions = permissions || DEFAULT_PERMISSIONS_BY_ROLE[role || "user"];

    // 3. Create user in Supabase Auth with the explicitly provided strong password
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: role || "user",
      },
    });

    if (authError) {
      logger.warn("Supabase Auth user creation error", { email, message: authError.message });
      const response = NextResponse.json({ error: authError.message }, { status: 400, headers });
      applySecurityHeaders(response);
      applyCorsHeaders(response, request);
      return response;
    }

    const userId = authData.user.id;

    // 4. Ensure profile is present in public.profiles with assigned permissions
    const { data: profile, error: profError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        full_name: full_name.trim(),
        email: email.trim(),
        role: role || "user",
        permissions: userPermissions,
        status: "Active",
      })
      .select()
      .single();

    if (profError) {
      logger.error("Profile sync failed after auth user creation", { userId, error: profError.message });
      const response = NextResponse.json(
        { error: `User created in Auth, but profile sync failed: ${profError.message}` },
        { status: 500, headers }
      );
      applySecurityHeaders(response);
      applyCorsHeaders(response, request);
      return response;
    }

    logger.info("Successfully created user account", { userId, email, role });
    const response = NextResponse.json({ success: true, profile }, { status: 201, headers });
    applySecurityHeaders(response);
    applyCorsHeaders(response, request);
    return response;
  } catch (err: unknown) {
    const errorMsg = getErrorMessage(err);
    logger.error("Unexpected error in /api/users route", {}, err);
    const response = NextResponse.json({ error: errorMsg }, { status: 500, headers });
    applySecurityHeaders(response);
    applyCorsHeaders(response, request);
    return response;
  }
}