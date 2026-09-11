import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const locale =
    requestUrl.searchParams.get("locale") === "en"
      ? "en"
      : "ar";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=invalid_confirmation`, requestUrl.origin)
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "signup" | "email",
  });

  if (error) {
    console.error("Email confirmation error:", error);

    return NextResponse.redirect(
      new URL(`/${locale}/login?error=confirmation_failed`, requestUrl.origin)
    );
  }

  return NextResponse.redirect(
    new URL(`/${locale}/auth/callback`, requestUrl.origin)
  );
}
