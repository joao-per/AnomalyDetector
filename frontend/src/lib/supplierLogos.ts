// Maps a supplier (vendor) name to its logo. Names come from Dataverse and vary
// slightly (legal suffixes, spelling), so we match on a stable substring.
import stiegl from "@/assets/stiegl-logo.png";
import rauh from "@/assets/rauh.png";
import krones from "@/assets/krones.jpg";
import drukarnia from "@/assets/drukarnia.jpg";

const LOGOS: { match: RegExp; src: string }[] = [
  { match: /stiegl/i, src: stiegl },
  { match: /rauh/i, src: rauh },
  { match: /krones/i, src: krones },
  { match: /drukarnia|pegwan/i, src: drukarnia },
];

/** Logo URL for a supplier name, or null when we have no logo for it. */
export function supplierLogo(name: string | null | undefined): string | null {
  const n = (name ?? "").trim();
  if (!n) return null;
  for (const { match, src } of LOGOS) if (match.test(n)) return src;
  return null;
}
