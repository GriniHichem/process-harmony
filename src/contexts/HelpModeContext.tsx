import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface HelpModeContextType {
  helpMode: boolean;
  toggleHelpMode: () => void;
}

const HelpModeContext = createContext<HelpModeContextType>({
  helpMode: false,
  toggleHelpMode: () => {},
});

export function HelpModeProvider({ children }: { children: ReactNode }) {
  const [helpMode, setHelpMode] = useState(
    () => localStorage.getItem("qprocess-help-mode") === "true"
  );

  useEffect(() => {
    localStorage.setItem("qprocess-help-mode", String(helpMode));
  }, [helpMode]);

  return (
    <HelpModeContext.Provider value={{ helpMode, toggleHelpMode: () => setHelpMode((p) => !p) }}>
      {children}
    </HelpModeContext.Provider>
  );
}

export const useHelpMode = () => useContext(HelpModeContext);
