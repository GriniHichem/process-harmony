import { useLicense } from "@/contexts/LicenseContext";
import { AlertTriangle, Info, ShieldAlert, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function LicenseBanner() {
  const { alertMessage, alertLevel, status } = useLicense();

  if (!alertMessage) return null;

  const styles = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
    destructive: "bg-destructive/10 border-destructive/30 text-destructive",
  };

  const Icon = status === "expired" ? Lock : status === "grace" ? ShieldAlert : status === "trial" ? Info : AlertTriangle;

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 text-sm font-medium border-b", styles[alertLevel!])}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{alertMessage}</span>
    </div>
  );
}
