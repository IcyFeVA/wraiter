import React, { createContext, useState, useEffect, useContext } from 'react';

type Theme = 'NSX' | 'Aqua' | 'AquaDark' | 'Console' | 'Abelton' | 'Lamasass';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isThemeLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to safely access localStorage
const getStoredTheme = (): Theme | null => {
  try {
    const stored = localStorage.getItem('app_theme');
    if (stored && ['NSX', 'Aqua', 'AquaDark', 'Console', 'Abelton', 'Lamasass'].includes(stored)) {
      return stored as Theme;
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }
  return null;
};

// Helper function to safely save to localStorage
const saveTheme = (theme: Theme): void => {
  try {
    localStorage.setItem('app_theme', theme);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('NSX');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      setTheme(storedTheme);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      document.body.className = `theme-${theme.toLowerCase()}`;
      saveTheme(theme);
    }
  }, [theme, isLoaded]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isThemeLoaded: isLoaded }}>
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
