import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import type { VisualTheme } from '../types';

interface ThemeContextType {
    theme: VisualTheme;
    setTheme: (theme: VisualTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { role } = useAuth(); // Phase 6: Sync theme with Firebase role
    const [theme, setTheme] = useState<VisualTheme>(() => {
        return (localStorage.getItem('rm-visual-theme') as VisualTheme) || 'light';
    });

    useEffect(() => {
        // Automatically cascade role changes to CSS targets
        document.documentElement.setAttribute('data-theme', role);
    }, [role]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme-mode', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('rm-visual-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
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
