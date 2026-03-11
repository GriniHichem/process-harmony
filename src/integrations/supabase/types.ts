export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acteur_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      acteurs: {
        Row: {
          actif: boolean
          created_at: string
          description_poste: string | null
          fonction: string | null
          group_id: string | null
          id: string
          organisation: string | null
          type_acteur: Database["public"]["Enums"]["acteur_type"]
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          description_poste?: string | null
          fonction?: string | null
          group_id?: string | null
          id?: string
          organisation?: string | null
          type_acteur?: Database["public"]["Enums"]["acteur_type"]
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          description_poste?: string | null
          fonction?: string | null
          group_id?: string | null
          id?: string
          organisation?: string | null
          type_acteur?: Database["public"]["Enums"]["acteur_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acteurs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "acteur_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      action_notes: {
        Row: {
          action_id: string
          avancement: number
          contenu: string
          created_at: string
          created_by: string | null
          date_note: string
          id: string
        }
        Insert: {
          action_id: string
          avancement?: number
          contenu?: string
          created_at?: string
          created_by?: string | null
          date_note?: string
          id?: string
        }
        Update: {
          action_id?: string
          avancement?: number
          contenu?: string
          created_at?: string
          created_by?: string | null
          date_note?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_notes_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          commentaire_cloture: string | null
          created_at: string
          date_cloture: string | null
          description: string
          echeance: string | null
          id: string
          preuve: string | null
          responsable_id: string | null
          source_id: string | null
          source_type: string
          statut: Database["public"]["Enums"]["action_status"]
          type_action: Database["public"]["Enums"]["action_type"]
          updated_at: string
        }
        Insert: {
          commentaire_cloture?: string | null
          created_at?: string
          date_cloture?: string | null
          description: string
          echeance?: string | null
          id?: string
          preuve?: string | null
          responsable_id?: string | null
          source_id?: string | null
          source_type: string
          statut?: Database["public"]["Enums"]["action_status"]
          type_action: Database["public"]["Enums"]["action_type"]
          updated_at?: string
        }
        Update: {
          commentaire_cloture?: string | null
          created_at?: string
          date_cloture?: string | null
          description?: string
          echeance?: string | null
          id?: string
          preuve?: string | null
          responsable_id?: string | null
          source_id?: string | null
          source_type?: string
          statut?: Database["public"]["Enums"]["action_status"]
          type_action?: Database["public"]["Enums"]["action_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "acteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          audit_id: string
          created_at: string
          description: string
          id: string
          preuve: string | null
          process_id: string | null
          statut: Database["public"]["Enums"]["nc_status"]
          type_constat: Database["public"]["Enums"]["finding_type"]
          updated_at: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          description: string
          id?: string
          preuve?: string | null
          process_id?: string | null
          statut?: Database["public"]["Enums"]["nc_status"]
          type_constat: Database["public"]["Enums"]["finding_type"]
          updated_at?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          description?: string
          id?: string
          preuve?: string | null
          process_id?: string | null
          statut?: Database["public"]["Enums"]["nc_status"]
          type_constat?: Database["public"]["Enums"]["finding_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      audits: {
        Row: {
          auditeur_id: string | null
          checklist: Json | null
          created_at: string
          date_audit: string | null
          date_fin: string | null
          frequence: string | null
          id: string
          methodes: string | null
          perimetre: string | null
          preuve_realisation: string | null
          programme: string | null
          rapport: string | null
          reference: string
          responsabilites: string | null
          resultats: string | null
          statut: Database["public"]["Enums"]["audit_status"]
          type_audit: Database["public"]["Enums"]["audit_type"]
          updated_at: string
        }
        Insert: {
          auditeur_id?: string | null
          checklist?: Json | null
          created_at?: string
          date_audit?: string | null
          date_fin?: string | null
          frequence?: string | null
          id?: string
          methodes?: string | null
          perimetre?: string | null
          preuve_realisation?: string | null
          programme?: string | null
          rapport?: string | null
          reference: string
          responsabilites?: string | null
          resultats?: string | null
          statut?: Database["public"]["Enums"]["audit_status"]
          type_audit: Database["public"]["Enums"]["audit_type"]
          updated_at?: string
        }
        Update: {
          auditeur_id?: string | null
          checklist?: Json | null
          created_at?: string
          date_audit?: string | null
          date_fin?: string | null
          frequence?: string | null
          id?: string
          methodes?: string | null
          perimetre?: string | null
          preuve_realisation?: string | null
          programme?: string | null
          rapport?: string | null
          reference?: string
          responsabilites?: string | null
          resultats?: string | null
          statut?: Database["public"]["Enums"]["audit_status"]
          type_audit?: Database["public"]["Enums"]["audit_type"]
          updated_at?: string
        }
        Relationships: []
      }
      bpmn_diagrams: {
        Row: {
          created_at: string
          created_by: string | null
          donnees: Json | null
          id: string
          nom: string
          process_id: string
          statut: Database["public"]["Enums"]["process_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          donnees?: Json | null
          id?: string
          nom: string
          process_id: string
          statut?: Database["public"]["Enums"]["process_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          donnees?: Json | null
          id?: string
          nom?: string
          process_id?: string
          statut?: Database["public"]["Enums"]["process_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bpmn_diagrams_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      competences: {
        Row: {
          acteur_id: string
          commentaire: string
          competence: string
          created_at: string
          date_evaluation: string
          id: string
          niveau: string
          prochaine_evaluation: string | null
          updated_at: string
        }
        Insert: {
          acteur_id: string
          commentaire?: string
          competence?: string
          created_at?: string
          date_evaluation?: string
          id?: string
          niveau?: string
          prochaine_evaluation?: string | null
          updated_at?: string
        }
        Update: {
          acteur_id?: string
          commentaire?: string
          competence?: string
          created_at?: string
          date_evaluation?: string
          id?: string
          niveau?: string
          prochaine_evaluation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competences_acteur_id_fkey"
            columns: ["acteur_id"]
            isOneToOne: false
            referencedRelation: "acteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      context_issue_actions: {
        Row: {
          context_issue_id: string
          created_at: string
          date_revue: string | null
          description: string
          id: string
          responsable: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          context_issue_id: string
          created_at?: string
          date_revue?: string | null
          description?: string
          id?: string
          responsable?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          context_issue_id?: string
          created_at?: string
          date_revue?: string | null
          description?: string
          id?: string
          responsable?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_issue_actions_context_issue_id_fkey"
            columns: ["context_issue_id"]
            isOneToOne: false
            referencedRelation: "context_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      context_issue_processes: {
        Row: {
          context_issue_id: string
          created_at: string
          id: string
          process_id: string
        }
        Insert: {
          context_issue_id: string
          created_at?: string
          id?: string
          process_id: string
        }
        Update: {
          context_issue_id?: string
          created_at?: string
          id?: string
          process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_issue_processes_context_issue_id_fkey"
            columns: ["context_issue_id"]
            isOneToOne: false
            referencedRelation: "context_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_issue_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      context_issues: {
        Row: {
          climat_pertinent: boolean
          created_at: string
          description: string | null
          domaine: string
          id: string
          impact: Database["public"]["Enums"]["impact_level"]
          intitule: string
          reference: string
          type_enjeu: Database["public"]["Enums"]["context_issue_type"]
          updated_at: string
        }
        Insert: {
          climat_pertinent?: boolean
          created_at?: string
          description?: string | null
          domaine?: string
          id?: string
          impact?: Database["public"]["Enums"]["impact_level"]
          intitule: string
          reference: string
          type_enjeu?: Database["public"]["Enums"]["context_issue_type"]
          updated_at?: string
        }
        Update: {
          climat_pertinent?: boolean
          created_at?: string
          description?: string | null
          domaine?: string
          id?: string
          impact?: Database["public"]["Enums"]["impact_level"]
          intitule?: string
          reference?: string
          type_enjeu?: Database["public"]["Enums"]["context_issue_type"]
          updated_at?: string
        }
        Relationships: []
      }
      custom_role_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_read: boolean
          can_read_detail: boolean
          created_at: string
          custom_role_id: string
          id: string
          module: string
          updated_at: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_read?: boolean
          can_read_detail?: boolean
          created_at?: string
          custom_role_id: string
          id?: string
          module: string
          updated_at?: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_read?: boolean
          can_read_detail?: boolean
          created_at?: string
          custom_role_id?: string
          id?: string
          module?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_role_permissions_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_processes: {
        Row: {
          created_at: string
          document_id: string
          id: string
          process_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          process_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_processes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archive: boolean
          chemin_fichier: string | null
          created_at: string
          description: string | null
          id: string
          nom_fichier: string | null
          process_id: string | null
          taille_fichier: number | null
          titre: string
          type_document: Database["public"]["Enums"]["document_type"]
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          archive?: boolean
          chemin_fichier?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nom_fichier?: string | null
          process_id?: string | null
          taille_fichier?: number | null
          titre: string
          type_document: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          archive?: boolean
          chemin_fichier?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nom_fichier?: string | null
          process_id?: string | null
          taille_fichier?: number | null
          titre?: string
          type_document?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          acteur_id: string
          commentaire: string
          created_at: string
          date_formation: string
          description: string
          duree_heures: number
          efficacite: string
          formateur: string
          id: string
          preuve: string | null
          titre: string
          updated_at: string
        }
        Insert: {
          acteur_id: string
          commentaire?: string
          created_at?: string
          date_formation?: string
          description?: string
          duree_heures?: number
          efficacite?: string
          formateur?: string
          id?: string
          preuve?: string | null
          titre?: string
          updated_at?: string
        }
        Update: {
          acteur_id?: string
          commentaire?: string
          created_at?: string
          date_formation?: string
          description?: string
          duree_heures?: number
          efficacite?: string
          formateur?: string
          id?: string
          preuve?: string | null
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formations_acteur_id_fkey"
            columns: ["acteur_id"]
            isOneToOne: false
            referencedRelation: "acteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_actions: {
        Row: {
          created_at: string
          date_prevue: string | null
          deadline: string | null
          description: string
          id: string
          indicator_id: string
          responsable: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_prevue?: string | null
          deadline?: string | null
          description?: string
          id?: string
          indicator_id: string
          responsable?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_prevue?: string | null
          deadline?: string | null
          description?: string
          id?: string
          indicator_id?: string
          responsable?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_actions_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_moyens: {
        Row: {
          budget: number | null
          created_at: string
          date_prevue: string | null
          deadline: string | null
          description: string
          id: string
          indicator_id: string
          responsable: string | null
          statut: string
          type_moyen: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          date_prevue?: string | null
          deadline?: string | null
          description?: string
          id?: string
          indicator_id: string
          responsable?: string | null
          statut?: string
          type_moyen?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          date_prevue?: string | null
          deadline?: string | null
          description?: string
          id?: string
          indicator_id?: string
          responsable?: string | null
          statut?: string
          type_moyen?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_moyens_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_values: {
        Row: {
          commentaire: string | null
          created_at: string
          date_mesure: string
          id: string
          indicator_id: string
          saisi_par: string | null
          valeur: number
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          date_mesure: string
          id?: string
          indicator_id: string
          saisi_par?: string | null
          valeur: number
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          date_mesure?: string
          id?: string
          indicator_id?: string
          saisi_par?: string | null
          valeur?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_values_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          cible: number | null
          created_at: string
          formule: string | null
          frequence: Database["public"]["Enums"]["indicator_frequency"]
          id: string
          moyens: string | null
          nom: string
          process_id: string
          seuil_alerte: number | null
          type_indicateur: Database["public"]["Enums"]["indicator_type"]
          unite: string | null
          updated_at: string
        }
        Insert: {
          cible?: number | null
          created_at?: string
          formule?: string | null
          frequence?: Database["public"]["Enums"]["indicator_frequency"]
          id?: string
          moyens?: string | null
          nom: string
          process_id: string
          seuil_alerte?: number | null
          type_indicateur?: Database["public"]["Enums"]["indicator_type"]
          unite?: string | null
          updated_at?: string
        }
        Update: {
          cible?: number | null
          created_at?: string
          formule?: string | null
          frequence?: Database["public"]["Enums"]["indicator_frequency"]
          id?: string
          moyens?: string | null
          nom?: string
          process_id?: string
          seuil_alerte?: number | null
          type_indicateur?: Database["public"]["Enums"]["indicator_type"]
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      management_reviews: {
        Row: {
          actions_decidees: string
          compte_rendu: string
          created_at: string
          date_revue: string
          decisions: string
          elements_entree: string
          id: string
          participants: string
          prochaine_revue: string | null
          reference: string
          responsable_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          actions_decidees?: string
          compte_rendu?: string
          created_at?: string
          date_revue?: string
          decisions?: string
          elements_entree?: string
          id?: string
          participants?: string
          prochaine_revue?: string | null
          reference?: string
          responsable_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          actions_decidees?: string
          compte_rendu?: string
          created_at?: string
          date_revue?: string
          decisions?: string
          elements_entree?: string
          id?: string
          participants?: string
          prochaine_revue?: string | null
          reference?: string
          responsable_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: []
      }
      nonconformities: {
        Row: {
          audit_id: string | null
          cause_racine: string | null
          correction_immediate: string | null
          created_at: string
          created_by: string | null
          criticite: number | null
          date_detection: string
          description: string
          gravite: Database["public"]["Enums"]["nc_severity"]
          id: string
          nature_nc: string | null
          origine: string | null
          plan_action: string | null
          process_id: string | null
          reference: string
          resultats_actions: string | null
          statut: Database["public"]["Enums"]["nc_status"]
          updated_at: string
          verification_efficacite: string | null
        }
        Insert: {
          audit_id?: string | null
          cause_racine?: string | null
          correction_immediate?: string | null
          created_at?: string
          created_by?: string | null
          criticite?: number | null
          date_detection?: string
          description: string
          gravite: Database["public"]["Enums"]["nc_severity"]
          id?: string
          nature_nc?: string | null
          origine?: string | null
          plan_action?: string | null
          process_id?: string | null
          reference: string
          resultats_actions?: string | null
          statut?: Database["public"]["Enums"]["nc_status"]
          updated_at?: string
          verification_efficacite?: string | null
        }
        Update: {
          audit_id?: string | null
          cause_racine?: string | null
          correction_immediate?: string | null
          created_at?: string
          created_by?: string | null
          criticite?: number | null
          date_detection?: string
          description?: string
          gravite?: Database["public"]["Enums"]["nc_severity"]
          id?: string
          nature_nc?: string | null
          origine?: string | null
          plan_action?: string | null
          process_id?: string | null
          reference?: string
          resultats_actions?: string | null
          statut?: Database["public"]["Enums"]["nc_status"]
          updated_at?: string
          verification_efficacite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nonconformities_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nonconformities_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_elements: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          ordre: number
          process_id: string
          type: Database["public"]["Enums"]["process_element_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          id?: string
          ordre?: number
          process_id: string
          type: Database["public"]["Enums"]["process_element_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          ordre?: number
          process_id?: string
          type?: Database["public"]["Enums"]["process_element_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_elements_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_evaluations: {
        Row: {
          created_at: string
          description: string
          id: string
          nom: string
          process_id: string | null
          resultat: string
          score_ca: number
          score_objectifs: number
          score_perennite: number
          score_risques: number
          score_satisfaction: number
          score_total: number
          statut: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          nom: string
          process_id?: string | null
          resultat?: string
          score_ca?: number
          score_objectifs?: number
          score_perennite?: number
          score_risques?: number
          score_satisfaction?: number
          score_total?: number
          statut?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          nom?: string
          process_id?: string | null
          resultat?: string
          score_ca?: number
          score_objectifs?: number
          score_perennite?: number
          score_risques?: number
          score_satisfaction?: number
          score_total?: number
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_evaluations_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_interactions: {
        Row: {
          created_at: string
          direction: string
          element_id: string
          id: string
          source_process_id: string
          target_process_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          element_id: string
          id?: string
          source_process_id: string
          target_process_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          element_id?: string
          id?: string
          source_process_id?: string
          target_process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_interactions_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "process_elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_interactions_source_process_id_fkey"
            columns: ["source_process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_interactions_target_process_id_fkey"
            columns: ["target_process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_tasks: {
        Row: {
          code: string
          condition: string | null
          created_at: string
          description: string
          documents: string[] | null
          entrees: string | null
          id: string
          ordre: number
          parent_code: string | null
          process_id: string
          responsable_id: string | null
          sorties: string | null
          type_flux: Database["public"]["Enums"]["task_flow_type"]
          updated_at: string
        }
        Insert: {
          code: string
          condition?: string | null
          created_at?: string
          description?: string
          documents?: string[] | null
          entrees?: string | null
          id?: string
          ordre?: number
          parent_code?: string | null
          process_id: string
          responsable_id?: string | null
          sorties?: string | null
          type_flux?: Database["public"]["Enums"]["task_flow_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          condition?: string | null
          created_at?: string
          description?: string
          documents?: string[] | null
          entrees?: string | null
          id?: string
          ordre?: number
          parent_code?: string | null
          process_id?: string
          responsable_id?: string | null
          sorties?: string | null
          type_flux?: Database["public"]["Enums"]["task_flow_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_tasks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_tasks_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "acteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      process_versions: {
        Row: {
          created_at: string
          donnees: Json
          id: string
          modifie_par: string | null
          process_id: string
          version: number
        }
        Insert: {
          created_at?: string
          donnees: Json
          id?: string
          modifie_par?: string | null
          process_id: string
          version: number
        }
        Update: {
          created_at?: string
          donnees?: Json
          id?: string
          modifie_par?: string | null
          process_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "process_versions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          activites: string | null
          code: string
          created_at: string
          description: string | null
          donnees_entree: string | null
          donnees_sortie: string | null
          finalite: string | null
          id: string
          inclure_bpmn_pdf: boolean
          interactions: string | null
          nom: string
          parties_prenantes: string | null
          responsable_id: string | null
          ressources: string | null
          statut: Database["public"]["Enums"]["process_status"]
          type_processus: Database["public"]["Enums"]["process_type"]
          updated_at: string
          version_courante: number
        }
        Insert: {
          activites?: string | null
          code: string
          created_at?: string
          description?: string | null
          donnees_entree?: string | null
          donnees_sortie?: string | null
          finalite?: string | null
          id?: string
          inclure_bpmn_pdf?: boolean
          interactions?: string | null
          nom: string
          parties_prenantes?: string | null
          responsable_id?: string | null
          ressources?: string | null
          statut?: Database["public"]["Enums"]["process_status"]
          type_processus: Database["public"]["Enums"]["process_type"]
          updated_at?: string
          version_courante?: number
        }
        Update: {
          activites?: string | null
          code?: string
          created_at?: string
          description?: string | null
          donnees_entree?: string | null
          donnees_sortie?: string | null
          finalite?: string | null
          id?: string
          inclure_bpmn_pdf?: boolean
          interactions?: string | null
          nom?: string
          parties_prenantes?: string | null
          responsable_id?: string | null
          ressources?: string | null
          statut?: Database["public"]["Enums"]["process_status"]
          type_processus?: Database["public"]["Enums"]["process_type"]
          updated_at?: string
          version_courante?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          acteur_id: string | null
          actif: boolean
          created_at: string
          email: string
          fonction: string | null
          id: string
          nom: string
          prenom: string
          updated_at: string
        }
        Insert: {
          acteur_id?: string | null
          actif?: boolean
          created_at?: string
          email?: string
          fonction?: string | null
          id: string
          nom?: string
          prenom?: string
          updated_at?: string
        }
        Update: {
          acteur_id?: string | null
          actif?: boolean
          created_at?: string
          email?: string
          fonction?: string | null
          id?: string
          nom?: string
          prenom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_acteur_id_fkey"
            columns: ["acteur_id"]
            isOneToOne: false
            referencedRelation: "acteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_objectives: {
        Row: {
          cible: string
          commentaire: string
          created_at: string
          description: string
          echeance: string | null
          id: string
          indicateur: string
          process_id: string | null
          reference: string
          responsable_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          cible?: string
          commentaire?: string
          created_at?: string
          description?: string
          echeance?: string | null
          id?: string
          indicateur?: string
          process_id?: string | null
          reference?: string
          responsable_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          cible?: string
          commentaire?: string
          created_at?: string
          description?: string
          echeance?: string | null
          id?: string
          indicateur?: string
          process_id?: string | null
          reference?: string
          responsable_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_objectives_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_policy: {
        Row: {
          approuve_par: string | null
          contenu: string
          created_at: string
          date_approbation: string | null
          id: string
          objectifs: string
          statut: string
          titre: string
          updated_at: string
          version: number
        }
        Insert: {
          approuve_par?: string | null
          contenu?: string
          created_at?: string
          date_approbation?: string | null
          id?: string
          objectifs?: string
          statut?: string
          titre?: string
          updated_at?: string
          version?: number
        }
        Update: {
          approuve_par?: string | null
          contenu?: string
          created_at?: string
          date_approbation?: string | null
          id?: string
          objectifs?: string
          statut?: string
          titre?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      review_decisions: {
        Row: {
          created_at: string
          description: string
          echeance: string | null
          id: string
          input_item_id: string | null
          ordre: number
          responsable_id: string | null
          review_id: string
          source_entity_id: string | null
          source_entity_type: string | null
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          echeance?: string | null
          id?: string
          input_item_id?: string | null
          ordre?: number
          responsable_id?: string | null
          review_id: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          statut?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          echeance?: string | null
          id?: string
          input_item_id?: string | null
          ordre?: number
          responsable_id?: string | null
          review_id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_decisions_input_item_id_fkey"
            columns: ["input_item_id"]
            isOneToOne: false
            referencedRelation: "review_input_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_decisions_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "acteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_decisions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "management_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_input_items: {
        Row: {
          commentaire: string
          created_at: string
          entity_id: string | null
          id: string
          label: string
          ordre: number
          parent_id: string | null
          review_id: string
          type: string
          updated_at: string
        }
        Insert: {
          commentaire?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          label?: string
          ordre?: number
          parent_id?: string | null
          review_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          commentaire?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          label?: string
          ordre?: number
          parent_id?: string | null
          review_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_input_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "review_input_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_input_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "management_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_actions: {
        Row: {
          created_at: string
          date_prevue: string | null
          deadline: string | null
          description: string
          id: string
          responsable: string | null
          risk_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_prevue?: string | null
          deadline?: string | null
          description?: string
          id?: string
          responsable?: string | null
          risk_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_prevue?: string | null
          deadline?: string | null
          description?: string
          id?: string
          responsable?: string | null
          risk_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_actions_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_incidents: {
        Row: {
          actions_correctives: string | null
          created_at: string
          date_incident: string
          description: string
          gravite: string
          id: string
          process_id: string | null
          responsable: string | null
          risk_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          actions_correctives?: string | null
          created_at?: string
          date_incident?: string
          description: string
          gravite?: string
          id?: string
          process_id?: string | null
          responsable?: string | null
          risk_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          actions_correctives?: string | null
          created_at?: string
          date_incident?: string
          description?: string
          gravite?: string
          id?: string
          process_id?: string | null
          responsable?: string | null
          risk_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_incidents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_incidents_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_moyens: {
        Row: {
          budget: number | null
          created_at: string
          date_prevue: string | null
          deadline: string | null
          description: string
          id: string
          responsable: string | null
          risk_id: string
          statut: string
          type_moyen: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          date_prevue?: string | null
          deadline?: string | null
          description?: string
          id?: string
          responsable?: string | null
          risk_id: string
          statut?: string
          type_moyen?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          date_prevue?: string | null
          deadline?: string | null
          description?: string
          id?: string
          responsable?: string | null
          risk_id?: string
          statut?: string
          type_moyen?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_moyens_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      risks_opportunities: {
        Row: {
          actions_traitement: string | null
          created_at: string
          criticite: number | null
          description: string
          id: string
          impact: number | null
          probabilite: number | null
          process_id: string
          statut: string
          type: Database["public"]["Enums"]["risk_type"]
          updated_at: string
        }
        Insert: {
          actions_traitement?: string | null
          created_at?: string
          criticite?: number | null
          description: string
          id?: string
          impact?: number | null
          probabilite?: number | null
          process_id: string
          statut?: string
          type: Database["public"]["Enums"]["risk_type"]
          updated_at?: string
        }
        Update: {
          actions_traitement?: string | null
          created_at?: string
          criticite?: number | null
          description?: string
          id?: string
          impact?: number | null
          probabilite?: number | null
          process_id?: string
          statut?: string
          type?: Database["public"]["Enums"]["risk_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_opportunities_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_read: boolean
          can_read_detail: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_read?: boolean
          can_read_detail?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_read?: boolean
          can_read_detail?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      satisfaction_surveys: {
        Row: {
          actions_prevues: string
          analyse_resultats: string
          created_at: string
          date_enquete: string
          id: string
          nombre_reponses: number
          process_id: string | null
          reference: string
          responsable_id: string | null
          score_global: number | null
          statut: string
          titre: string
          type_enquete: string
          updated_at: string
        }
        Insert: {
          actions_prevues?: string
          analyse_resultats?: string
          created_at?: string
          date_enquete?: string
          id?: string
          nombre_reponses?: number
          process_id?: string | null
          reference?: string
          responsable_id?: string | null
          score_global?: number | null
          statut?: string
          titre?: string
          type_enquete?: string
          updated_at?: string
        }
        Update: {
          actions_prevues?: string
          analyse_resultats?: string
          created_at?: string
          date_enquete?: string
          id?: string
          nombre_reponses?: number
          process_id?: string | null
          reference?: string
          responsable_id?: string | null
          score_global?: number | null
          statut?: string
          titre?: string
          type_enquete?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          commentaire: string
          contact: string
          created_at: string
          criteres_evaluation: string
          date_evaluation: string | null
          domaine: string
          email: string | null
          id: string
          nom: string
          reference: string
          score_evaluation: number | null
          statut: string
          telephone: string | null
          type_prestataire: string
          updated_at: string
        }
        Insert: {
          commentaire?: string
          contact?: string
          created_at?: string
          criteres_evaluation?: string
          date_evaluation?: string | null
          domaine?: string
          email?: string | null
          id?: string
          nom?: string
          reference?: string
          score_evaluation?: number | null
          statut?: string
          telephone?: string | null
          type_prestataire?: string
          updated_at?: string
        }
        Update: {
          commentaire?: string
          contact?: string
          created_at?: string
          criteres_evaluation?: string
          date_evaluation?: string | null
          domaine?: string
          email?: string | null
          id?: string
          nom?: string
          reference?: string
          score_evaluation?: number | null
          statut?: string
          telephone?: string | null
          type_prestataire?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_custom_roles: {
        Row: {
          created_at: string
          custom_role_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_role_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_role_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      acteur_type: "interne" | "externe"
      action_status:
        | "planifiee"
        | "en_cours"
        | "realisee"
        | "verifiee"
        | "cloturee"
        | "en_retard"
      action_type: "corrective" | "preventive" | "amelioration"
      app_role:
        | "rmq"
        | "responsable_processus"
        | "consultant"
        | "auditeur"
        | "admin"
        | "acteur"
      audit_status: "planifie" | "en_cours" | "termine" | "cloture"
      audit_type: "interne" | "externe"
      context_issue_type: "interne" | "externe"
      document_type:
        | "procedure"
        | "instruction"
        | "formulaire"
        | "enregistrement"
        | "rapport"
        | "compte_rendu_audit"
        | "preuve"
      finding_type:
        | "conformite"
        | "observation"
        | "non_conformite_mineure"
        | "non_conformite_majeure"
        | "amelioration"
      impact_level: "faible" | "moyen" | "fort"
      indicator_frequency:
        | "quotidien"
        | "hebdomadaire"
        | "mensuel"
        | "trimestriel"
        | "semestriel"
        | "annuel"
      indicator_type: "activite" | "resultat" | "perception" | "interne"
      nc_severity: "mineure" | "majeure" | "critique"
      nc_status:
        | "ouverte"
        | "en_traitement"
        | "cloturee"
        | "correction"
        | "analyse_cause"
        | "action_corrective"
        | "verification"
      process_element_type:
        | "finalite"
        | "donnee_entree"
        | "donnee_sortie"
        | "activite"
        | "interaction"
        | "partie_prenante"
        | "ressource"
      process_status: "brouillon" | "en_validation" | "valide" | "archive"
      process_type: "pilotage" | "realisation" | "support"
      risk_type: "risque" | "opportunite"
      task_flow_type: "sequentiel" | "conditionnel" | "parallele" | "inclusif"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      acteur_type: ["interne", "externe"],
      action_status: [
        "planifiee",
        "en_cours",
        "realisee",
        "verifiee",
        "cloturee",
        "en_retard",
      ],
      action_type: ["corrective", "preventive", "amelioration"],
      app_role: [
        "rmq",
        "responsable_processus",
        "consultant",
        "auditeur",
        "admin",
        "acteur",
      ],
      audit_status: ["planifie", "en_cours", "termine", "cloture"],
      audit_type: ["interne", "externe"],
      context_issue_type: ["interne", "externe"],
      document_type: [
        "procedure",
        "instruction",
        "formulaire",
        "enregistrement",
        "rapport",
        "compte_rendu_audit",
        "preuve",
      ],
      finding_type: [
        "conformite",
        "observation",
        "non_conformite_mineure",
        "non_conformite_majeure",
        "amelioration",
      ],
      impact_level: ["faible", "moyen", "fort"],
      indicator_frequency: [
        "quotidien",
        "hebdomadaire",
        "mensuel",
        "trimestriel",
        "semestriel",
        "annuel",
      ],
      indicator_type: ["activite", "resultat", "perception", "interne"],
      nc_severity: ["mineure", "majeure", "critique"],
      nc_status: [
        "ouverte",
        "en_traitement",
        "cloturee",
        "correction",
        "analyse_cause",
        "action_corrective",
        "verification",
      ],
      process_element_type: [
        "finalite",
        "donnee_entree",
        "donnee_sortie",
        "activite",
        "interaction",
        "partie_prenante",
        "ressource",
      ],
      process_status: ["brouillon", "en_validation", "valide", "archive"],
      process_type: ["pilotage", "realisation", "support"],
      risk_type: ["risque", "opportunite"],
      task_flow_type: ["sequentiel", "conditionnel", "parallele", "inclusif"],
    },
  },
} as const
