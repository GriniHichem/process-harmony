import { useState, useCallback } from "react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Button } from "@/components/ui/button";
import {
  GitBranch, Map, FileText, BarChart3, ShieldAlert, AlertTriangle,
  Flame, ClipboardCheck, XCircle, ListChecks, GraduationCap,
  Users, Star, Truck, ChevronLeft, ChevronRight, X, Rocket,
  Workflow, Target, TrendingUp
} from "lucide-react";
import defaultLogo from "@/assets/logo.jpg";

interface SlideData {
  title: string;
  subtitle: string;
  icons: { icon: React.ElementType; label: string }[];
  gradient: string;
  accentColor: string;
}

const slides: SlideData[] = [
  {
    title: "",
    subtitle: "",
    icons: [],
    gradient: "from-blue-600/90 via-indigo-600/80 to-violet-700/90",
    accentColor: "text-blue-200",
  },
  {
    title: "Gestion des Processus",
    subtitle: "Modélisez, documentez et pilotez vos processus métier",
    icons: [
      { icon: GitBranch, label: "Processus" },
      { icon: Map, label: "Cartographie" },
      { icon: Workflow, label: "BPMN" },
      { icon: FileText, label: "Documents" },
    ],
    gradient: "from-violet-600/90 via-purple-600/80 to-fuchsia-700/90",
    accentColor: "text-violet-200",
  },
  {
    title: "Pilotage & Indicateurs",
    subtitle: "Suivez vos KPIs, analysez vos risques et anticipez",
    icons: [
      { icon: BarChart3, label: "Indicateurs" },
      { icon: ShieldAlert, label: "Risques" },
      { icon: AlertTriangle, label: "Enjeux" },
      { icon: Flame, label: "Incidents" },
    ],
    gradient: "from-emerald-600/90 via-teal-600/80 to-cyan-700/90",
    accentColor: "text-emerald-200",
  },
  {
    title: "Qualité & Conformité",
    subtitle: "Auditez, corrigez et améliorez en continu",
    icons: [
      { icon: ClipboardCheck, label: "Audits" },
      { icon: XCircle, label: "Non-conformités" },
      { icon: ListChecks, label: "Plans d'action" },
      { icon: Target, label: "Objectifs" },
    ],
    gradient: "from-rose-600/90 via-pink-600/80 to-red-700/90",
    accentColor: "text-rose-200",
  },
  {
    title: "Pilotage SMQ",
    subtitle: "Pilotez votre système de management de bout en bout",
    icons: [
      { icon: TrendingUp, label: "Revues" },
      { icon: GraduationCap, label: "Compétences" },
      { icon: Star, label: "Satisfaction" },
      { icon: Truck, label: "Fournisseurs" },
    ],
    gradient: "from-amber-600/90 via-orange-600/80 to-yellow-700/90",
    accentColor: "text-amber-200",
  },
  {
    title: "",
    subtitle: "",
    icons: [],
    gradient: "from-primary/90 via-blue-600/80 to-indigo-700/90",
    accentColor: "text-blue-200",
  },
];

export function OnboardingCarousel({ onComplete }: { onComplete: () => void }) {
  const { settings } = useAppSettings();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const logoSrc = settings.logo_url || defaultLogo;
  const isFirst = current === 0;
  const isLast = current === slides.length - 1;

  const go = useCallback((idx: number) => {
    setDirection(idx > current ? "right" : "left");
    setCurrent(idx);
  }, [current]);

  const next = () => go(Math.min(current + 1, slides.length - 1));
  const prev = () => go(Math.max(current - 1, 0));

  const slide = slides[current];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Skip */}
      {!isLast && (
        <button
          onClick={onComplete}
          className="absolute top-6 right-6 z-10 flex items-center gap-1 text-white/60 hover:text-white transition-colors text-sm"
        >
          Passer <X className="h-4 w-4" />
        </button>
      )}

      {/* Card */}
      <div
        key={current}
        className={`relative w-[90vw] max-w-3xl rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br ${slide.gradient} transition-all duration-300`}
      >
        <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-8 py-14 md:py-20 min-h-[420px] justify-center gap-6 pointer-events-none select-none">
          {/* Slide 1 — Welcome */}
          {isFirst && (
            <>
              <img src={logoSrc} alt={settings.company_name} className="h-16 object-contain rounded-lg shadow-lg animate-fade-in" />
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
                Bienvenue sur {settings.app_name}
              </h1>
              <p className={`text-lg md:text-xl ${slide.accentColor} max-w-lg animate-fade-in`} style={{ animationDelay: "0.2s" }}>
                {settings.app_description || "Votre système intégré ISO 9001 et gestion par processus"}
              </p>
              <p className="text-white/50 text-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
                {settings.company_name}
              </p>
            </>
          )}

          {/* Slide 6 — CTA */}
          {isLast && (
            <>
              <Rocket className="h-16 w-16 text-white animate-fade-in" />
              <h2 className="text-3xl md:text-4xl font-bold text-white animate-fade-in" style={{ animationDelay: "0.1s" }}>
                Votre espace est prêt !
              </h2>
              <p className={`text-lg ${slide.accentColor} max-w-md animate-fade-in`} style={{ animationDelay: "0.2s" }}>
                Explorez vos modules et commencez à piloter votre qualité.
              </p>
              <Button
                size="lg"
                onClick={onComplete}
                className="mt-4 bg-white text-gray-900 hover:bg-white/90 font-bold text-lg px-10 py-6 rounded-xl shadow-xl animate-fade-in pointer-events-auto"
                style={{ animationDelay: "0.3s" }}
              >
                Commencer 🚀
              </Button>
            </>
          )}

          {/* Middle slides */}
          {!isFirst && !isLast && (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-white animate-fade-in">
                {slide.title}
              </h2>
              <p className={`text-lg ${slide.accentColor} max-w-lg animate-fade-in`} style={{ animationDelay: "0.1s" }}>
                {slide.subtitle}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                {slide.icons.map((item, i) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center gap-2 animate-fade-in"
                    style={{ animationDelay: `${0.15 + i * 0.08}s` }}
                  >
                    <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-white/90 text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Arrows — above content */}
        {!isFirst && (
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {!isLast && (
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-white" : "w-2.5 bg-white/40 hover:bg-white/60"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
