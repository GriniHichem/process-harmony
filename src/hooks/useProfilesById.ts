import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileLite {
  id: string;
  nom: string;
  prenom: string;
  fonction: string | null;
}

// Module-level cache to avoid N+1 queries across components
const cache = new Map<string, ProfileLite>();
const listeners = new Set<() => void>();

async function fetchMissing(ids: string[]) {
  const missing = ids.filter((id) => id && !cache.has(id));
  if (missing.length === 0) return;
  const { data } = await supabase
    .from("profiles")
    .select("id, nom, prenom, fonction")
    .in("id", missing);
  (data ?? []).forEach((p: any) => cache.set(p.id, p as ProfileLite));
  listeners.forEach((l) => l());
}

export function useProfilesById(ids: (string | null | undefined)[]) {
  const [, force] = useState(0);
  const cleanIds = ids.filter((x): x is string => !!x);

  useEffect(() => {
    if (cleanIds.length > 0) fetchMissing(cleanIds);
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanIds.join(",")]);

  const get = (id: string | null | undefined): ProfileLite | undefined =>
    id ? cache.get(id) : undefined;

  const formatName = (id: string | null | undefined): string | null => {
    const p = get(id);
    if (!p) return null;
    return `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || null;
  };

  return { get, formatName };
}
