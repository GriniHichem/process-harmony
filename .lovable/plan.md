

# Ajouter le crédit Radja BENHAMIDA dans le dialogue Info

## Changement

Dans `src/components/AppLayout.tsx`, ajouter une ligne dans le dialogue Info (après les crédits existants) mentionnant que les textes d'aide contextuelle ont été rédigés par **Radja BENHAMIDA**.

### Fichier : `src/components/AppLayout.tsx` (lignes ~140)

Ajouter après le paragraphe "développée par" :

```
<p className="text-xs text-muted-foreground">
  Textes d'aide contextuelle rédigés par<br />
  <span className="font-semibold text-foreground">Radja BENHAMIDA</span>
</p>
```

C'est le seul changement nécessaire.

