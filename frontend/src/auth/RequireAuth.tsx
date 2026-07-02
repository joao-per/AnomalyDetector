// Route guard: only render the app when a user is signed in (Django session
// or Entra SSO). Anonymous visitors land on /login.
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import logo from "@/assets/stiegl-logo.png";
import { useMe } from "@/api/hooks";
import { entraEnabled } from "./entra";

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();

  // With Entra SSO active, MSAL already forced a sign-in at boot.
  if (entraEnabled) return <>{children}</>;

  if (me.isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b0304]">
        <img src={logo} alt="Stiegl" className="h-16 animate-pulse rounded-xl bg-white/95 px-3 py-2" />
      </div>
    );
  }
  if (me.isError) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
