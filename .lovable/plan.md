

# Import CSV des activités de processus

## Fonctionnalité

Bouton visible uniquement pour admin/super_admin dans l'onglet "Activités" de ProcessDetail. Permet d'uploader un fichier CSV pour importer/écraser les activités du processus, avec création automatique des entrées/sorties manquantes et résolution des acteurs.

## Format CSV supporté

```text
Code,Description,Type de flux,Entrées,Sorties,Responsable
1,Réceptionner la demande,Séquentiel,"Demande utilisateur, incident",Demande qualifiée,Help Desk
```

- Délimiteur : auto-détection `,` ou `;`
- Encodage : UTF-8 avec caractères spéciaux (é, ç, à...)
- Entrées/Sorties : séparées par virgule dans le champ (entre guillemets si nécessaire)

## Logique d'import

1. **Parser le CSV** : détecter délimiteur (`;` vs `,`), gérer les guillemets, décoder UTF-8
2. **Mapper le type de flux** : "Séquentiel" → `sequentiel`, "Conditionnel" → `conditionnel`, "Parallèle" → `parallele`, "Inclusif" → `inclusif`
3. **Entrées/Sorties** :
   - Pour chaque description listée, chercher un `process_element` existant (donnee_entree ou donnee_sortie) par description
   - Si non trouvé → créer le `process_element` avec un code auto-généré (DE-XXX / DS-XXX)
   - Stocker les codes séparés par virgule dans `entrees` / `sorties`
4. **Responsable** :
   - Chercher dans `acteurs` par `fonction` (match partiel, le CSV peut contenir "Help Desk / Responsable SI" → on prend le premier match)
   - Si trouvé → `responsable_id` = acteur.id
   - Si non trouvé → laisser `responsable_id` = null
5. **Tâches** :
   - Supprimer toutes les tâches existantes du processus (mode écrasement)
   - Insérer les nouvelles avec code, description, type_flux, ordre séquentiel
6. **Feedback** : dialog de prévisualisation avec nombre de lignes, éléments à créer, acteurs matchés/non matchés, puis confirmation

## Composant : `CsvTaskImporter`

Nouveau fichier `src/components/CsvTaskImporter.tsx` :
- Props : `processId`, `processElements`, `onComplete` (callback pour refresh)
- UI : Bouton Upload (icône FileUp) → input file hidden → Dialog de preview/confirmation
- Preview montre : nombre d'activités, entrées/sorties nouvelles à créer, acteurs résolus vs non résolus
- Bouton "Importer" exécute les opérations Supabase

## Intégration dans ProcessDetail

Dans l'onglet "tasks" (ligne ~459), à côté du ToggleGroup, ajouter le bouton conditionné par `hasRole("admin") || hasRole("super_admin")` :

```tsx
{(hasRole("admin") || hasRole("super_admin")) && effectiveCanEdit && (
  <CsvTaskImporter processId={id!} processElements={elements} onComplete={() => fetchElements()} />
)}
```

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/CsvTaskImporter.tsx` | Nouveau composant (parser CSV, preview, import) |
| `src/pages/ProcessDetail.tsx` | Ajouter le bouton dans la toolbar des activités |

