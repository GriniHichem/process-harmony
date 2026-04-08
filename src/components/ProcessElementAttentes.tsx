import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, CalendarIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Attente {
  id: string;
  element_id: string;
  description: string;
  date_prevue: string | null;
  created_at: string;
}

interface ProcessElementAttentesProps {
  elementId: string;
  canEdit: boolean;
}

export function ProcessElementAttentes({ elementId, canEdit }: ProcessElementAttentesProps) {
  const [attentes, setAttentes] = useState<Attente[]>([]);
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState<Date | undefined>();

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("process_element_attentes")
      .select("*")
      .eq("element_id", elementId)
      .order("created_at");
    if (data) setAttentes(data as Attente[]);
  }, [elementId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (!newDesc.trim()) { toast.error("Description requise"); return; }
    const { error } = await supabase.from("process_element_attentes").insert({
      element_id: elementId,
      description: newDesc.trim(),
      date_prevue: newDate ? format(newDate, "yyyy-MM-dd") : null,
    });
    if (error) { toast.error(error.message); return; }
    setNewDesc(""); setNewDate(undefined); setAdding(false);
    fetch();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("process_element_attentes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetch();
  };

  if (attentes.length === 0 && !canEdit) return null;

  return (
    <div className="ml-6 mt-1 space-y-0.5">
      {attentes.map((a) => (
        <div key={a.id} className="group/attente flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
          <span className="text-primary/60">├</span>
          <span className="flex-1 truncate" title={a.description}>{a.description}</span>
          {a.date_prevue && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5 font-normal shrink-0">
              <CalendarIcon className="h-2.5 w-2.5" />
              {format(new Date(a.date_prevue), "dd/MM/yyyy")}
            </Badge>
          )}
          {canEdit && (
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/attente:opacity-100 text-destructive" onClick={() => handleRemove(a.id)}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      ))}
      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary py-0.5 ml-4 transition-colors">
          <Plus className="h-2.5 w-2.5" /> Ajouter une attente
        </button>
      )}
      {adding && (
        <div className="flex items-center gap-1.5 ml-4 py-1">
          <Input placeholder="Attente..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="h-6 text-xs flex-1" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }} autoFocus />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className={cn("h-6 w-6 shrink-0", newDate && "text-primary")}>
                <CalendarIcon className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={newDate} onSelect={setNewDate} locale={fr} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={handleAdd}><Check className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAdding(false); setNewDesc(""); setNewDate(undefined); }}><X className="h-3 w-3" /></Button>
        </div>
      )}
    </div>
  );
}
