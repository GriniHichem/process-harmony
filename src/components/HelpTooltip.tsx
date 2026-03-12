import { HelpCircle, Lightbulb, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHelpMode } from "@/contexts/HelpModeContext";
import { helpDefinitions, categoryMeta, type HelpCategory } from "@/lib/helpDefinitions";

const categoryColors: Record<HelpCategory, { bg: string; border: string; text: string; headerBg: string }> = {
  concept:    { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    headerBg: "bg-gradient-to-r from-blue-600 to-blue-500" },
  role:       { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", headerBg: "bg-gradient-to-r from-emerald-600 to-emerald-500" },
  outil:      { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700",  headerBg: "bg-gradient-to-r from-violet-600 to-violet-500" },
  indicateur: { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   headerBg: "bg-gradient-to-r from-amber-600 to-amber-500" },
  audit:      { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     headerBg: "bg-gradient-to-r from-red-600 to-red-500" },
  pilotage:   { bg: "bg-indigo-50",  border: "border-indigo-200",  text: "text-indigo-700",  headerBg: "bg-gradient-to-r from-indigo-600 to-indigo-500" },
};

interface HelpTooltipProps {
  term: string;
  className?: string;
}

export function HelpTooltip({ term, className = "" }: HelpTooltipProps) {
  const { helpMode } = useHelpMode();
  const def = helpDefinitions[term];

  if (!helpMode || !def) return null;

  const meta = categoryMeta[def.category];
  const colors = categoryColors[def.category];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center rounded-full p-0.5 transition-all duration-300 hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
          aria-label={`Aide : ${def.title}`}
        >
          <HelpCircle
            size={15}
            className={`${colors.text} animate-pulse cursor-pointer drop-shadow-sm`}
            strokeWidth={2.5}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-[400px] p-0 rounded-xl shadow-2xl border-0 overflow-hidden backdrop-blur-xl"
      >
        {/* Category header band */}
        <div className={`${colors.headerBg} px-4 py-2.5 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.emoji}</span>
            <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
              {meta.label}
            </span>
          </div>
          {def.isoRef && (
            <span className="text-[11px] font-mono text-white/70 bg-white/15 px-2 py-0.5 rounded-full">
              {def.isoRef}
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Title */}
          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
            <div className={`w-1.5 h-5 rounded-full ${colors.headerBg}`} />
            {def.title}
          </h4>

          {/* Definition */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {def.definition}
          </p>

          {/* Details */}
          {def.details && def.details.length > 0 && (
            <div className={`${colors.bg} ${colors.border} border rounded-lg p-3 space-y-1.5`}>
              <p className={`text-xs font-semibold ${colors.text} uppercase tracking-wide mb-1`}>
                Points clés
              </p>
              {def.details.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight size={12} className={`${colors.text} mt-0.5 shrink-0`} />
                  <span className="text-xs leading-relaxed text-foreground/80">{d}</span>
                </div>
              ))}
            </div>
          )}

          {/* Example */}
          {def.example && (
            <div className="flex items-start gap-2 bg-amber-50/60 border border-amber-100 rounded-lg p-2.5">
              <Lightbulb size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed text-foreground/70">
                <span className="font-semibold text-amber-700">Exemple : </span>
                {def.example}
              </p>
            </div>
          )}

        </div>
      </PopoverContent>
    </Popover>
  );
}
