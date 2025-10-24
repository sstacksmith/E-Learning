'use client';
import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Only run on client-side
  useEffect(() => {
    setMounted(true);
    
    // Check if dark mode is active
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    
    // Listen for changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const toggleDarkMode = () => {
    // Get ThemeContext from window (set by ThemeProvider)
    const toggle = (window as any).__toggleTheme;
    if (toggle) {
      toggle();
    }
  };

  // Don't render anything during SSR
  if (!mounted) {
    return (
      <div className="p-2 w-10 h-10" aria-hidden="true" />
    );
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700"
      aria-label="Toggle dark mode"
      title={isDarkMode ? 'Przełącz na jasny tryb' : 'Przełącz na ciemny tryb'}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
