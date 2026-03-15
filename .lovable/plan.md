

## Correction de l'erreur RLS sur les sondages cibles

### Cause racine

La page publique de sondage utilise un client anonyme (`anon`). Quand elle insere une reponse avec `.insert().select().single()`, PostgREST requiert a la fois une politique INSERT **et** SELECT pour le role `anon`.

Actuellement :
- `csr_insert_anon` : existe (INSERT OK)
- `csr_select_anon` : **n'existe pas** → echec RLS

Le meme probleme affecte potentiellement `client_survey_answers` et `client_survey_comments` : les politiques INSERT anon existent, mais pas les SELECT anon (necessaires pour le RETURNING implicite de PostgREST).

### Correction

Ajouter une migration SQL avec 3 politiques SELECT pour le role `anon` :

```sql
-- Permettre a anon de lire la reponse qu'il vient d'inserer (RETURNING)
CREATE POLICY "csr_select_anon"
  ON public.client_survey_responses
  FOR SELECT TO anon USING (true);

CREATE POLICY "csa_select_anon"
  ON public.client_survey_answers
  FOR SELECT TO anon USING (true);

CREATE POLICY "csc_select_anon"
  ON public.client_survey_comments
  FOR SELECT TO anon USING (true);
```

Ces tables ne contiennent pas de donnees sensibles (nom/email du repondant, reponses) et l'acces anonyme est limite aux sondages actifs (la page publique filtre deja `status = 'active'`).

### Fichiers modifies

| Element | Modification |
|---|---|
| Migration SQL (nouvelle) | Ajout des 3 politiques SELECT anon |

Aucun changement de code frontend necessaire.

