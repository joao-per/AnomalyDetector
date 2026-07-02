// Entra ID SSO via MSAL (Phase 2).
//
// Activated when all three VITE_ENTRA_* vars are set; the app then signs the
// user in with a redirect flow on boot and the API client sends the acquired
// access token as `Authorization: Bearer …`. Without the config the app stays
// in Phase-1 mode (X-User-Email header from VITE_USER_EMAIL) — local dev.
import {
  PublicClientApplication,
  type AccountInfo,
} from "@azure/msal-browser";

const CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID ?? "";
const TENANT_ID = import.meta.env.VITE_ENTRA_TENANT_ID ?? "";
const API_SCOPE = import.meta.env.VITE_ENTRA_API_SCOPE ?? "";
const DEV_USER_EMAIL = import.meta.env.VITE_USER_EMAIL ?? "";

export const entraEnabled = Boolean(CLIENT_ID && TENANT_ID && API_SCOPE);

let pca: PublicClientApplication | null = null;

/** Boot-time sign-in. May navigate away (loginRedirect) on first visit. */
export async function initAuth(): Promise<void> {
  if (!entraEnabled) return;
  pca = new PublicClientApplication({
    auth: {
      clientId: CLIENT_ID,
      authority: `https://login.microsoftonline.com/${TENANT_ID}`,
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: "sessionStorage" },
  });
  await pca.initialize();

  const redirectResult = await pca.handleRedirectPromise();
  if (redirectResult?.account) pca.setActiveAccount(redirectResult.account);

  if (!pca.getActiveAccount()) {
    const existing = pca.getAllAccounts()[0];
    if (existing) pca.setActiveAccount(existing);
    else await pca.loginRedirect({ scopes: [API_SCOPE] });
  }
}

/** Access token for the BFF; falls back to a redirect if silent renewal fails. */
export async function getAccessToken(): Promise<string | null> {
  if (!entraEnabled || !pca) return null;
  const account = pca.getActiveAccount();
  if (!account) return null;
  try {
    const res = await pca.acquireTokenSilent({ scopes: [API_SCOPE], account });
    return res.accessToken;
  } catch {
    await pca.acquireTokenRedirect({ scopes: [API_SCOPE], account });
    return null; // page navigates away
  }
}

export function currentAccount(): AccountInfo | null {
  return pca?.getActiveAccount() ?? null;
}

/** The acting user's email in either mode — for display (From:, header chip). */
export function activeUserEmail(): string {
  if (entraEnabled) return currentAccount()?.username ?? "";
  return DEV_USER_EMAIL;
}

export function signOut(): void {
  void pca?.logoutRedirect();
}
