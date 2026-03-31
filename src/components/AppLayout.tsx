import { useEffect, useState } from "react";
import { HelpModeProvider } from "@/contexts/HelpModeContext";
import { AppNavbar } from "@/components/AppNavbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HelpModeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </HelpModeProvider>
  );
}
