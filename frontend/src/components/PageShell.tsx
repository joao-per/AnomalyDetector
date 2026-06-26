import type { ReactNode } from "react";
import beer from "@/assets/beer.png";
import foam from "@/assets/foam.png";
import { AppHeader } from "./AppHeader";

const USER_EMAIL = import.meta.env.VITE_USER_EMAIL ?? "";

/** Shared frame: brand gradient + spilled-beer decoration (left) + header. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#dbdbdb] from-[44%] via-brand-dark via-[90%] to-brand-darker">
      {/* Foam, spilled below the mug */}
      <img
        src={foam}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute left-[-70px] top-[270px] z-0 w-[340px] rotate-[10deg] select-none opacity-95"
      />
      {/* Beer mug, mirrored + tilted as if pouring */}
      <img
        src={beer}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute left-[-25px] top-[60px] z-0 w-[200px] -scale-x-100 rotate-[34deg] select-none drop-shadow-xl"
      />
      <div className="relative z-10 flex h-screen flex-col">
        <AppHeader userEmail={USER_EMAIL} />
        {children}
      </div>
    </div>
  );
}
