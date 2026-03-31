

# Corrections du module Actions — Contrôles de statut, gel et cohérence

## Problèmes identifiés

1. **Pas de confirmation pour "Terminée"** — Le statut peut être changé à "Terminée" sans message de confirmation, contrairement à la logique métier attendue.

2. **Action terminée reste modifiable** — Une action marquée "Terminée" n'est pas gelée : on peut encore modifier ses champs, tâches, responsables, etc.

3. **Multi-tâches : action terminée sans toutes les tâches terminées** — On peut forcer le statut "Terminée" sur l'action même si des tâches sont encore en cours ou à faire.

4. **recalcActionFromTasks utilise un setTimeout fragile** — Après mise à jour d'une tâche, le recalcul de l'action utilise `setTimeout(300ms)` avec des données potentiellement périmées (stale `tasksMap`).

5. **Slider avancement en mode simple : pas de sauvegarde explicite** — Les modifications sont envoyées immédiatement (ok), mais aucun feedback visuel de confirmation.

## Corrections prévues

### 1. Confirmation pour terminer une action
- Quand l'utilisateur sélectionne le statut "terminee" dans le Select, intercepter et afficher un `AlertDialog` de confirmation : "Confirmer la clôture de cette action ? Une fois terminée, l'action sera figée."
- Si multi-tâches et que des tâches ne sont pas toutes "termine", bloquer avec un message d'erreur toast : "Toutes les tâches doivent être terminées avant de clôturer l'action."

### 2. Gel de l'action terminée
- Quand `action.statut === "terminee"` :
  - Masquer le slider d'avancement
  - Désactiver les sélecteurs de responsable, date, toggle multi-tâches
  - Masquer les boutons d'ajout de tâche et de suppression
  - Afficher un bandeau vert "Action terminée — figée" avec une icône CheckCircle2
  - Seul un utilisateur avec `canEdit` peut "rouvrir" l'action (bouton pour remettre en "en_cours")
- Les tâches terminées (`statut === "termine"`) sont aussi figées individuellement (pas de toggle de statut, pas de modification)

### 3. Contrôle multi-tâches avant clôture
- Dans le handler de changement de statut, si `multi_tasks === true` et `statut cible === "terminee"` :
  - Vérifier que toutes les tâches ont `statut === "termine"`
  - Si non → `toast.error("Toutes les tâches doivent être terminées")` et annuler
  - Si oui → afficher le dialog de confirmation

### 4. Fix recalcActionFromTasks
- Au lieu du `setTimeout`, refetch les tâches depuis la DB puis recalculer :
  ```typescript
  const recalcActionFromTasks = async (actionId: string) => {
    const { data: freshTasks } = await supabase
      .from("project_tasks").select("*").eq("action_id", actionId);
    if (!freshTasks || freshTasks.length === 0) return;
    const avg = Math.round(freshTasks.reduce((s, t) => s + t.avancement, 0) / freshTasks.length);
    const statut = avg === 100 ? "terminee" : avg > 0 ? "en_cours" : "planifiee";
    await updateAction(actionId, { avancement: avg, statut });
  };
  ```

### 5. Contrôles supplémentaires
- **Date de début obligatoire avant "en_cours"** — Si on passe en "en_cours" sans `date_debut`, toast d'avertissement
- **Empêcher suppression d'action terminée** — Masquer le bouton supprimer si `statut === "terminee"`
- **Avancement cohérent avec statut** — Si avancement slider atteint 100%, proposer la confirmation de clôture au lieu de juste changer silencieusement

## Fichier modifié

| Fichier | Changements |
|---|---|
| `ProjectActionsList.tsx` | Dialog confirmation clôture, gel UI action/tâche terminée, contrôle multi-tâches, fix recalc, contrôles cohérence |

