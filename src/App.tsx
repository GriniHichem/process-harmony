import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
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
import GroupesActeurs from "./pages/GroupesActeurs";
import PolitiqueQualite from "./pages/PolitiqueQualite";
import RevueDirection from "./pages/RevueDirection";
import CompetencesPage from "./pages/Competences";
import SatisfactionClient from "./pages/SatisfactionClient";
import Fournisseurs from "./pages/Fournisseurs";
import EvaluationProcessus from "./pages/EvaluationProcessus";
import AdminPermissions from "./pages/AdminPermissions";
import SuperAdmin from "./pages/SuperAdmin";
import SurveyPublicPage from "./pages/SurveyPublicPage";
import Notifications from "./pages/Notifications";
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
          <AppSettingsProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/survey/:token" element={<SurveyPublicPage />} />
              {/* Principal */}
              <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
              <Route path="/acteurs" element={<ProtectedPage><RoleGuard requiredModule="acteurs"><Acteurs /></RoleGuard></ProtectedPage>} />
              {/* Processus */}
              <Route path="/processus" element={<ProtectedPage><RoleGuard requiredModule="processus"><Processus /></RoleGuard></ProtectedPage>} />
              <Route path="/processus/:id" element={<ProtectedPage><RoleGuard requiredModule="processus"><ProcessDetail /></RoleGuard></ProtectedPage>} />
              <Route path="/cartographie" element={<ProtectedPage><RoleGuard requiredModule="cartographie"><Cartographie /></RoleGuard></ProtectedPage>} />
              <Route path="/bpmn" element={<ProtectedPage><RoleGuard requiredModule="bpmn"><Bpmn /></RoleGuard></ProtectedPage>} />
              <Route path="/evaluation-processus" element={<ProtectedPage><RoleGuard requiredModule="evaluation_processus"><EvaluationProcessus /></RoleGuard></ProtectedPage>} />
              {/* Manager processus */}
              <Route path="/documents" element={<ProtectedPage><RoleGuard requiredModule="documents"><Documents /></RoleGuard></ProtectedPage>} />
              <Route path="/indicateurs" element={<ProtectedPage><RoleGuard requiredModule="indicateurs"><Indicateurs /></RoleGuard></ProtectedPage>} />
              <Route path="/risques" element={<ProtectedPage><RoleGuard requiredModule="risques"><Risques /></RoleGuard></ProtectedPage>} />
              <Route path="/incidents" element={<ProtectedPage><RoleGuard requiredModule="incidents"><Incidents /></RoleGuard></ProtectedPage>} />
              <Route path="/enjeux-contexte" element={<ProtectedPage><RoleGuard requiredModule="enjeux_contexte"><EnjeuContexte /></RoleGuard></ProtectedPage>} />
              {/* Pilotage SMQ */}
              <Route path="/politique-qualite" element={<ProtectedPage><RoleGuard requiredModule="politique_qualite"><PolitiqueQualite /></RoleGuard></ProtectedPage>} />
              <Route path="/revue-direction" element={<ProtectedPage><RoleGuard requiredModule="revue_direction"><RevueDirection /></RoleGuard></ProtectedPage>} />
              <Route path="/competences" element={<ProtectedPage><RoleGuard requiredModule="competences"><CompetencesPage /></RoleGuard></ProtectedPage>} />
              <Route path="/satisfaction-client" element={<ProtectedPage><RoleGuard requiredModule="satisfaction_client"><SatisfactionClient /></RoleGuard></ProtectedPage>} />
              <Route path="/fournisseurs" element={<ProtectedPage><RoleGuard requiredModule="fournisseurs"><Fournisseurs /></RoleGuard></ProtectedPage>} />
              {/* Audit & Amélioration */}
              <Route path="/dashboard-audit" element={<ProtectedPage><RoleGuard requiredModule="audits"><DashboardAuditNC /></RoleGuard></ProtectedPage>} />
              <Route path="/audits" element={<ProtectedPage><RoleGuard requiredModule="audits"><Audits /></RoleGuard></ProtectedPage>} />
              <Route path="/non-conformites" element={<ProtectedPage><RoleGuard requiredModule="non_conformites"><NonConformites /></RoleGuard></ProtectedPage>} />
              <Route path="/actions" element={<ProtectedPage><RoleGuard requiredModule="actions"><Actions /></RoleGuard></ProtectedPage>} />
              <Route path="/journal" element={<ProtectedPage><RoleGuard requiredModule="journal"><Journal /></RoleGuard></ProtectedPage>} />
              {/* Administration */}
              <Route path="/utilisateurs" element={<ProtectedPage><RoleGuard requiredModule="utilisateurs"><Utilisateurs /></RoleGuard></ProtectedPage>} />
              <Route path="/groupes-acteurs" element={<ProtectedPage><RoleGuard requiredModule="groupes_acteurs"><GroupesActeurs /></RoleGuard></ProtectedPage>} />
              <Route path="/admin/permissions" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "super_admin"]}><AdminPermissions /></RoleGuard></ProtectedPage>} />
              {/* Notifications */}
              <Route path="/notifications" element={<ProtectedPage><Notifications /></ProtectedPage>} />
              {/* Super Admin */}
              <Route path="/super-admin" element={<ProtectedPage><RoleGuard allowedRoles={["super_admin"]}><SuperAdmin /></RoleGuard></ProtectedPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
