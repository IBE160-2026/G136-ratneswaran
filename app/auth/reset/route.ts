import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchanges the recovery code for a session (AD-6); a bad or used code goes back to the request form. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createClient();
  const { error } = code ? await supabase.auth.exchangeCodeForSession(code) : { error: true };
  return NextResponse.redirect(
    new URL(error ? "/forgot-password?expired=1" : "/reset-password", request.url),
  );
}
