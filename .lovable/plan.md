

# Fix: Consultation PDF in-app + restriction du téléchargement

## Probleme identifié

1. **Page Documents** : les PDFs s'ouvrent dans un nouvel onglet (`window.open`) au lieu d'un viewer intégré — cela permet le téléchargement libre
2. **Page ProcessDetail (ressources)** : le viewer intégré existe déjà et fonctionne, mais il n'y a pas de bouton de téléchargement séparé — et tous les utilisateurs ont accès de la même manière

## Plan

### 1. Page Documents (`src/pages/Documents.tsx`)
- Ajouter un état `pdfViewerUrl`, `pdfViewerTitle`, `pdfFullscreen` (comme ProcessDetail)
- Ajouter un Dialog PDF viewer intégré avec bouton plein écran (identique à ProcessDetail)
- Le bouton Eye (consulter) ouvre le PDF dans le viewer intégré pour TOUS les utilisateurs
- Ajouter un bouton Download séparé visible UNIQUEMENT pour `rmq`, `admin`, `super_admin`
- Pour les fichiers non-PDF : le téléchargement reste conditionné aux mêmes rôles

### 2. Page ProcessDetail (`src/pages/ProcessDetail.tsx`)
- Section ressources (lignes 393-429) : séparer les boutons "Consulter" et "Télécharger"
- Bouton Eye (consulter PDF) : visible pour tous — ouvre le viewer intégré existant
- Bouton Download (télécharger) : visible uniquement pour `rmq`, `admin`, `super_admin`
- Pour fichiers non-PDF : bouton téléchargement conditionné aux mêmes rôles

### Rôles autorisés au téléchargement
```
const canDownload = hasRole("rmq") || hasRole("admin") || hasRole("super_admin");
```

### Aucun changement backend nécessaire
Les politiques RLS sur `storage.objects` permettent déjà le SELECT pour tous les utilisateurs authentifiés. La restriction du téléchargement est purement côté UI (le viewer iframe ne permet pas le téléchargement natif du blob).

