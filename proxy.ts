import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

export const proxy = (request: NextRequest) => refreshSession(request);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
