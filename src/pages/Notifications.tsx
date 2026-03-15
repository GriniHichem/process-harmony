import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_url: string | null;
  is_read: boolean;
  channel: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  assignation: "Assignation",
  echeance_proche: "Échéance proche",
  retard: "En retard",
  statut_change: "Statut modifié",
};

const TYPE_COLORS: Record<string, string> = {
  assignation: "bg-blue-500",
  echeance_proche: "bg-amber-500",
  retard: "bg-destructive",
  statut_change: "bg-emerald-500",
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filterType !== "all") query = query.eq("type", filterType);
    if (filterRead === "unread") query = query.eq("is_read", false);
    if (filterRead === "read") query = query.eq("is_read", true);

    const { data } = await query;
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [user, filterType, filterRead]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotif = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteAllRead = async () => {
    await supabase.from("notifications").delete().eq("is_read", true);
    setNotifications((prev) => prev.filter((n) => !n.is_read));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
            {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="assignation">Assignation</SelectItem>
            <SelectItem value="echeance_proche">Échéance proche</SelectItem>
            <SelectItem value="retard">En retard</SelectItem>
            <SelectItem value="statut_change">Statut modifié</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterRead} onValueChange={setFilterRead}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="unread">Non lues</SelectItem>
            <SelectItem value="read">Lues</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Tout marquer comme lu
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={deleteAllRead} className="text-muted-foreground">
          <Trash2 className="h-4 w-4 mr-1" />
          Supprimer les lues
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Aucune notification</div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-4 px-4 py-3 transition-colors hover:bg-muted/50",
                    !notif.is_read && "bg-accent/20"
                  )}
                >
                  <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", TYPE_COLORS[notif.type] || "bg-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {TYPE_LABELS[notif.type] || notif.type}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        {new Date(notif.created_at).toLocaleDateString("fr-FR")} à {new Date(notif.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {notif.entity_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(notif.entity_url!)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!notif.is_read && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAsRead(notif.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteNotif(notif.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
