import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/modules/auth/schemas";

/** Finishes a provider sign-in or link (AD-6); a sign-in error lands on `/login?oauth=<reason>`, a link error on `/profile?link=<reason>`. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = request.cookies.get("oauth_next")?.value;
  const to = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.cookies.delete("oauth_next");
    return response;
  };
  // A link attempt started on /profile; anything else is a sign-in.
  const fail = (reason: "cancelled" | "unverified" | "failed") =>
    next
      ? to(`${safeNext(next)}?link=${reason === "unverified" ? "failed" : reason}`)
      : to(`/login?oauth=${reason}`);
  const providerError = params.get("error");
  if (providerError) {
    const description = (params.get("error_description") ?? "").toLowerCase();
    if (/unverified|not verified/.test(description)) return fail("unverified");
    return fail(providerError === "access_denied" ? "cancelled" : "failed");
  }
  const code = params.get("code");
  if (!code) return fail("failed");
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? fail("failed") : to(safeNext(next));
}
