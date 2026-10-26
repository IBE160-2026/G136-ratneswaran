import { NextResponse, type NextRequest } from "next/server";
import { limit } from "@/lib/limit";
import { INVITE_COOKIE } from "@/modules/events/invite";
import { inviteTokenSchema } from "@/modules/events/schemas";

/**
 * The invite link (FR-1, AD-4). GET changes no state, so link scanners are harmless: it only swaps the
 * token for an httpOnly cookie and sends the browser on to the token-free /invite. Referrer-Policy comes
 * from next.config.ts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const refused = await limit("invite", { token }, "invite.errors");
  if (refused) {
    const reason = refused.error.code === "rate_limited" ? "rateLimited" : "unavailable";
    return NextResponse.redirect(new URL(`/invite?error=${reason}`, request.url));
  }
  const response = NextResponse.redirect(new URL("/invite", request.url));
  // A malformed token can never match, so it gets no cookie and /invite shows the used text.
  if (inviteTokenSchema.safeParse(token).success) {
    response.cookies.set(INVITE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV !== "development",
      path: "/",
      maxAge: 3600,
    });
  } else {
    response.cookies.delete(INVITE_COOKIE);
  }
  return response;
}
