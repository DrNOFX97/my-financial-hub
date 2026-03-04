import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Faturas from "./pages/Faturas";
import GastosMensais from "./pages/GastosMensais";
import Extrato from "./pages/Extrato";
import Graficos from "./pages/Graficos";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/faturas" element={<Faturas />} />
            <Route path="/gastos-mensais" element={<GastosMensais />} />
            <Route path="/extrato" element={<Extrato />} />
            <Route path="/graficos" element={<Graficos />} />
            <Route path="/receitas" element={<Placeholder title="Receitas" />} />
            <Route path="/despesas" element={<Placeholder title="Despesas" />} />
            <Route path="/calendario" element={<Placeholder title="Calendário" />} />
            <Route path="/relatorios" element={<Placeholder title="Relatórios" />} />
            <Route path="/definicoes" element={<Placeholder title="Definições" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
