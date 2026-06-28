import { supplierLogo } from "@/lib/supplierLogos";

/**
 * Round supplier "profile picture". Shows the brand logo when we have one,
 * otherwise a colored monogram fallback so every row still has an avatar.
 */
export function SupplierAvatar({
  name,
  className = "h-6 w-6",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const src = supplierLogo(name);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className={`shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-line ${className}`}
      />
    );
  }
  const letter = (name ?? "").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-brand-dark ring-1 ring-black/10 ${className}`}
    >
      {letter}
    </span>
  );
}
