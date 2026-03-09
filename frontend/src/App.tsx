import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Faturas from "./pages/Faturas";
import GastosMensais from "./pages/GastosMensais";
import Extrato from "./pages/Extrato";
import Graficos from "./pages/Graficos";
import Upload from "./pages/Upload";
import Receitas from "./pages/Receitas";
import Despesas from "./pages/Despesas";
import Calendario from "./pages/Calendario";
import Relatorios from "./pages/Relatorios";
import Definicoes from "./pages/Definicoes";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AuthSuccess from "./pages/AuthSuccess";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppContent = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/auth/success" element={<AuthSuccess />} />

    <Route path="/*" element={
      <ProtectedRoute>
        <AppLayout>
          <Routes>
            <Route index element={<Index />} />
            <Route path="faturas" element={<Faturas />} />
            <Route path="gastos-mensais" element={<GastosMensais />} />
            <Route path="extrato" element={<Extrato />} />
            <Route path="upload" element={<Upload />} />
            <Route path="graficos" element={<Graficos />} />
            <Route path="receitas" element={<Receitas />} />
            <Route path="despesas" element={<Despesas />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="definicoes" element={<Definicoes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </ProtectedRoute>
    } />

    {/* Fallback para rotas não encontradas fora do layout */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
