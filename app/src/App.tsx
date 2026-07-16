import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Landing } from "./pages/Landing";
import { NotFound } from "./pages/NotFound";
import { BrandMark } from "./components/BrandMark";

// The app cluster pulls the Stacks/wallet SDK and chart code; split it out so the
// landing at `/` (the public entry) ships without it. These load on "Launch app".
const Layout = lazy(() => import("./components/Layout").then((m) => ({ default: m.Layout })));
const Markets = lazy(() => import("./pages/Markets").then((m) => ({ default: m.Markets })));
const SeriesDetail = lazy(() => import("./pages/SeriesDetail").then((m) => ({ default: m.SeriesDetail })));
const Portfolio = lazy(() => import("./pages/Portfolio").then((m) => ({ default: m.Portfolio })));
const Admin = lazy(() => import("./pages/Admin").then((m) => ({ default: m.Admin })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 2 } },
});

/** Quiet full-screen hold while an app chunk loads. Motion conveys state only. */
function ChunkFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink">
      <BrandMark className="h-8 w-8 animate-pulse opacity-70" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<ChunkFallback />}>
          <Routes>
            <Route index element={<Landing />} />
            <Route path="app" element={<Layout />}>
              <Route index element={<Markets />} />
              <Route path="series/:id" element={<SeriesDetail />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
