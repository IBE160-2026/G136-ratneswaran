import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Finishes a provider sign-in (AD-6); every error lands on `/login?oauth=<reason>` with no session. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const providerError = params.get("error");
  if (providerError) {
    const description = (params.get("error_description") ?? "").toLowerCase();
    if (/unverified|not verified/.test(description)) return to("/login?oauth=unverified");
    return to(providerError === "access_denied" ? "/login?oauth=cancelled" : "/login?oauth=failed");
  }
  const code = params.get("code");
  if (!code) return to("/login?oauth=failed");
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return to(error ? "/login?oauth=failed" : "/events");
}
