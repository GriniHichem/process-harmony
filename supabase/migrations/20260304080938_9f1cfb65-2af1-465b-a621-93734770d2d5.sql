
-- =====================================================
-- ISO 9001 Quality Management System - Complete Schema
-- =====================================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('rmq', 'responsable_processus', 'consultant', 'auditeur');
CREATE TYPE public.process_type AS ENUM ('pilotage', 'realisation', 'support');
CREATE TYPE public.process_status AS ENUM ('brouillon', 'en_validation', 'valide', 'archive');
CREATE TYPE public.document_type AS ENUM ('procedure', 'instruction', 'formulaire', 'enregistrement', 'rapport', 'compte_rendu_audit', 'preuve');
CREATE TYPE public.audit_type AS ENUM ('interne', 'externe');
CREATE TYPE public.audit_status AS ENUM ('planifie', 'en_cours', 'termine', 'cloture');
CREATE TYPE public.finding_type AS ENUM ('conformite', 'observation', 'non_conformite_mineure', 'non_conformite_majeure', 'amelioration');
CREATE TYPE public.nc_severity AS ENUM ('mineure', 'majeure', 'critique');
CREATE TYPE public.nc_status AS ENUM ('ouverte', 'en_traitement', 'cloturee');
CREATE TYPE public.action_type AS ENUM ('corrective', 'preventive', 'amelioration');
CREATE TYPE public.action_status AS ENUM ('planifiee', 'en_cours', 'realisee', 'verifiee', 'cloturee', 'en_retard');
CREATE TYPE public.risk_type AS ENUM ('risque', 'opportunite');
CREATE TYPE public.indicator_frequency AS ENUM ('quotidien', 'hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel');

-- 2. UTILITY FUNCTION: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL DEFAULT '',
  prenom TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  fonction TEXT DEFAULT '',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. SECURITY DEFINER FUNCTION: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 6. PROCESSES TABLE
CREATE TABLE public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  type_processus process_type NOT NULL,
  finalite TEXT,
  description TEXT,
  responsable_id UUID REFERENCES auth.users(id),
  parties_prenantes TEXT,
  donnees_entree TEXT,
  donnees_sortie TEXT,
  activites TEXT,
  interactions TEXT,
  ressources TEXT,
  statut process_status NOT NULL DEFAULT 'brouillon',
  version_courante INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- 7. PROCESS VERSIONS TABLE
CREATE TABLE public.process_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  donnees JSONB NOT NULL,
  modifie_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.process_versions ENABLE ROW LEVEL SECURITY;

-- 8. BPMN DIAGRAMS TABLE
CREATE TABLE public.bpmn_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  donnees JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  statut process_status NOT NULL DEFAULT 'brouillon',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bpmn_diagrams ENABLE ROW LEVEL SECURITY;

-- 9. DOCUMENTS TABLE
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL,
  type_document document_type NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  chemin_fichier TEXT,
  nom_fichier TEXT,
  taille_fichier BIGINT,
  version INTEGER NOT NULL DEFAULT 1,
  archive BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 10. INDICATORS TABLE
CREATE TABLE public.indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  formule TEXT,
  unite TEXT,
  cible NUMERIC,
  seuil_alerte NUMERIC,
  frequence indicator_frequency NOT NULL DEFAULT 'mensuel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;

-- 11. INDICATOR VALUES TABLE
CREATE TABLE public.indicator_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  valeur NUMERIC NOT NULL,
  date_mesure DATE NOT NULL,
  commentaire TEXT,
  saisi_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.indicator_values ENABLE ROW LEVEL SECURITY;

-- 12. RISKS & OPPORTUNITIES TABLE
CREATE TABLE public.risks_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  type risk_type NOT NULL,
  description TEXT NOT NULL,
  probabilite INTEGER CHECK (probabilite BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  criticite INTEGER GENERATED ALWAYS AS (probabilite * impact) STORED,
  actions_traitement TEXT,
  statut TEXT NOT NULL DEFAULT 'identifie',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risks_opportunities ENABLE ROW LEVEL SECURITY;

-- 13. AUDITS TABLE
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  type_audit audit_type NOT NULL,
  perimetre TEXT,
  auditeur_id UUID REFERENCES auth.users(id),
  date_audit DATE,
  date_fin DATE,
  statut audit_status NOT NULL DEFAULT 'planifie',
  rapport TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- 14. AUDIT FINDINGS TABLE
CREATE TABLE public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processes(id),
  type_constat finding_type NOT NULL,
  description TEXT NOT NULL,
  preuve TEXT,
  statut nc_status NOT NULL DEFAULT 'ouverte',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

-- 15. NON-CONFORMITIES TABLE
CREATE TABLE public.nonconformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  origine TEXT,
  process_id UUID REFERENCES public.processes(id),
  description TEXT NOT NULL,
  gravite nc_severity NOT NULL,
  statut nc_status NOT NULL DEFAULT 'ouverte',
  date_detection DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nonconformities ENABLE ROW LEVEL SECURITY;

-- 16. ACTIONS TABLE
CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id UUID,
  type_action action_type NOT NULL,
  description TEXT NOT NULL,
  responsable_id UUID REFERENCES auth.users(id),
  echeance DATE,
  statut action_status NOT NULL DEFAULT 'planifiee',
  preuve TEXT,
  commentaire_cloture TEXT,
  date_cloture TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- 17. AUDIT LOGS TABLE
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 18. STORAGE BUCKET FOR DOCUMENTS
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bpmn_diagrams_updated_at BEFORE UPDATE ON public.bpmn_diagrams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_indicators_updated_at BEFORE UPDATE ON public.indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risks_opportunities_updated_at BEFORE UPDATE ON public.risks_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON public.audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audit_findings_updated_at BEFORE UPDATE ON public.audit_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nonconformities_updated_at BEFORE UPDATE ON public.nonconformities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', '')
  );
  -- Auto-assign 'rmq' role to first user, otherwise 'consultant'
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rmq');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consultant');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- PROFILES: authenticated users can read all profiles, update own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_rmq" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- USER_ROLES: all authenticated can read, only rmq can manage
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert_rmq" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "user_roles_update_rmq" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "user_roles_delete_rmq" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- PROCESSES: all authenticated can read, rmq/responsable can manage
CREATE POLICY "processes_select" ON public.processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "processes_insert" ON public.processes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant')
);
CREATE POLICY "processes_update" ON public.processes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR (public.has_role(auth.uid(), 'responsable_processus') AND responsable_id = auth.uid()) OR public.has_role(auth.uid(), 'consultant')
);
CREATE POLICY "processes_delete" ON public.processes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- PROCESS_VERSIONS: all authenticated can read
CREATE POLICY "process_versions_select" ON public.process_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "process_versions_insert" ON public.process_versions FOR INSERT TO authenticated WITH CHECK (true);

-- BPMN_DIAGRAMS: all authenticated can read
CREATE POLICY "bpmn_select" ON public.bpmn_diagrams FOR SELECT TO authenticated USING (true);
CREATE POLICY "bpmn_insert" ON public.bpmn_diagrams FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant')
);
CREATE POLICY "bpmn_update" ON public.bpmn_diagrams FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant')
);
CREATE POLICY "bpmn_delete" ON public.bpmn_diagrams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- DOCUMENTS: all can read, role-based write
CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus')
);
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus')
);
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- INDICATORS: all can read, rmq/responsable can manage
CREATE POLICY "indicators_select" ON public.indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "indicators_insert" ON public.indicators FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus')
);
CREATE POLICY "indicators_update" ON public.indicators FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus')
);
CREATE POLICY "indicators_delete" ON public.indicators FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- INDICATOR_VALUES: all can read, rmq/responsable can insert
CREATE POLICY "indicator_values_select" ON public.indicator_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "indicator_values_insert" ON public.indicator_values FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus')
);

-- RISKS: all can read, rmq/responsable can manage
CREATE POLICY "risks_select" ON public.risks_opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "risks_insert" ON public.risks_opportunities FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant')
);
CREATE POLICY "risks_update" ON public.risks_opportunities FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant')
);
CREATE POLICY "risks_delete" ON public.risks_opportunities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- AUDITS: all can read, rmq/auditeur can manage
CREATE POLICY "audits_select" ON public.audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "audits_insert" ON public.audits FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur')
);
CREATE POLICY "audits_update" ON public.audits FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur')
);
CREATE POLICY "audits_delete" ON public.audits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- AUDIT_FINDINGS: all can read, rmq/auditeur can manage
CREATE POLICY "findings_select" ON public.audit_findings FOR SELECT TO authenticated USING (true);
CREATE POLICY "findings_insert" ON public.audit_findings FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur')
);
CREATE POLICY "findings_update" ON public.audit_findings FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur')
);

-- NONCONFORMITIES: all can read, rmq/responsable can manage
CREATE POLICY "nc_select" ON public.nonconformities FOR SELECT TO authenticated USING (true);
CREATE POLICY "nc_insert" ON public.nonconformities FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'auditeur')
);
CREATE POLICY "nc_update" ON public.nonconformities FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus')
);

-- ACTIONS: all can read, most roles can create
CREATE POLICY "actions_select" ON public.actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "actions_insert" ON public.actions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'auditeur')
);
CREATE POLICY "actions_update" ON public.actions FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR (public.has_role(auth.uid(), 'auditeur'))
);

-- AUDIT_LOGS: only rmq can read, system inserts
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'rmq')
);
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- STORAGE POLICIES
CREATE POLICY "documents_storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus')
  )
);
CREATE POLICY "documents_storage_update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus')
  )
);
CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'documents' AND public.has_role(auth.uid(), 'rmq')
);

-- INDEXES
CREATE INDEX idx_processes_type ON public.processes(type_processus);
CREATE INDEX idx_processes_statut ON public.processes(statut);
CREATE INDEX idx_processes_responsable ON public.processes(responsable_id);
CREATE INDEX idx_documents_process ON public.documents(process_id);
CREATE INDEX idx_indicators_process ON public.indicators(process_id);
CREATE INDEX idx_indicator_values_indicator ON public.indicator_values(indicator_id);
CREATE INDEX idx_risks_process ON public.risks_opportunities(process_id);
CREATE INDEX idx_audit_findings_audit ON public.audit_findings(audit_id);
CREATE INDEX idx_nonconformities_process ON public.nonconformities(process_id);
CREATE INDEX idx_actions_source ON public.actions(source_type, source_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
