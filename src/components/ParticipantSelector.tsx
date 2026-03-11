import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, UserPlus, Users } from "lucide-react";

export interface Participant {
  type: "user" | "guest";
  id?: string;
  name: string;
  fonction?: string;
}

interface ParticipantSelectorProps {
  value: string; // JSON string of Participant[]
  onChange: (value: string) => void;
}

export function parseParticipants(value: string): Participant[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy: plain text/html — treat as single guest
    if (value.trim()) {
      const clean = value.replace(/<[^>]*>/g, "").trim();
      if (clean) return [{ type: "guest", name: clean }];
    }
  }
  return [];
}

export function formatParticipantsDisplay(value: string): string {
  const participants = parseParticipants(value);
  if (participants.length === 0) return "—";
  return participants.map(p => p.type === "user" ? `${p.name}${p.fonction ? ` (${p.fonction})` : ""}` : `${p.name} [Invité]`).join(", ");
}

export default function ParticipantSelector({ value, onChange }: ParticipantSelectorProps) {
  const [guestName, setGuestName] = useState("");
  const participants = parseParticipants(value);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_participants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nom, prenom, fonction").eq("actif", true).order("nom");
      if (error) throw error;
      return data;
    },
  });

  const update = (newList: Participant[]) => onChange(JSON.stringify(newList));

  const addUser = (profileId: string) => {
    if (profileId === "none" || participants.some(p => p.type === "user" && p.id === profileId)) return;
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const name = `${profile.prenom} ${profile.nom}`.trim() || profile.email;
    update([...participants, { type: "user", id: profileId, name, fonction: profile.fonction || "" }]);
  };

  const addGuest = () => {
    const trimmed = guestName.trim();
    if (!trimmed) return;
    update([...participants, { type: "guest", name: trimmed }]);
    setGuestName("");
  };

  const remove = (index: number) => {
    update(participants.filter((_, i) => i !== index));
  };

  const availableProfiles = profiles.filter(p => !participants.some(pp => pp.type === "user" && pp.id === p.id));

  return (
    <div className="space-y-3">
      {/* Current participants */}
      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {participants.map((p, i) => (
            <Badge key={i} variant={p.type === "user" ? "default" : "secondary"} className="flex items-center gap-1.5 py-1 px-2.5 text-sm">
              {p.type === "user" ? <Users className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
              {p.name}
              {p.fonction && <span className="text-xs opacity-70">({p.fonction})</span>}
              {p.type === "guest" && <span className="text-xs opacity-70">[Invité]</span>}
              <button type="button" onClick={() => remove(i)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add from users */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Select value="none" onValueChange={addUser}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Ajouter un utilisateur..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sélectionner un utilisateur...</SelectItem>
              {availableProfiles.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.prenom} {p.nom} {p.fonction ? `— ${p.fonction}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add guest */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Nom de l'invité externe..."
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addGuest())}
          className="h-9 flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addGuest} disabled={!guestName.trim()}>
          <UserPlus className="h-4 w-4 mr-1" />Invité
        </Button>
      </div>
    </div>
  );
}
