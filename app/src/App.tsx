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

// Docs cluster: its own shell, split from both the landing and the app.
const DocsLayout = lazy(() => import("./docs/DocsLayout").then((m) => ({ default: m.DocsLayout })));
const DocsIntroduction = lazy(() => import("./docs/pages/Introduction").then((m) => ({ default: m.Introduction })));
const DocsQuickstart = lazy(() => import("./docs/pages/Quickstart").then((m) => ({ default: m.Quickstart })));
const DocsLifecycle = lazy(() => import("./docs/pages/Lifecycle").then((m) => ({ default: m.Lifecycle })));
const DocsSettlement = lazy(() => import("./docs/pages/Settlement").then((m) => ({ default: m.Settlement })));
const DocsFees = lazy(() => import("./docs/pages/Fees").then((m) => ({ default: m.Fees })));
const DocsContract = lazy(() => import("./docs/pages/Contract").then((m) => ({ default: m.Contract })));
const DocsErrors = lazy(() => import("./docs/pages/Errors").then((m) => ({ default: m.Errors })));

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
            <Route path="docs" element={<DocsLayout />}>
              <Route index element={<DocsIntroduction />} />
              <Route path="quickstart" element={<DocsQuickstart />} />
              <Route path="lifecycle" element={<DocsLifecycle />} />
              <Route path="settlement" element={<DocsSettlement />} />
              <Route path="fees" element={<DocsFees />} />
              <Route path="contract" element={<DocsContract />} />
              <Route path="errors" element={<DocsErrors />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
