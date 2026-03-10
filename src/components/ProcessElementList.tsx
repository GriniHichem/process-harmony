import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ProcessElement {
  id: string;
  code: string;
  description: string;
  ordre: number;
}

interface ProcessElementListProps {
  title: string;
  elements: ProcessElement[];
  canEdit: boolean;
  canDelete: boolean;
  multiline?: boolean;
  onAdd: (description: string) => Promise<void>;
  onUpdate: (id: string, code: string, description: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function ProcessElementList({ title, elements, canEdit, canDelete, multiline, onAdd, onUpdate, onRemove }: ProcessElementListProps) {
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");

  const handleAdd = async () => {
    if (!newDesc.trim()) { toast.error("Description requise"); return; }
    await onAdd(newDesc.trim());
    setNewDesc(""); setAdding(false);
  };

  const startEdit = (el: ProcessElement) => {
    setEditingId(el.id); setEditDesc(el.description);
  };

  const handleUpdate = async () => {
    if (!editingId || !editDesc.trim()) return;
    const el = elements.find(e => e.id === editingId);
    await onUpdate(editingId, el?.code ?? "", editDesc.trim());
    setEditingId(null);
  };

  const DescField = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => {
    if (multiline) {
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-xs min-h-[60px] resize-y"
          rows={3}
        />
      );
    }
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 flex-1 text-xs"
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {canEdit && !adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3 mr-1" />Ajouter
          </Button>
        )}
      </div>

      {elements.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic">Aucun élément</p>
      )}

      <div className="space-y-1">
        {elements.map((el) => (
          <div key={el.id} className={`flex ${multiline ? "items-start" : "items-center"} gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm`}>
            {editingId === el.id ? (
              <>
                <span className="font-mono text-xs font-medium text-primary w-24 shrink-0 pt-1">{el.code}</span>
                {multiline ? (
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="flex-1 text-xs min-h-[60px] resize-y" rows={3} />
                ) : (
                  <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-7 flex-1 text-xs" />
                )}
                <div className={`flex ${multiline ? "flex-col" : ""} gap-1`}>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleUpdate}><Check className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                </div>
              </>
            ) : (
              <>
                <span className="font-mono text-xs font-medium text-primary w-24 shrink-0">{el.code}</span>
                <span className={`flex-1 text-xs ${multiline ? "whitespace-pre-wrap leading-relaxed" : ""}`}>{el.description}</span>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(el)}><Pencil className="h-3 w-3" /></Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(el.id)}><Trash2 className="h-3 w-3" /></Button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div className={`flex ${multiline ? "items-start" : "items-center"} gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2`}>
          {multiline ? (
            <Textarea placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="flex-1 text-xs min-h-[60px] resize-y" rows={3} />
          ) : (
            <Input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="h-7 flex-1 text-xs" />
          )}
          <div className={`flex ${multiline ? "flex-col" : ""} gap-1`}>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAdd}><Check className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAdding(false); setNewDesc(""); }}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
