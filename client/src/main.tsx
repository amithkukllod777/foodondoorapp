import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import superjson from "superjson";
import App from "./App";
import { initFirebaseAnalytics } from "./lib/firebase";
import { captureFrontendException, initSentry } from "./lib/sentry";
import "./index.css";

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(() => initSentry());
} else {
  setTimeout(() => initSentry(), 0);
}
initFirebaseAnalytics().catch(error => {
  captureFrontendException(error, { source: "firebase-analytics" });
});

const queryClient = new QueryClient();

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    if (error) {
      captureFrontendException(error, {
        source: "react-query",
        type: "query",
        queryHash: event.query.queryHash,
      });
    }
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (error) {
      captureFrontendException(error, {
        source: "react-query",
        type: "mutation",
        mutationKey: event.mutation.options.mutationKey,
      });
    }
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </HelmetProvider>
);
