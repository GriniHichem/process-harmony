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
      acteurs: {
        Row: {
          actif: boolean
          created_at: string
          fonction: string | null
          id: string
          nom: string
          organisation: string | null
          prenom: string
          type_acteur: Database["public"]["Enums"]["acteur_type"]
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          fonction?: string | null
          id?: string
          nom: string
          organisation?: string | null
          prenom?: string
          type_acteur?: Database["public"]["Enums"]["acteur_type"]
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          fonction?: string | null
          id?: string
          nom?: string
          organisation?: string | null
          prenom?: string
          type_acteur?: Database["public"]["Enums"]["acteur_type"]
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
          created_at: string
          date_audit: string | null
          date_fin: string | null
          id: string
          perimetre: string | null
          rapport: string | null
          reference: string
          statut: Database["public"]["Enums"]["audit_status"]
          type_audit: Database["public"]["Enums"]["audit_type"]
          updated_at: string
        }
        Insert: {
          auditeur_id?: string | null
          created_at?: string
          date_audit?: string | null
          date_fin?: string | null
          id?: string
          perimetre?: string | null
          rapport?: string | null
          reference: string
          statut?: Database["public"]["Enums"]["audit_status"]
          type_audit: Database["public"]["Enums"]["audit_type"]
          updated_at?: string
        }
        Update: {
          auditeur_id?: string | null
          created_at?: string
          date_audit?: string | null
          date_fin?: string | null
          id?: string
          perimetre?: string | null
          rapport?: string | null
          reference?: string
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
      nonconformities: {
        Row: {
          created_at: string
          created_by: string | null
          date_detection: string
          description: string
          gravite: Database["public"]["Enums"]["nc_severity"]
          id: string
          origine: string | null
          process_id: string | null
          reference: string
          statut: Database["public"]["Enums"]["nc_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_detection?: string
          description: string
          gravite: Database["public"]["Enums"]["nc_severity"]
          id?: string
          origine?: string | null
          process_id?: string | null
          reference: string
          statut?: Database["public"]["Enums"]["nc_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_detection?: string
          description?: string
          gravite?: Database["public"]["Enums"]["nc_severity"]
          id?: string
          origine?: string | null
          process_id?: string | null
          reference?: string
          statut?: Database["public"]["Enums"]["nc_status"]
          updated_at?: string
        }
        Relationships: [
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
          actif?: boolean
          created_at?: string
          email?: string
          fonction?: string | null
          id?: string
          nom?: string
          prenom?: string
          updated_at?: string
        }
        Relationships: []
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
      audit_status: "planifie" | "en_cours" | "termine" | "cloture"
      audit_type: "interne" | "externe"
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
      indicator_frequency:
        | "quotidien"
        | "hebdomadaire"
        | "mensuel"
        | "trimestriel"
        | "semestriel"
        | "annuel"
      indicator_type: "activite" | "resultat" | "perception" | "interne"
      nc_severity: "mineure" | "majeure" | "critique"
      nc_status: "ouverte" | "en_traitement" | "cloturee"
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
      ],
      audit_status: ["planifie", "en_cours", "termine", "cloture"],
      audit_type: ["interne", "externe"],
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
      nc_status: ["ouverte", "en_traitement", "cloturee"],
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
