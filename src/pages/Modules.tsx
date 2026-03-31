import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { moduleGroups } from "@/components/AppNavbar";
import { Crown } from "lucide-react";

const Modules = () => {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const showAdmin = hasRole("admin") || hasRole("rmq") || hasRole("super_admin");
  const showSuperAdmin = hasRole("super_admin");

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Modules</h1>
        <p className="text-muted-foreground mt-1">Accédez rapidement à tous les modules de votre système de management qualité.</p>
      </div>

      {moduleGroups.map((group) => {
        if (group.label === "Administration" && !showAdmin) return null;
        const visible = group.items.filter(
          (item) => !item.module || hasPermission(item.module, "can_read")
        );
        if (visible.length === 0) return null;

        return (
          <section key={group.label}>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <group.icon className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{group.label}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visible.map((item) => (
                <button
                  key={item.url}
                  onClick={() => navigate(item.url)}
                  className="group relative bg-card border border-border/50 rounded-xl p-5 text-left cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3 transition-colors group-hover:from-primary/20 group-hover:to-accent/20">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm leading-tight">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                  )}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {showSuperAdmin && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Crown className="h-4 w-4 text-warning" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Super Admin</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate("/super-admin")}
              className="group relative bg-card border border-border/50 rounded-xl p-5 text-left cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-warning/30 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 flex items-center justify-center mb-3 transition-colors group-hover:from-warning/20 group-hover:to-warning/10">
                <Crown className="h-5 w-5 text-warning" />
              </div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">Configuration</h3>
              <p className="text-xs text-muted-foreground mt-1">Identité, logo, email SMTP</p>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Modules;
