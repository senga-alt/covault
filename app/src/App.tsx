import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Markets } from "./pages/Markets";
import { SeriesDetail } from "./pages/SeriesDetail";
import { Portfolio } from "./pages/Portfolio";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 2 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Markets />} />
            <Route path="series/:id" element={<SeriesDetail />} />
            <Route path="portfolio" element={<Portfolio />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
