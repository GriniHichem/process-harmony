-- ============================================================
-- 001_complete_schema.sql
-- Migration complète pour Q-Process Self-Hosted (Supabase Docker)
-- Généré le 2026-03-15
-- ============================================================
-- Ce fichier crée TOUT ce qui est nécessaire :
-- 1. Types enum
-- 2. Tables avec contraintes
-- 3. Fonctions (SECURITY DEFINER)
-- 4. Triggers
-- 5. Politiques RLS
-- 6. Buckets de stockage
-- ============================================================

-- ===================== EXTENSIONS =====================
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;

-- ===================== 1. ENUMS =====================

DO $$ BEGIN
  CREATE TYPE public.acteur_type AS ENUM ('interne', 'externe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.action_status AS ENUM ('planifiee', 'en_cours', 'realisee', 'verifiee', 'cloturee', 'en_retard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.action_type AS ENUM ('corrective', 'preventive', 'amelioration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('rmq', 'responsable_processus', 'consultant', 'auditeur', 'admin', 'acteur', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_status AS ENUM ('planifie', 'en_cours', 'termine', 'cloture');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_type AS ENUM ('interne', 'externe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.context_issue_type AS ENUM ('interne', 'externe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_type AS ENUM ('procedure', 'instruction', 'formulaire', 'enregistrement', 'rapport', 'compte_rendu_audit', 'preuve');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.finding_type AS ENUM ('conformite', 'observation', 'non_conformite_mineure', 'non_conformite_majeure', 'amelioration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.impact_level AS ENUM ('faible', 'moyen', 'fort');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.indicator_frequency AS ENUM ('quotidien', 'hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.indicator_type AS ENUM ('activite', 'resultat', 'perception', 'interne');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nc_severity AS ENUM ('mineure', 'majeure', 'critique');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nc_status AS ENUM ('ouverte', 'en_traitement', 'cloturee', 'correction', 'analyse_cause', 'action_corrective', 'verification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.process_element_type AS ENUM ('finalite', 'donnee_entree', 'donnee_sortie', 'activite', 'interaction', 'partie_prenante', 'ressource');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.process_status AS ENUM ('brouillon', 'en_validation', 'valide', 'archive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.process_type AS ENUM ('pilotage', 'realisation', 'support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_flow_type AS ENUM ('sequentiel', 'conditionnel', 'parallele', 'inclusif');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ===================== 2. TABLES =====================

-- profiles (references auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  nom text NOT NULL DEFAULT '',
  prenom text NOT NULL DEFAULT '',
  fonction text DEFAULT '',
  acteur_id uuid,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- custom_roles
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- custom_role_permissions
CREATE TABLE IF NOT EXISTS public.custom_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_read_detail boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_custom_roles
CREATE TABLE IF NOT EXISTS public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, custom_role_id)
);

-- role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_read_detail boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

-- acteur_groups
CREATE TABLE IF NOT EXISTS public.acteur_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- acteurs
CREATE TABLE IF NOT EXISTS public.acteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonction text DEFAULT '',
  organisation text DEFAULT '',
  type_acteur acteur_type NOT NULL DEFAULT 'interne',
  actif boolean NOT NULL DEFAULT true,
  description_poste text DEFAULT '',
  group_id uuid REFERENCES public.acteur_groups(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK from profiles to acteurs
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_acteur_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_acteur_id_fkey FOREIGN KEY (acteur_id) REFERENCES public.acteurs(id);

-- processes
CREATE TABLE IF NOT EXISTS public.processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  nom text NOT NULL,
  type_processus process_type NOT NULL,
  description text,
  finalite text,
  donnees_entree text,
  donnees_sortie text,
  activites text,
  interactions text,
  parties_prenantes text,
  ressources text,
  responsable_id uuid,
  statut process_status NOT NULL DEFAULT 'brouillon',
  version_courante integer NOT NULL DEFAULT 1,
  inclure_bpmn_pdf boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- process_elements
CREATE TABLE IF NOT EXISTS public.process_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  code text NOT NULL,
  type process_element_type NOT NULL,
  description text NOT NULL DEFAULT '',
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- process_interactions
CREATE TABLE IF NOT EXISTS public.process_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  target_process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  element_id uuid NOT NULL REFERENCES public.process_elements(id) ON DELETE CASCADE,
  direction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- process_tasks
CREATE TABLE IF NOT EXISTS public.process_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL DEFAULT '',
  ordre integer NOT NULL DEFAULT 0,
  type_flux task_flow_type NOT NULL DEFAULT 'sequentiel',
  responsable_id uuid REFERENCES public.acteurs(id),
  entrees text,
  sorties text,
  condition text,
  parent_code text,
  documents text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- process_versions
CREATE TABLE IF NOT EXISTS public.process_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  version integer NOT NULL,
  donnees jsonb NOT NULL,
  modifie_par uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- process_evaluations
CREATE TABLE IF NOT EXISTS public.process_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES public.processes(id),
  nom text NOT NULL,
  description text NOT NULL DEFAULT '',
  score_satisfaction integer NOT NULL DEFAULT 0,
  score_objectifs integer NOT NULL DEFAULT 0,
  score_risques integer NOT NULL DEFAULT 0,
  score_ca integer NOT NULL DEFAULT 0,
  score_perennite integer NOT NULL DEFAULT 0,
  score_total integer NOT NULL DEFAULT 0,
  resultat text NOT NULL DEFAULT '',
  statut text NOT NULL DEFAULT 'en_cours',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- bpmn_diagrams
CREATE TABLE IF NOT EXISTS public.bpmn_diagrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  donnees jsonb,
  version integer NOT NULL DEFAULT 1,
  statut process_status NOT NULL DEFAULT 'brouillon',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- actions
CREATE TABLE IF NOT EXISTS public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid,
  type_action action_type NOT NULL,
  description text NOT NULL,
  responsable_id uuid REFERENCES public.acteurs(id),
  echeance date,
  statut action_status NOT NULL DEFAULT 'planifiee',
  preuve text,
  commentaire_cloture text,
  date_cloture timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- action_notes
CREATE TABLE IF NOT EXISTS public.action_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  contenu text NOT NULL DEFAULT '',
  avancement integer NOT NULL DEFAULT 0,
  date_note date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  type_document document_type NOT NULL,
  description text,
  process_id uuid REFERENCES public.processes(id),
  chemin_fichier text,
  nom_fichier text,
  taille_fichier bigint,
  version integer NOT NULL DEFAULT 1,
  archive boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- document_processes
CREATE TABLE IF NOT EXISTS public.document_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- audits
CREATE TABLE IF NOT EXISTS public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  type_audit audit_type NOT NULL,
  auditeur_id uuid,
  date_audit date,
  date_fin date,
  statut audit_status NOT NULL DEFAULT 'planifie',
  perimetre text,
  programme text,
  methodes text,
  responsabilites text,
  frequence text,
  rapport text,
  resultats text,
  preuve_realisation text,
  checklist jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- audit_findings
CREATE TABLE IF NOT EXISTS public.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.processes(id),
  type_constat finding_type NOT NULL,
  description text NOT NULL,
  preuve text,
  statut nc_status NOT NULL DEFAULT 'ouverte',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- nonconformities
CREATE TABLE IF NOT EXISTS public.nonconformities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  description text NOT NULL,
  gravite nc_severity NOT NULL,
  statut nc_status NOT NULL DEFAULT 'ouverte',
  date_detection date NOT NULL DEFAULT CURRENT_DATE,
  process_id uuid REFERENCES public.processes(id),
  audit_id uuid REFERENCES public.audits(id),
  created_by uuid,
  origine text,
  nature_nc text,
  cause_racine text,
  correction_immediate text,
  plan_action text,
  resultats_actions text,
  verification_efficacite text,
  criticite integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- indicators
CREATE TABLE IF NOT EXISTS public.indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type_indicateur indicator_type NOT NULL DEFAULT 'activite',
  frequence indicator_frequency NOT NULL DEFAULT 'mensuel',
  unite text,
  cible numeric,
  seuil_alerte numeric,
  formule text,
  moyens text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- indicator_values
CREATE TABLE IF NOT EXISTS public.indicator_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  date_mesure date NOT NULL,
  valeur numeric NOT NULL,
  commentaire text,
  saisi_par uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- indicator_actions
CREATE TABLE IF NOT EXISTS public.indicator_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  responsable text,
  statut text NOT NULL DEFAULT 'a_faire',
  date_prevue date,
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- indicator_moyens
CREATE TABLE IF NOT EXISTS public.indicator_moyens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  type_moyen text NOT NULL DEFAULT 'humain',
  responsable text,
  statut text NOT NULL DEFAULT 'a_faire',
  budget numeric,
  date_prevue date,
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- risks_opportunities
CREATE TABLE IF NOT EXISTS public.risks_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'risque',
  process_id uuid REFERENCES public.processes(id),
  probabilite integer NOT NULL DEFAULT 1,
  impact integer NOT NULL DEFAULT 1,
  criticite integer NOT NULL DEFAULT 1,
  statut text NOT NULL DEFAULT 'identifie',
  responsable_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- risk_actions
CREATE TABLE IF NOT EXISTS public.risk_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id uuid NOT NULL REFERENCES public.risks_opportunities(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  responsable text,
  statut text NOT NULL DEFAULT 'a_faire',
  date_prevue date,
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- risk_moyens
CREATE TABLE IF NOT EXISTS public.risk_moyens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id uuid NOT NULL REFERENCES public.risks_opportunities(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  type_moyen text NOT NULL DEFAULT 'humain',
  responsable text,
  statut text NOT NULL DEFAULT 'a_faire',
  budget numeric,
  date_prevue date,
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- risk_incidents
CREATE TABLE IF NOT EXISTS public.risk_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id uuid NOT NULL REFERENCES public.risks_opportunities(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  date_incident date NOT NULL DEFAULT CURRENT_DATE,
  impact text NOT NULL DEFAULT '',
  actions_prises text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- context_issues
CREATE TABLE IF NOT EXISTS public.context_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  intitule text NOT NULL,
  description text DEFAULT '',
  type_enjeu context_issue_type NOT NULL DEFAULT 'interne',
  domaine text NOT NULL DEFAULT 'strategique',
  impact impact_level NOT NULL DEFAULT 'moyen',
  climat_pertinent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- context_issue_actions
CREATE TABLE IF NOT EXISTS public.context_issue_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_issue_id uuid NOT NULL REFERENCES public.context_issues(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  responsable text DEFAULT '',
  statut text NOT NULL DEFAULT 'a_faire',
  date_revue date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- context_issue_processes
CREATE TABLE IF NOT EXISTS public.context_issue_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_issue_id uuid NOT NULL REFERENCES public.context_issues(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- quality_policy
CREATE TABLE IF NOT EXISTS public.quality_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL DEFAULT '',
  contenu text NOT NULL DEFAULT '',
  objectifs text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  statut text NOT NULL DEFAULT 'brouillon',
  approuve_par text,
  date_approbation date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- quality_objectives
CREATE TABLE IF NOT EXISTS public.quality_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  indicateur text NOT NULL DEFAULT '',
  cible text NOT NULL DEFAULT '',
  echeance date,
  responsable_id uuid,
  statut text NOT NULL DEFAULT 'en_cours',
  commentaire text NOT NULL DEFAULT '',
  process_id uuid REFERENCES public.processes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- management_reviews
CREATE TABLE IF NOT EXISTS public.management_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  date_revue date NOT NULL DEFAULT CURRENT_DATE,
  responsable_id uuid,
  participants text NOT NULL DEFAULT '',
  elements_entree text NOT NULL DEFAULT '',
  decisions text NOT NULL DEFAULT '',
  actions_decidees text NOT NULL DEFAULT '',
  compte_rendu text NOT NULL DEFAULT '',
  statut text NOT NULL DEFAULT 'planifiee',
  prochaine_revue date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- review_input_items
CREATE TABLE IF NOT EXISTS public.review_input_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.management_reviews(id) ON DELETE CASCADE,
  categorie text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  statut text NOT NULL DEFAULT 'a_examiner',
  commentaire text NOT NULL DEFAULT '',
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- review_decisions
CREATE TABLE IF NOT EXISTS public.review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.management_reviews(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  responsable_id uuid,
  echeance date,
  statut text NOT NULL DEFAULT 'decidee',
  input_item_id uuid REFERENCES public.review_input_items(id),
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- competences
CREATE TABLE IF NOT EXISTS public.competences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id uuid NOT NULL REFERENCES public.acteurs(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id),
  competence text NOT NULL DEFAULT '',
  niveau text NOT NULL DEFAULT 'debutant',
  date_evaluation date NOT NULL DEFAULT CURRENT_DATE,
  prochaine_evaluation date,
  commentaire text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- formations
CREATE TABLE IF NOT EXISTS public.formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id uuid NOT NULL REFERENCES public.acteurs(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id),
  titre text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  formateur text NOT NULL DEFAULT '',
  date_formation date NOT NULL DEFAULT CURRENT_DATE,
  duree_heures numeric NOT NULL DEFAULT 0,
  cout numeric NOT NULL DEFAULT 0,
  type_formation text NOT NULL DEFAULT 'interne',
  efficacite text NOT NULL DEFAULT 'non_evaluee',
  commentaire text NOT NULL DEFAULT '',
  competence_liee text,
  competences_liees text[],
  preuve text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- formation_participants
CREATE TABLE IF NOT EXISTS public.formation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  acteur_id uuid NOT NULL REFERENCES public.acteurs(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- budget_formation
CREATE TABLE IF NOT EXISTS public.budget_formation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annee integer NOT NULL,
  budget_prevu numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL DEFAULT '',
  type_fournisseur text NOT NULL DEFAULT 'produit',
  contact text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telephone text NOT NULL DEFAULT '',
  adresse text NOT NULL DEFAULT '',
  evaluation_globale numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'actif',
  date_evaluation date,
  commentaire text NOT NULL DEFAULT '',
  criteres jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- satisfaction_surveys (internal)
CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  type_enquete text NOT NULL DEFAULT 'interne',
  statut text NOT NULL DEFAULT 'brouillon',
  date_debut date,
  date_fin date,
  resultats jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- client_surveys
CREATE TABLE IF NOT EXISTS public.client_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  product_service text NOT NULL DEFAULT '',
  objectif text NOT NULL DEFAULT '',
  type_sondage text NOT NULL DEFAULT 'satisfaction_globale',
  mode_sondage text NOT NULL DEFAULT 'libre',
  status text NOT NULL DEFAULT 'draft',
  public_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- client_survey_questions
CREATE TABLE IF NOT EXISTS public.client_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.client_surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL DEFAULT '',
  question_type text NOT NULL DEFAULT 'satisfaction',
  ordre integer NOT NULL DEFAULT 0,
  poids integer NOT NULL DEFAULT 1,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- client_survey_responses
CREATE TABLE IF NOT EXISTS public.client_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.client_surveys(id) ON DELETE CASCADE,
  respondent_name text,
  respondent_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- client_survey_answers
CREATE TABLE IF NOT EXISTS public.client_survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.client_survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.client_survey_questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL DEFAULT '',
  answer_value integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- client_survey_comments
CREATE TABLE IF NOT EXISTS public.client_survey_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.client_survey_responses(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.client_survey_questions(id),
  comment_text text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'suggestion',
  action_id uuid REFERENCES public.actions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- client_survey_shares
CREATE TABLE IF NOT EXISTS public.client_survey_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.client_surveys(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  message text,
  entity_type text,
  entity_id uuid,
  entity_url text,
  is_read boolean NOT NULL DEFAULT false,
  channel text NOT NULL DEFAULT 'both',
  email_sent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignation text NOT NULL DEFAULT 'both',
  statut_change text NOT NULL DEFAULT 'both',
  echeance_proche text NOT NULL DEFAULT 'both',
  retard text NOT NULL DEFAULT 'both',
  rappel_jours integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- notification_config
CREATE TABLE IF NOT EXISTS public.notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  entity_type text NOT NULL,
  notif_type text NOT NULL,
  channel text NOT NULL DEFAULT 'both',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- element_notes
CREATE TABLE IF NOT EXISTS public.element_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id uuid NOT NULL,
  element_type text NOT NULL,
  contenu text NOT NULL DEFAULT '',
  avancement integer NOT NULL DEFAULT 0,
  date_note date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  is_response boolean NOT NULL DEFAULT false,
  parent_note_id uuid REFERENCES public.element_notes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ===================== 3. FONCTIONS =====================

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, fonction) VALUES (
    NEW.id, COALESCE(NEW.email,''), COALESCE(NEW.raw_user_meta_data->>'nom',''),
    COALESCE(NEW.raw_user_meta_data->>'prenom',''), COALESCE(NEW.raw_user_meta_data->>'fonction','')
  );
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rmq');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consultant');
  END IF;
  RETURN NEW;
END $$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- validate_interaction_direction
CREATE OR REPLACE FUNCTION public.validate_interaction_direction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.direction NOT IN ('entree', 'sortie') THEN
    RAISE EXCEPTION 'direction must be entree or sortie';
  END IF;
  RETURN NEW;
END $$;

-- log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, new_value)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_value, new_value)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_value)
    VALUES (auth.uid(), TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

-- resolve_notification_channel
CREATE OR REPLACE FUNCTION public.resolve_notification_channel(_user_id uuid, _entity_type text, _notif_type text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT channel FROM notification_config WHERE scope = _user_id::text AND entity_type = _entity_type AND notif_type = _notif_type),
    (SELECT channel FROM notification_config WHERE scope = 'global' AND entity_type = _entity_type AND notif_type = _notif_type),
    'both'
  )
$$;

-- notify_responsibility_change
CREATE OR REPLACE FUNCTION public.notify_responsibility_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_responsible_acteur_id uuid;
  v_old_responsible_acteur_id uuid;
  v_user_id uuid;
  v_entity_type text;
  v_entity_url text;
  v_title text;
  v_message text;
  v_pref_channel text;
  v_description text;
BEGIN
  v_entity_type := TG_TABLE_NAME;
  IF TG_TABLE_NAME IN ('actions', 'process_tasks', 'processes', 'quality_objectives', 'review_decisions') THEN
    v_responsible_acteur_id := NEW.responsable_id;
    IF TG_OP = 'UPDATE' THEN v_old_responsible_acteur_id := OLD.responsable_id; END IF;
  ELSE
    BEGIN v_responsible_acteur_id := NEW.responsable::uuid;
    EXCEPTION WHEN OTHERS THEN v_responsible_acteur_id := NULL; END;
    IF TG_OP = 'UPDATE' THEN
      BEGIN v_old_responsible_acteur_id := OLD.responsable::uuid;
      EXCEPTION WHEN OTHERS THEN v_old_responsible_acteur_id := NULL; END;
    END IF;
  END IF;
  IF v_responsible_acteur_id IS NOT NULL THEN
    SELECT id INTO v_user_id FROM public.profiles WHERE acteur_id = v_responsible_acteur_id LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'processes' THEN v_description := NEW.nom; ELSE v_description := NEW.description; END IF;
  CASE TG_TABLE_NAME
    WHEN 'actions' THEN v_entity_url := '/actions';
    WHEN 'process_tasks' THEN v_entity_url := '/processus/' || NEW.process_id;
    WHEN 'processes' THEN v_entity_url := '/processus/' || NEW.id;
    WHEN 'quality_objectives' THEN v_entity_url := '/politique-qualite';
    WHEN 'review_decisions' THEN v_entity_url := '/revue-direction';
    WHEN 'risk_actions' THEN v_entity_url := '/risques';
    WHEN 'risk_moyens' THEN v_entity_url := '/risques';
    WHEN 'indicator_actions' THEN v_entity_url := '/indicateurs';
    WHEN 'indicator_moyens' THEN v_entity_url := '/indicateurs';
    WHEN 'context_issue_actions' THEN v_entity_url := '/enjeux-contexte';
    ELSE v_entity_url := '/';
  END CASE;
  IF (TG_OP = 'INSERT' AND v_responsible_acteur_id IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND v_responsible_acteur_id IS DISTINCT FROM v_old_responsible_acteur_id AND v_responsible_acteur_id IS NOT NULL) THEN
    v_title := 'Nouvelle assignation';
    v_message := 'Vous avez ete assigne a : ' || COALESCE(left(v_description, 100), v_entity_type);
    v_pref_channel := resolve_notification_channel(v_user_id, v_entity_type, 'assignation');
    IF v_pref_channel != 'none' THEN
      INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, entity_url, channel)
      VALUES (v_user_id, 'assignation', v_title, v_message, v_entity_type, NEW.id, v_entity_url, v_pref_channel);
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.statut IS DISTINCT FROM OLD.statut AND v_responsible_acteur_id IS NOT NULL THEN
    v_title := 'Changement de statut';
    v_message := COALESCE(left(v_description, 80), v_entity_type) || ' : ' || OLD.statut || ' → ' || NEW.statut;
    v_pref_channel := resolve_notification_channel(v_user_id, v_entity_type, 'statut_change');
    IF v_pref_channel != 'none' THEN
      INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, entity_url, channel)
      VALUES (v_user_id, 'statut_change', v_title, v_message, v_entity_type, NEW.id, v_entity_url, v_pref_channel);
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- dispatch_notification_email
CREATE OR REPLACE FUNCTION public.dispatch_notification_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _url text; _key text;
BEGIN
  IF NEW.channel IN ('email', 'both') THEN
    SELECT value INTO _url FROM public.app_settings WHERE key = 'supabase_url';
    SELECT value INTO _key FROM public.app_settings WHERE key = 'supabase_service_role_key';
    IF _url IS NOT NULL AND _key IS NOT NULL THEN
      PERFORM net.http_post(
        url := _url || '/functions/v1/send-notification-email',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _key),
        body := jsonb_build_object('user_id', NEW.user_id, 'title', NEW.title, 'message', COALESCE(NEW.message, ''), 'entity_url', COALESCE(NEW.entity_url, ''), 'notif_type', COALESCE(NEW.type, ''), 'entity_type', COALESCE(NEW.entity_type, ''), 'entity_id', COALESCE(NEW.entity_id::text, ''))
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;


-- ===================== 4. TRIGGERS =====================

-- on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- validate_interaction_direction
DROP TRIGGER IF EXISTS validate_interaction_direction_trigger ON public.process_interactions;
CREATE TRIGGER validate_interaction_direction_trigger
  BEFORE INSERT OR UPDATE ON public.process_interactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_interaction_direction();

-- dispatch email on notification insert
DROP TRIGGER IF EXISTS dispatch_email_on_notification ON public.notifications;
CREATE TRIGGER dispatch_email_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification_email();


-- ===================== 5. ENABLE RLS =====================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acteur_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpmn_diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonconformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_moyens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_moyens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_issue_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_issue_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_input_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_formation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_survey_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_survey_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.element_notes ENABLE ROW LEVEL SECURITY;


-- ===================== 6. RLS POLICIES =====================
-- Helper macro: most tables follow the same pattern

-- == user_roles ==
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert_admin" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "user_roles_insert_rmq" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "user_roles_update_admin" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "user_roles_update_rmq" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "user_roles_delete_admin" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "user_roles_delete_rmq" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- == profiles ==
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

-- == custom_roles ==
CREATE POLICY "custom_roles_select" ON public.custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_roles_insert_admin" ON public.custom_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "custom_roles_update_admin" ON public.custom_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "custom_roles_delete_admin" ON public.custom_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == custom_role_permissions ==
CREATE POLICY "crp_select" ON public.custom_role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "crp_insert_admin" ON public.custom_role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "crp_update_admin" ON public.custom_role_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "crp_delete_admin" ON public.custom_role_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == user_custom_roles ==
CREATE POLICY "ucr_select" ON public.user_custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "ucr_insert_admin" ON public.user_custom_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ucr_delete_admin" ON public.user_custom_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == role_permissions ==
CREATE POLICY "rp_select" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rp_insert_admin" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rp_update_admin" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rp_delete_admin" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == acteur_groups ==
CREATE POLICY "acteur_groups_select" ON public.acteur_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "acteur_groups_insert_admin" ON public.acteur_groups FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "acteur_groups_insert_rmq" ON public.acteur_groups FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "acteur_groups_update_admin" ON public.acteur_groups FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "acteur_groups_update_rmq" ON public.acteur_groups FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "acteur_groups_delete_admin" ON public.acteur_groups FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "acteur_groups_delete_rmq" ON public.acteur_groups FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));

-- == acteurs ==
CREATE POLICY "acteurs_select" ON public.acteurs FOR SELECT TO authenticated USING (true);
CREATE POLICY "acteurs_insert" ON public.acteurs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "acteurs_insert_admin" ON public.acteurs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "acteurs_update" ON public.acteurs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "acteurs_update_admin" ON public.acteurs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "acteurs_delete" ON public.acteurs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "acteurs_delete_admin" ON public.acteurs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == processes ==
CREATE POLICY "processes_select" ON public.processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "processes_insert" ON public.processes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "processes_insert_admin" ON public.processes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "processes_update" ON public.processes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "processes_update_admin" ON public.processes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "processes_delete" ON public.processes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "processes_delete_admin" ON public.processes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == process_elements ==
CREATE POLICY "pe_select" ON public.process_elements FOR SELECT TO authenticated USING (true);
CREATE POLICY "pe_insert" ON public.process_elements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "pe_insert_admin" ON public.process_elements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "pe_update" ON public.process_elements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "pe_update_admin" ON public.process_elements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "pe_delete" ON public.process_elements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "pe_delete_admin" ON public.process_elements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == process_interactions ==
CREATE POLICY "pi_select" ON public.process_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "pi_insert" ON public.process_interactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "pi_insert_admin" ON public.process_interactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "pi_delete" ON public.process_interactions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "pi_delete_admin" ON public.process_interactions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == process_tasks ==
CREATE POLICY "pt_select" ON public.process_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "pt_insert" ON public.process_tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "pt_insert_admin" ON public.process_tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "pt_update" ON public.process_tasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "pt_update_admin" ON public.process_tasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "pt_delete" ON public.process_tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "pt_delete_admin" ON public.process_tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == process_versions ==
CREATE POLICY "pv_select" ON public.process_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_insert" ON public.process_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "pv_insert_admin" ON public.process_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == process_evaluations ==
CREATE POLICY "peval_select" ON public.process_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "peval_insert" ON public.process_evaluations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "peval_insert_admin" ON public.process_evaluations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "peval_update" ON public.process_evaluations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "peval_update_admin" ON public.process_evaluations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "peval_delete" ON public.process_evaluations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "peval_delete_admin" ON public.process_evaluations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == bpmn_diagrams ==
CREATE POLICY "bpmn_select" ON public.bpmn_diagrams FOR SELECT TO authenticated USING (true);
CREATE POLICY "bpmn_insert" ON public.bpmn_diagrams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "bpmn_insert_admin" ON public.bpmn_diagrams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "bpmn_update" ON public.bpmn_diagrams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "bpmn_update_admin" ON public.bpmn_diagrams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "bpmn_delete" ON public.bpmn_diagrams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "bpmn_delete_admin" ON public.bpmn_diagrams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == actions ==
CREATE POLICY "actions_select" ON public.actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "actions_insert" ON public.actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'auditeur'));
CREATE POLICY "actions_insert_admin" ON public.actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "actions_update" ON public.actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'auditeur'));
CREATE POLICY "actions_update_admin" ON public.actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "actions_delete_admin" ON public.actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == action_notes ==
CREATE POLICY "action_notes_select" ON public.action_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "action_notes_insert" ON public.action_notes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'auditeur') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "action_notes_insert_acteur" ON public.action_notes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'acteur') AND created_by = auth.uid());
CREATE POLICY "action_notes_update" ON public.action_notes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "action_notes_delete" ON public.action_notes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == documents ==
CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "documents_insert_admin" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "documents_update_admin" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "documents_delete_admin" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == document_processes ==
CREATE POLICY "document_processes_select" ON public.document_processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "document_processes_insert" ON public.document_processes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "document_processes_delete" ON public.document_processes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == audits ==
CREATE POLICY "audits_select" ON public.audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "audits_insert" ON public.audits FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur'));
CREATE POLICY "audits_insert_admin" ON public.audits FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "audits_update" ON public.audits FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur'));
CREATE POLICY "audits_update_admin" ON public.audits FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "audits_delete" ON public.audits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "audits_delete_admin" ON public.audits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == audit_findings ==
CREATE POLICY "findings_select" ON public.audit_findings FOR SELECT TO authenticated USING (true);
CREATE POLICY "findings_insert" ON public.audit_findings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur'));
CREATE POLICY "findings_insert_admin" ON public.audit_findings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "findings_update" ON public.audit_findings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur'));
CREATE POLICY "findings_update_admin" ON public.audit_findings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "findings_delete_admin" ON public.audit_findings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == audit_logs ==
CREATE POLICY "audit_logs_select_admin_rmq" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "audit_logs_select_auditeur" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'auditeur') AND entity_type = ANY(ARRAY['audit', 'audit_finding', 'nonconformity']));
CREATE POLICY "audit_logs_select_responsable" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'responsable_processus') AND user_id = auth.uid());
CREATE POLICY "audit_logs_select_acteur" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'acteur') AND user_id = auth.uid());
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- == nonconformities ==
CREATE POLICY "nc_select" ON public.nonconformities FOR SELECT TO authenticated USING (true);
CREATE POLICY "nc_insert" ON public.nonconformities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur'));
CREATE POLICY "nc_insert_admin" ON public.nonconformities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "nc_update" ON public.nonconformities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'auditeur'));
CREATE POLICY "nc_update_admin" ON public.nonconformities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "nc_delete" ON public.nonconformities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "nc_delete_admin" ON public.nonconformities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == indicators ==
CREATE POLICY "ind_select" ON public.indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "ind_insert" ON public.indicators FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ind_insert_admin" ON public.indicators FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ind_update" ON public.indicators FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ind_update_admin" ON public.indicators FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ind_delete" ON public.indicators FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "ind_delete_admin" ON public.indicators FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == indicator_values ==
CREATE POLICY "iv_select" ON public.indicator_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "iv_insert" ON public.indicator_values FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "iv_insert_admin" ON public.indicator_values FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "iv_update" ON public.indicator_values FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "iv_update_admin" ON public.indicator_values FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "iv_delete" ON public.indicator_values FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "iv_delete_admin" ON public.indicator_values FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == indicator_actions ==
CREATE POLICY "ia_select" ON public.indicator_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ia_insert" ON public.indicator_actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ia_insert_admin" ON public.indicator_actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ia_update" ON public.indicator_actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ia_update_admin" ON public.indicator_actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ia_delete" ON public.indicator_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "ia_delete_admin" ON public.indicator_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == indicator_moyens ==
CREATE POLICY "im_select" ON public.indicator_moyens FOR SELECT TO authenticated USING (true);
CREATE POLICY "im_insert" ON public.indicator_moyens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "im_insert_admin" ON public.indicator_moyens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "im_update" ON public.indicator_moyens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "im_update_admin" ON public.indicator_moyens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "im_delete" ON public.indicator_moyens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "im_delete_admin" ON public.indicator_moyens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == risks_opportunities ==
CREATE POLICY "ro_select" ON public.risks_opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "ro_insert" ON public.risks_opportunities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ro_insert_admin" ON public.risks_opportunities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ro_update" ON public.risks_opportunities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ro_update_admin" ON public.risks_opportunities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ro_delete" ON public.risks_opportunities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "ro_delete_admin" ON public.risks_opportunities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == risk_actions ==
CREATE POLICY "ra_select" ON public.risk_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ra_insert" ON public.risk_actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ra_insert_admin" ON public.risk_actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ra_update" ON public.risk_actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ra_update_admin" ON public.risk_actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ra_delete" ON public.risk_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "ra_delete_admin" ON public.risk_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == risk_moyens ==
CREATE POLICY "rm_select" ON public.risk_moyens FOR SELECT TO authenticated USING (true);
CREATE POLICY "rm_insert" ON public.risk_moyens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "rm_insert_admin" ON public.risk_moyens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rm_update" ON public.risk_moyens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "rm_update_admin" ON public.risk_moyens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rm_delete" ON public.risk_moyens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "rm_delete_admin" ON public.risk_moyens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == risk_incidents ==
CREATE POLICY "ri_select" ON public.risk_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "ri_insert" ON public.risk_incidents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ri_update" ON public.risk_incidents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ri_delete" ON public.risk_incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == context_issues ==
CREATE POLICY "ci_select" ON public.context_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "ci_insert" ON public.context_issues FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "ci_insert_admin" ON public.context_issues FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ci_update" ON public.context_issues FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "ci_update_admin" ON public.context_issues FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ci_delete" ON public.context_issues FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "ci_delete_admin" ON public.context_issues FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == context_issue_actions ==
CREATE POLICY "cia_select" ON public.context_issue_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cia_insert" ON public.context_issue_actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "cia_insert_admin" ON public.context_issue_actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "cia_update" ON public.context_issue_actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "cia_update_admin" ON public.context_issue_actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "cia_delete" ON public.context_issue_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "cia_delete_admin" ON public.context_issue_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == context_issue_processes ==
CREATE POLICY "cip_select" ON public.context_issue_processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cip_insert" ON public.context_issue_processes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant'));
CREATE POLICY "cip_insert_admin" ON public.context_issue_processes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "cip_delete" ON public.context_issue_processes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "cip_delete_admin" ON public.context_issue_processes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == quality_policy ==
CREATE POLICY "qp_select" ON public.quality_policy FOR SELECT TO authenticated USING (true);
CREATE POLICY "qp_insert" ON public.quality_policy FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "qp_update" ON public.quality_policy FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "qp_delete" ON public.quality_policy FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == quality_objectives ==
CREATE POLICY "qo_select" ON public.quality_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "qo_insert" ON public.quality_objectives FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "qo_insert_admin" ON public.quality_objectives FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "qo_update" ON public.quality_objectives FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus'));
CREATE POLICY "qo_update_admin" ON public.quality_objectives FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "qo_delete" ON public.quality_objectives FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "qo_delete_admin" ON public.quality_objectives FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == management_reviews ==
CREATE POLICY "mr_select" ON public.management_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "mr_insert" ON public.management_reviews FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "mr_update" ON public.management_reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "mr_delete" ON public.management_reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == review_input_items ==
CREATE POLICY "rii_select" ON public.review_input_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "rii_insert" ON public.review_input_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rii_update" ON public.review_input_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rii_delete" ON public.review_input_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == review_decisions ==
CREATE POLICY "rd_select" ON public.review_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rd_insert" ON public.review_decisions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rd_update" ON public.review_decisions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rd_delete" ON public.review_decisions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == competences ==
CREATE POLICY "comp_select" ON public.competences FOR SELECT TO authenticated USING (true);
CREATE POLICY "comp_insert_rmq" ON public.competences FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "comp_insert_admin" ON public.competences FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "comp_update_rmq" ON public.competences FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "comp_update_admin" ON public.competences FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "comp_delete_admin" ON public.competences FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == formations ==
CREATE POLICY "form_select" ON public.formations FOR SELECT TO authenticated USING (true);
CREATE POLICY "form_insert" ON public.formations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "form_update" ON public.formations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "form_delete" ON public.formations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == formation_participants ==
CREATE POLICY "fp_select" ON public.formation_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "fp_insert" ON public.formation_participants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "fp_delete" ON public.formation_participants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == budget_formation ==
CREATE POLICY "bf_select" ON public.budget_formation FOR SELECT TO authenticated USING (true);
CREATE POLICY "bf_insert" ON public.budget_formation FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "bf_update" ON public.budget_formation FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "bf_delete" ON public.budget_formation FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'rmq'));

-- == suppliers ==
CREATE POLICY "sup_select" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "sup_insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "sup_update" ON public.suppliers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "sup_delete" ON public.suppliers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == satisfaction_surveys ==
CREATE POLICY "ss_select" ON public.satisfaction_surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "ss_insert" ON public.satisfaction_surveys FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ss_update" ON public.satisfaction_surveys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ss_delete" ON public.satisfaction_surveys FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == client_surveys ==
CREATE POLICY "cs_select_auth" ON public.client_surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "cs_select_anon" ON public.client_surveys FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "cs_insert_rmq" ON public.client_surveys FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "cs_insert_admin" ON public.client_surveys FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "cs_update_rmq" ON public.client_surveys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "cs_update_admin" ON public.client_surveys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "cs_delete_rmq" ON public.client_surveys FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "cs_delete_admin" ON public.client_surveys FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == client_survey_questions ==
CREATE POLICY "csq_select_auth" ON public.client_survey_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "csq_select_anon" ON public.client_survey_questions FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM client_surveys WHERE client_surveys.id = client_survey_questions.survey_id AND client_surveys.status = 'active'));
CREATE POLICY "csq_insert_rmq" ON public.client_survey_questions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "csq_insert_admin" ON public.client_survey_questions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "csq_update_rmq" ON public.client_survey_questions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "csq_update_admin" ON public.client_survey_questions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "csq_delete_rmq" ON public.client_survey_questions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "csq_delete_admin" ON public.client_survey_questions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == client_survey_responses ==
CREATE POLICY "csr_select_auth" ON public.client_survey_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "csr_select_anon" ON public.client_survey_responses FOR SELECT TO anon USING (true);
CREATE POLICY "csr_insert_auth" ON public.client_survey_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "csr_insert_anon" ON public.client_survey_responses FOR INSERT TO anon WITH CHECK (true);

-- == client_survey_answers ==
CREATE POLICY "csa_select_auth" ON public.client_survey_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "csa_select_anon" ON public.client_survey_answers FOR SELECT TO anon USING (true);
CREATE POLICY "csa_insert_auth" ON public.client_survey_answers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "csa_insert_anon" ON public.client_survey_answers FOR INSERT TO anon WITH CHECK (true);

-- == client_survey_comments ==
CREATE POLICY "csc_select_auth" ON public.client_survey_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "csc_select_anon" ON public.client_survey_comments FOR SELECT TO anon USING (true);
CREATE POLICY "csc_insert_auth" ON public.client_survey_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "csc_insert_anon" ON public.client_survey_comments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "csc_update_rmq" ON public.client_survey_comments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "csc_update_admin" ON public.client_survey_comments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == client_survey_shares ==
CREATE POLICY "css_select_auth" ON public.client_survey_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "css_insert_rmq" ON public.client_survey_shares FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "css_insert_admin" ON public.client_survey_shares FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "css_delete_rmq" ON public.client_survey_shares FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'));
CREATE POLICY "css_delete_admin" ON public.client_survey_shares FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- == notifications ==
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- == notification_preferences ==
CREATE POLICY "np_select_own" ON public.notification_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "np_insert_own" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "np_update_own" ON public.notification_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- == notification_config ==
CREATE POLICY "nc_config_select" ON public.notification_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "nc_config_insert" ON public.notification_config FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'rmq') OR scope = auth.uid()::text);
CREATE POLICY "nc_config_update" ON public.notification_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'rmq') OR scope = auth.uid()::text);
CREATE POLICY "nc_config_delete" ON public.notification_config FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'rmq') OR scope = auth.uid()::text);

-- == app_settings ==
CREATE POLICY "app_settings_select" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_settings_insert_sa" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "app_settings_update_sa" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "app_settings_delete_sa" ON public.app_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- == element_notes ==
CREATE POLICY "en_select" ON public.element_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "en_insert" ON public.element_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "en_update" ON public.element_notes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR created_by = auth.uid());
CREATE POLICY "en_delete" ON public.element_notes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR created_by = auth.uid());


-- ===================== 7. STORAGE BUCKETS =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-images', 'survey-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "auth_upload_docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "auth_read_docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "auth_delete_docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "auth_update_docs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents');

-- Storage policies for survey-images (public)
CREATE POLICY "public_read_survey_img" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'survey-images');
CREATE POLICY "auth_upload_survey_img" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'survey-images');
CREATE POLICY "auth_delete_survey_img" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'survey-images');

-- Storage policies for branding (public)
CREATE POLICY "public_read_branding" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'branding');
CREATE POLICY "auth_read_branding" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'branding');
CREATE POLICY "auth_upload_branding" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding');
CREATE POLICY "auth_delete_branding" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding');
CREATE POLICY "auth_update_branding" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding');


-- ===================== 8. REALTIME (optionnel) =====================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ===================== VERIFICATION =====================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complète exécutée avec succès';
  RAISE NOTICE '→ Prochaine étape: exécuter 002_seed_admin.sql pour créer le premier admin';
END $$;
