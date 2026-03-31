import { HelpModeProvider } from "@/contexts/HelpModeContext";
import { AppNavbar } from "@/components/AppNavbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HelpModeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 overflow-auto">
          {children}
        </main>
      </div>
    </HelpModeProvider>
  );
}
