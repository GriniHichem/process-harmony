import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SearchEntityType =
  | "all"
  | "processus"
  | "actions"
  | "audits"
  | "nonconformites"
  | "documents"
  | "indicateurs"
  | "risques"
  | "acteurs";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchEntityType;
  typeLabel: string;
  url: string;
  status?: string;
}

const TYPE_LABELS: Record<Exclude<SearchEntityType, "all">, string> = {
  processus: "Processus",
  actions: "Action",
  audits: "Audit",
  nonconformites: "Non-conformité",
  documents: "Document",
  indicateurs: "Indicateur",
  risques: "Risque / Enjeu",
  acteurs: "Acteur",
};

export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchEntityType>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (q: string, f: SearchEntityType) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      const term = `%${q}%`;
      const items: SearchResult[] = [];

      try {
        const queries: Promise<void>[] = [];

        if (f === "all" || f === "processus") {
          queries.push(
            (async () => {
              const { data } = await supabase
                .from("processes")
                .select("id, nom, code, type_processus, statut")
                .or(`nom.ilike.${term},code.ilike.${term},description.ilike.${term},finalite.ilike.${term}`)
                .limit(10);
                (data ?? []).forEach((p) =>
                  items.push({
                    id: p.id,
                    title: `${p.code} — ${p.nom}`,
                    subtitle: p.type_processus,
                    type: "processus",
                    typeLabel: TYPE_LABELS.processus,
                    url: `/processus/${p.id}`,
                    status: p.statut,
                  })
                );
              })
          );
        }

        if (f === "all" || f === "actions") {
          queries.push(
            supabase
              .from("actions")
              .select("id, description, type_action, statut, source_type")
              .or(`description.ilike.${term}`)
              .limit(10)
              .then(({ data }) => {
                (data ?? []).forEach((a) =>
                  items.push({
                    id: a.id,
                    title: a.description?.slice(0, 80) || "Action",
                    subtitle: `${a.type_action} · ${a.source_type}`,
                    type: "actions",
                    typeLabel: TYPE_LABELS.actions,
                    url: "/actions",
                    status: a.statut,
                  })
                );
              })
          );
        }

        if (f === "all" || f === "audits") {
          queries.push(
            supabase
              .from("audits")
              .select("id, reference, type_audit, statut, perimetre")
              .or(`reference.ilike.${term},perimetre.ilike.${term},programme.ilike.${term}`)
              .limit(10)
              .then(({ data }) => {
                (data ?? []).forEach((a) =>
                  items.push({
                    id: a.id,
                    title: a.reference,
                    subtitle: `${a.type_audit} · ${a.perimetre ?? ""}`,
                    type: "audits",
                    typeLabel: TYPE_LABELS.audits,
                    url: "/audits",
                    status: a.statut,
                  })
                );
              })
          );
        }

        if (f === "all" || f === "nonconformites") {
          queries.push(
            supabase
              .from("nonconformities")
              .select("id, reference, description, statut, gravite")
              .or(`reference.ilike.${term},description.ilike.${term},cause_racine.ilike.${term}`)
              .limit(10)
              .then(({ data }) => {
                (data ?? []).forEach((nc) =>
                  items.push({
                    id: nc.id,
                    title: nc.reference,
                    subtitle: nc.description?.slice(0, 60),
                    type: "nonconformites",
                    typeLabel: TYPE_LABELS.nonconformites,
                    url: "/non-conformites",
                    status: nc.statut,
                  })
                );
              })
          );
        }

        if (f === "all" || f === "documents") {
          queries.push(
            supabase
              .from("documents")
              .select("id, titre, type_document, description")
              .or(`titre.ilike.${term},description.ilike.${term}`)
              .eq("archive", false)
              .limit(10)
              .then(({ data }) => {
                (data ?? []).forEach((d) =>
                  items.push({
                    id: d.id,
                    title: d.titre,
                    subtitle: d.type_document,
                    type: "documents",
                    typeLabel: TYPE_LABELS.documents,
                    url: "/documents",
                  })
                );
              })
          );
        }

        if (f === "all" || f === "indicateurs") {
          queries.push(
            supabase
              .from("indicators")
              .select("id, nom, type_indicateur, unite, formule")
              .or(`nom.ilike.${term},formule.ilike.${term}`)
              .limit(10)
              .then(({ data }) => {
                (data ?? []).forEach((i) =>
                  items.push({
                    id: i.id,
                    title: i.nom,
                    subtitle: `${i.type_indicateur} · ${i.unite ?? ""}`,
                    type: "indicateurs",
                    typeLabel: TYPE_LABELS.indicateurs,
                    url: "/indicateurs",
                  })
                );
              })
          );
        }

        if (f === "all" || f === "risques") {
          queries.push(
            supabase
              .from("context_issues")
              .select("id, reference, intitule, type_enjeu, impact")
              .or(`intitule.ilike.${term},reference.ilike.${term},description.ilike.${term}`)
              .limit(10)
              .then(({ data }) => {
                (data ?? []).forEach((r) =>
                  items.push({
                    id: r.id,
                    title: `${r.reference} — ${r.intitule}`,
                    subtitle: `${r.type_enjeu} · Impact ${r.impact}`,
                    type: "risques",
                    typeLabel: TYPE_LABELS.risques,
                    url: "/enjeux-contexte",
                  })
                );
              })
          );
        }

        if (f === "all" || f === "acteurs") {
          queries.push(
            supabase
              .from("acteurs")
              .select("id, fonction, organisation, type_acteur")
              .eq("actif", true)
              .or(`fonction.ilike.${term},organisation.ilike.${term}`)
              .limit(10)
              .then(({ data }) => {
                (data ?? []).forEach((a) =>
                  items.push({
                    id: a.id,
                    title: a.fonction || a.organisation || "Acteur",
                    subtitle: `${a.type_acteur} · ${a.organisation ?? ""}`,
                    type: "acteurs",
                    typeLabel: TYPE_LABELS.acteurs,
                    url: "/acteurs",
                  })
                );
              })
          );
        }

        await Promise.all(queries);

        if (!controller.signal.aborted) {
          setResults(items);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const timeout = setTimeout(() => search(query, filter), 250);
    return () => clearTimeout(timeout);
  }, [query, filter, search]);

  return { query, setQuery, filter, setFilter, results, loading, typeLabels: TYPE_LABELS };
}
