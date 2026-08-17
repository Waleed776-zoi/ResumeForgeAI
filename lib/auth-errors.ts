/**
 * Supabase auth errors are terse ("email rate limit exceeded") and give no
 * hint about cause or remedy. Each of these is a real message GoTrue returns,
 * rewritten to say what happened and what to do next.
 */
export function describeAuthError(error: {
  message: string;
  status?: number;
  code?: string;
}): string {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();

  if (
    code === "over_email_send_rate_limit" ||
    message.includes("email rate limit") ||
    message.includes("rate limit exceeded")
  ) {
    return "Supabase's built-in email service only sends a couple of sign-in emails per hour, per project — and it's shared across every address, so this isn't specific to you. Either wait for the hour to roll over, or connect your own SMTP provider to remove the cap (Supabase → Project Settings → Authentication → SMTP Settings).";
  }

  if (code === "over_request_rate_limit") {
    return "Too many sign-in attempts in a short window. Wait a minute and try again.";
  }

  // Supabase reports every SMTP-side failure with this one generic sentence,
  // which hides the actual cause. The usual culprit by far: a transactional
  // provider still in test mode, where an unverified sending domain may only
  // deliver to the address that owns the provider account — so it works for
  // you and fails for everyone else. The real error text is in Supabase's
  // Auth logs.
  if (
    message.includes("error sending") ||
    code === "unexpected_failure" ||
    code === "email_provider_disabled"
  ) {
    return "The email couldn't be sent — this is a mail-provider problem, not a problem with your address. If your SMTP provider is still using an unverified test sender, it will only deliver to the account owner's own inbox. Verify a sending domain (or a single sender address) with your provider, then try again. The underlying error is in Supabase → Logs → Auth Logs.";
  }

  if (message.includes("invalid email") || code === "validation_failed") {
    return "That doesn't look like a valid email address.";
  }

  if (code === "signup_disabled" || message.includes("signups not allowed")) {
    return "This project isn't accepting new sign-ups. Enable them in Supabase → Authentication → Sign In / Providers.";
  }

  if (message.includes("redirect") && message.includes("not allowed")) {
    return "Supabase refused this app's redirect URL. Add it under Authentication → URL Configuration → Redirect URLs.";
  }

  return error.message;
}
