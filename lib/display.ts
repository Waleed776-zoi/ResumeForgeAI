/**
 * Job postings frequently omit the role title, the company, or both — and the
 * parser is instructed never to invent them. Interpolating those straight into
 * the UI produced a bare "·" separator with nothing on either side.
 */
export function applicationTitle(application: {
  role?: string | null;
  company?: string | null;
}): string {
  const parts = [application.role, application.company]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));

  return parts.length > 0 ? parts.join(" · ") : "Untitled application";
}
