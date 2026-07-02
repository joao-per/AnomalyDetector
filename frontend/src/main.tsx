import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initAuth } from "./auth/entra";
import { I18nProvider } from "./i18n/i18n";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

// Entra SSO sign-in first (no-op without VITE_ENTRA_* config). If the login
// redirect kicks in, the page navigates away before render() runs.
initAuth()
  .catch((e) => console.error("Entra sign-in failed:", e))
  .finally(render);
