import { useState, useEffect } from "react";
import { HelpModeProvider } from "@/contexts/HelpModeContext";
import { AppNavbar } from "@/components/AppNavbar";
import { LicenseBanner } from "@/components/LicenseBanner";
import { OnboardingCarousel } from "@/components/OnboardingCarousel";
import { supabase } from "@/integrations/supabase/client";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (uid && !localStorage.getItem(`qprocess_onboarding_seen_${uid}`)) {
        setShowOnboarding(true);
      }
    });
  }, []);

  const handleOnboardingComplete = () => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (uid) localStorage.setItem(`qprocess_onboarding_seen_${uid}`, "true");
    });
    setShowOnboarding(false);
  };

  return (
    <HelpModeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <LicenseBanner />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 overflow-auto">
          {children}
        </main>
        {showOnboarding && <OnboardingCarousel onComplete={handleOnboardingComplete} />}
      </div>
    </HelpModeProvider>
  );
}
