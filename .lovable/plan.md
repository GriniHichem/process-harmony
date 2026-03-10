

# Plan: Lier les entrées/sorties des tâches aux éléments du processus

## Changements

### 1. Réordonner les onglets dans `ProcessDetail.tsx`
- Ordre : **Informations générales** → **Éléments** → **Tâches**

### 2. Modifier `ProcessTasksTable` pour lier entrées/sorties aux éléments

Les champs "Entrées" et "Sorties" des tâches deviennent des sélecteurs multi-choix parmi les éléments `donnee_entree` et `donnee_sortie` du processus, avec possibilité d'ajouter un nouvel élément directement depuis le formulaire de tâche.

**Props ajoutées** : `processElements` (liste des éléments), `onAddElement` (callback pour créer un élément et rafraichir la liste).

**Dans le formulaire de tâche (Dialog)** :
- Remplacer les `Input` texte libre pour Entrées/Sorties par des listes de checkboxes (éléments `donnee_entree` / `donnee_sortie`).
- Ajouter un petit champ "+ Ajouter" sous chaque liste pour créer un nouvel élément à la volée (appelle `onAddElement` qui insère dans `process_elements` et rafraichit).
- Stocker les codes sélectionnés dans `entrees` et `sorties` (séparés par virgule, ou comme tableau dans le champ texte).

**Dans le tableau** : afficher les descriptions des éléments sélectionnés au lieu du texte brut.

### 3. Modifier `ProcessDetail.tsx`
- Passer `elements` et `handleAddElement` comme props à `ProcessTasksTable`.
- Après ajout d'un élément depuis une tâche, appeler `fetchElements()` pour synchroniser l'onglet Éléments.

### Fichiers modifiés
- `src/pages/ProcessDetail.tsx` : réordonnement tabs + passage props
- `src/components/ProcessTasksTable.tsx` : sélecteurs multi-éléments pour entrées/sorties

