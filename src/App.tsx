import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
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
import DashboardAuditNC from "./pages/DashboardAuditNC";
import EnjeuContexte from "./pages/EnjeuContexte";
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
            {/* Principal - accessible à tous */}
            <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/acteurs" element={<ProtectedPage><Acteurs /></ProtectedPage>} />
            {/* Processus - bloqué pour acteur seul */}
            <Route path="/processus" element={<ProtectedPage><RoleGuard blockedOnlyRoles={["acteur"]}><Processus /></RoleGuard></ProtectedPage>} />
            <Route path="/processus/:id" element={<ProtectedPage><RoleGuard blockedOnlyRoles={["acteur"]}><ProcessDetail /></RoleGuard></ProtectedPage>} />
            <Route path="/cartographie" element={<ProtectedPage><RoleGuard blockedOnlyRoles={["acteur"]}><Cartographie /></RoleGuard></ProtectedPage>} />
            <Route path="/bpmn" element={<ProtectedPage><RoleGuard blockedOnlyRoles={["acteur"]}><Bpmn /></RoleGuard></ProtectedPage>} />
            {/* Manager processus - admin, rmq, responsable_processus, consultant */}
            <Route path="/documents" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "responsable_processus", "consultant"]}><Documents /></RoleGuard></ProtectedPage>} />
            <Route path="/indicateurs" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "responsable_processus", "consultant"]}><Indicateurs /></RoleGuard></ProtectedPage>} />
            <Route path="/risques" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "responsable_processus", "consultant"]}><Risques /></RoleGuard></ProtectedPage>} />
            <Route path="/incidents" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "responsable_processus", "consultant"]}><Incidents /></RoleGuard></ProtectedPage>} />
            <Route path="/enjeux-contexte" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "responsable_processus", "consultant"]}><EnjeuContexte /></RoleGuard></ProtectedPage>} />
            {/* Audit & Amélioration - admin, rmq, auditeur */}
            <Route path="/dashboard-audit" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "auditeur"]}><DashboardAuditNC /></RoleGuard></ProtectedPage>} />
            <Route path="/audits" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "auditeur"]}><Audits /></RoleGuard></ProtectedPage>} />
            <Route path="/non-conformites" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "auditeur"]}><NonConformites /></RoleGuard></ProtectedPage>} />
            <Route path="/actions" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq", "auditeur"]}><Actions /></RoleGuard></ProtectedPage>} />
            <Route path="/journal" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "rmq"]}><Journal /></RoleGuard></ProtectedPage>} />
            {/* Administration - admin uniquement */}
            <Route path="/utilisateurs" element={<ProtectedPage><RoleGuard allowedRoles={["admin"]}><Utilisateurs /></RoleGuard></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
