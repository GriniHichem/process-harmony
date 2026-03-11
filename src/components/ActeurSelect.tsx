import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActeurOption } from "@/hooks/useActeurs";

interface ActeurSelectProps {
  value: string;
  onChange: (value: string) => void;
  acteurs: ActeurOption[];
  placeholder?: string;
}

export function ActeurSelect({ value, onChange, acteurs, placeholder = "Sélectionner un acteur" }: ActeurSelectProps) {
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Non assigné</SelectItem>
        {acteurs.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.fonction || a.organisation || "Acteur"} {a.organisation ? `(${a.organisation})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
