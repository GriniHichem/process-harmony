

# Plan: Corriger les 3 problemes documents/suppression/elements

## Probleme 1 : Document ne s'associe pas aux processus (erreur 403)

Les politiques RLS sur `document_processes` sont toutes `RESTRICTIVE`. Avec ce mode, **toutes** les policies doivent passer. L'utilisateur RMQ passe `document_processes_insert` mais echoue sur `document_processes_insert_admin`. Il faut changer les policies en `PERMISSIVE` (une seule doit passer).

**Migration SQL** : Supprimer les 4 policies INSERT/DELETE restrictives et les recreer en PERMISSIVE.

## Probleme 2 : AdminPasswordDialog uniquement pour suppression de processus

Retirer le `AdminPasswordDialog` de :
- `src/pages/Documents.tsx` : revenir a une suppression directe avec confirmation simple
- `src/components/ProcessTasksTable.tsx` : revenir a une suppression directe

Seul `src/pages/Processus.tsx` conserve le dialog admin.

## Probleme 3 : Documents dans l'onglet Elements (Ressources), pas un onglet separe

Supprimer l'onglet "Documents" de `ProcessDetail.tsx`. A la place, afficher les documents associes au processus dans la section "Ressources" de l'onglet Elements, sous la liste des elements de type `ressource`.

### Fichiers modifies
- **Migration SQL** : corriger RLS `document_processes` (RESTRICTIVE -> PERMISSIVE)
- `src/pages/Documents.tsx` : retirer AdminPasswordDialog, utiliser confirm() simple
- `src/components/ProcessTasksTable.tsx` : retirer AdminPasswordDialog, utiliser confirm() simple  
- `src/pages/ProcessDetail.tsx` : supprimer onglet Documents, integrer les documents dans la section Ressources de l'onglet Elements

