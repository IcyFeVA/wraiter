import React, { createContext, useState, useEffect, useContext } from 'react';
import { Store } from 'tauri-plugin-store-api';

type Theme = 'NSX' | 'Aqua' | 'AquaDark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const store = new Store('.settings.dat');

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('NSX');

  useEffect(() => {
    const loadTheme = async () => {
      const storedTheme = await store.get<Theme>('theme');
      if (storedTheme) {
        setTheme(storedTheme);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    document.body.className = `theme-${theme.toLowerCase()}`;
    store.set('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
