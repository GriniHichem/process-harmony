import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollText } from "lucide-react";

type LogEntry = { id: string; user_id: string | null; entity_type: string; action: string; created_at: string; entity_id: string | null };

export default function Journal() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== "rmq") { setLoading(false); return; }
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => {
      setLogs((data ?? []) as LogEntry[]);
      setLoading(false);
    });
  }, [role]);

  if (role !== "rmq") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Journal d'activité</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Accès réservé au RMQ</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Journal d'activité</h1><p className="text-muted-foreground">Traçabilité des opérations</p></div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune entrée dans le journal</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm"><span className="font-medium">{log.action}</span> sur <span className="text-primary">{log.entity_type}</span></p>
                  <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("fr-FR")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
