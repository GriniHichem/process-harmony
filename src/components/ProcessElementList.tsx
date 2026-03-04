import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onAdd: (code: string, description: string) => Promise<void>;
  onUpdate: (id: string, code: string, description: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function ProcessElementList({ title, elements, canEdit, canDelete, onAdd, onUpdate, onRemove }: ProcessElementListProps) {
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const handleAdd = async () => {
    if (!newCode.trim() || !newDesc.trim()) { toast.error("Code et description requis"); return; }
    await onAdd(newCode.trim(), newDesc.trim());
    setNewCode(""); setNewDesc(""); setAdding(false);
  };

  const startEdit = (el: ProcessElement) => {
    setEditingId(el.id); setEditCode(el.code); setEditDesc(el.description);
  };

  const handleUpdate = async () => {
    if (!editingId || !editCode.trim() || !editDesc.trim()) return;
    await onUpdate(editingId, editCode.trim(), editDesc.trim());
    setEditingId(null);
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
          <div key={el.id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            {editingId === el.id ? (
              <>
                <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="h-7 w-24 text-xs font-mono" />
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-7 flex-1 text-xs" />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleUpdate}><Check className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
              </>
            ) : (
              <>
                <span className="font-mono text-xs font-medium text-primary w-24 shrink-0">{el.code}</span>
                <span className="flex-1 text-xs">{el.description}</span>
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
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2">
          <Input placeholder="Code" value={newCode} onChange={(e) => setNewCode(e.target.value)} className="h-7 w-24 text-xs font-mono" />
          <Input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="h-7 flex-1 text-xs" />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAdd}><Check className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAdding(false); setNewCode(""); setNewDesc(""); }}><X className="h-3 w-3" /></Button>
        </div>
      )}
    </div>
  );
}
