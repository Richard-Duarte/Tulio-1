import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
    // Preloaded routes (hover/touch intent + idle prefetch after the intro) stay fresh for
    // 5 minutes, matching the query staleTime, so warmed pages open without refetching.
    defaultPreloadStaleTime: 5 * 60_000,
    defaultPreloadGcTime: 30 * 60_000,
    defaultStaleTime: 60_000,
    defaultGcTime: 30 * 60_000,
    defaultPendingMs: 2000,
  });

  return router;
};
