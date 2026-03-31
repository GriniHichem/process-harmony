import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { moduleGroups } from "@/components/AppNavbar";
import { Crown, ArrowRight } from "lucide-react";

const MODULE_COLORS: Record<string, string> = {
  "Principal": "from-blue-500/12 to-blue-600/6",
  "Processus": "from-violet-500/12 to-violet-600/6",
  "Manager processus": "from-emerald-500/12 to-emerald-600/6",
  "Pilotage SMQ": "from-amber-500/12 to-amber-600/6",
  "Audit & Amélioration": "from-rose-500/12 to-rose-600/6",
  "Administration": "from-slate-500/12 to-slate-600/6",
};

const ICON_COLORS: Record<string, string> = {
  "Principal": "from-blue-500 to-blue-600",
  "Processus": "from-violet-500 to-violet-600",
  "Manager processus": "from-emerald-500 to-emerald-600",
  "Pilotage SMQ": "from-amber-500 to-amber-600",
  "Audit & Amélioration": "from-rose-500 to-rose-600",
  "Administration": "from-slate-500 to-slate-600",
};

const Modules = () => {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const showAdmin = hasRole("admin") || hasRole("rmq") || hasRole("super_admin");
  const showSuperAdmin = hasRole("super_admin");

  return (
    <div className="max-w-7xl mx-auto space-y-10 page-enter">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-accent/5 to-transparent border border-border/30 p-8 md:p-10">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            Modules
          </h1>
          <p className="text-muted-foreground mt-2 text-base max-w-xl">
            Accédez à tous les modules de votre système de management qualité. 
            Sélectionnez un module pour commencer.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-8 -right-4 w-32 h-32 rounded-full bg-accent/5 blur-2xl" />
      </div>

      {moduleGroups.map((group) => {
        if (group.label === "Administration" && !showAdmin) return null;
        const visible = group.items.filter(
          (item) => !item.module || hasPermission(item.module, "can_read")
        );
        if (visible.length === 0) return null;

        const cardGradient = MODULE_COLORS[group.label] || "from-primary/10 to-primary/5";
        const iconGradient = ICON_COLORS[group.label] || "from-primary to-primary-glow";

        return (
          <section key={group.label} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-sm`}>
                <group.icon className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">{group.label}</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visible.map((item) => (
                <button
                  key={item.url}
                  onClick={() => navigate(item.url)}
                  className={`group relative bg-card border border-border/40 rounded-xl p-5 text-left cursor-pointer transition-all duration-300 hover:border-primary/25 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 overflow-hidden`}
                  style={{ boxShadow: "var(--shadow-sm)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"; }}
                >
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cardGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl`} />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-300 translate-x-0 group-hover:translate-x-0 opacity-0 group-hover:opacity-100" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {showSuperAdmin && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
              <Crown className="h-4.5 w-4.5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Super Admin</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <button
              onClick={() => navigate("/super-admin")}
              className="group relative bg-card border border-border/40 rounded-xl p-5 text-left cursor-pointer transition-all duration-300 hover:border-amber-500/25 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 overflow-hidden"
              style={{ boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"; }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground transition-all duration-300" />
                </div>
                <h3 className="font-semibold text-foreground text-sm leading-tight">Configuration</h3>
                <p className="text-xs text-muted-foreground mt-1.5">Identité, logo, email SMTP</p>
              </div>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Modules;
