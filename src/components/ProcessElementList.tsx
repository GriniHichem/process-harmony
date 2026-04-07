import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";

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
  customAdder?: React.ReactNode;
  helpTerm?: string;
}

const COLLAPSE_THRESHOLD = 5;

export function ProcessElementList({ title, elements, canEdit, canDelete, multiline, onAdd, onUpdate, onRemove, customAdder, helpTerm }: ProcessElementListProps) {
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const isLongList = elements.length > COLLAPSE_THRESHOLD;

  const filtered = useMemo(() => {
    if (!search.trim()) return elements;
    const q = search.toLowerCase();
    return elements.filter(el => el.code.toLowerCase().includes(q) || el.description.toLowerCase().includes(q));
  }, [elements, search]);

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

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isLongList && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          )}
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            {title}
            {helpTerm && <HelpTooltip term={helpTerm} />}
          </h4>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">{elements.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {isLongList && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSearch(!showSearch)}>
              <Search className="h-3 w-3" />
            </Button>
          )}
          {canEdit && !adding && !customAdder && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAdding(true)}>
              <Plus className="h-3 w-3 mr-1" />Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer..."
            className="h-7 pl-7 text-xs"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      )}

      {elements.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic">Aucun élément</p>
      )}

      {/* Elements list */}
      {isOpen && (
        <div className={`space-y-1 ${isLongList ? "max-h-[280px] overflow-y-auto pr-1 scrollbar-thin" : ""}`}>
          {filtered.map((el) => (
            <div
              key={el.id}
              className={`group/item flex ${multiline ? "items-start" : "items-center"} gap-2 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/40 hover:border-border/60`}
            >
              {editingId === el.id ? (
                <>
                  <span className="font-mono text-[11px] font-semibold text-primary w-16 shrink-0 pt-0.5">{el.code}</span>
                  {multiline ? (
                    <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="flex-1 text-xs min-h-[60px] resize-y" rows={3} />
                  ) : (
                    <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-7 flex-1 text-xs" />
                  )}
                  <div className={`flex ${multiline ? "flex-col" : ""} gap-0.5`}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleUpdate}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-mono text-[11px] font-semibold text-primary w-16 shrink-0">{el.code}</span>
                  <span className={`flex-1 text-xs leading-relaxed ${multiline ? "whitespace-pre-wrap" : "truncate"}`} title={el.description}>{el.description}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(el)}><Pencil className="h-3 w-3" /></Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(el.id)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {search && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-2">Aucun résultat pour « {search} »</p>
          )}
        </div>
      )}

      {/* Collapsed summary */}
      {!isOpen && elements.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {elements.slice(0, 8).map(el => (
            <Badge key={el.id} variant="outline" className="text-[10px] font-normal gap-1 max-w-[180px]">
              <span className="font-mono font-semibold text-primary">{el.code}</span>
              <span className="truncate">{el.description}</span>
            </Badge>
          ))}
          {elements.length > 8 && (
            <Badge variant="secondary" className="text-[10px] cursor-pointer" onClick={() => setIsOpen(true)}>
              +{elements.length - 8} autres
            </Badge>
          )}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className={`flex ${multiline ? "items-start" : "items-center"} gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-2.5 py-2`}>
          {multiline ? (
            <Textarea placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="flex-1 text-xs min-h-[60px] resize-y" rows={3} />
          ) : (
            <Input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="h-7 flex-1 text-xs"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }} />
          )}
          <div className={`flex ${multiline ? "flex-col" : ""} gap-0.5`}>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={handleAdd}><Check className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAdding(false); setNewDesc(""); }}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      {canEdit && customAdder}
    </div>
  );
}
