import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Processus from "./pages/Processus";
import ProcessDetail from "./pages/ProcessDetail";
import Cartographie from "./pages/Cartographie";
import Bpmn from "./pages/Bpmn";
import Documents from "./pages/Documents";
import Indicateurs from "./pages/Indicateurs";
import Risques from "./pages/Risques";
import Audits from "./pages/Audits";
import NonConformites from "./pages/NonConformites";
import Actions from "./pages/Actions";
import Journal from "./pages/Journal";
import Utilisateurs from "./pages/Utilisateurs";
import Acteurs from "./pages/Acteurs";
import Incidents from "./pages/Incidents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/processus" element={<ProtectedPage><Processus /></ProtectedPage>} />
            <Route path="/processus/:id" element={<ProtectedPage><ProcessDetail /></ProtectedPage>} />
            <Route path="/cartographie" element={<ProtectedPage><Cartographie /></ProtectedPage>} />
            <Route path="/bpmn" element={<ProtectedPage><Bpmn /></ProtectedPage>} />
            <Route path="/documents" element={<ProtectedPage><Documents /></ProtectedPage>} />
            <Route path="/indicateurs" element={<ProtectedPage><Indicateurs /></ProtectedPage>} />
            <Route path="/risques" element={<ProtectedPage><Risques /></ProtectedPage>} />
            <Route path="/audits" element={<ProtectedPage><Audits /></ProtectedPage>} />
            <Route path="/non-conformites" element={<ProtectedPage><NonConformites /></ProtectedPage>} />
            <Route path="/actions" element={<ProtectedPage><Actions /></ProtectedPage>} />
            <Route path="/journal" element={<ProtectedPage><Journal /></ProtectedPage>} />
            <Route path="/utilisateurs" element={<ProtectedPage><Utilisateurs /></ProtectedPage>} />
            <Route path="/acteurs" element={<ProtectedPage><Acteurs /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
