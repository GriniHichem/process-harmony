import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  app_name: string;
  company_name: string;
  app_version: string;
  app_description: string;
  info_copyright: string;
  info_credits: string;
  logo_url: string;
  brand_logo_url: string;
  support_email: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  app_name: "Q-Process",
  company_name: "Groupe AMOUR",
  app_version: "v1.01",
  app_description: "Système intégré ISO 9001 et gestion par processus",
  info_copyright: "© 2026 Groupe AMOUR. Tous droits réservés.",
  info_credits: "H. GRINI & F. SERRADJ — SI TEAM",
  logo_url: "",
  brand_logo_url: "",
  support_email: "",
};

interface AppSettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSetting: (key: keyof AppSettings, value: string) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  updateSetting: async () => {},
  refreshSettings: async () => {},
});

export const useAppSettings = () => useContext(AppSettingsContext);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from("app_settings").select("key, value");
      if (data) {
        const merged = { ...DEFAULT_SETTINGS };
        for (const row of data) {
          if (row.key in merged) {
            (merged as any)[row.key] = row.value;
          }
        }
        setSettings(merged);
      }
    } catch (err) {
      console.error("Error fetching app settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    const { error } = await supabase
      .from("app_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) throw error;
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, loading, updateSetting, refreshSettings: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}
