'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Załaduj preferencję użytkownika z localStorage
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    
    // DOMYŚLNIE LIGHT MODE!
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      // Zawsze startuj z light mode
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      
      // Natychmiastowa zmiana - wyłącz transition podczas toggle
      document.documentElement.setAttribute('data-theme-changing', 'true');
      
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      
      // Przywróć transition po zakończeniu zmiany (natychmiast)
      requestAnimationFrame(() => {
        document.documentElement.removeAttribute('data-theme-changing');
      });
      
      return newMode;
    });
  }, []);

  // Expose toggle function globally for SSR-safe components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__toggleTheme = toggleDarkMode;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__toggleTheme;
      }
    };
  }, [toggleDarkMode]);

  // Zapobiega migotaniu podczas ładowania
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

