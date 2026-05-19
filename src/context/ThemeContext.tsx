import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
    isDarkMode: boolean;
    setDarkMode: (value: boolean) => void;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDarkMode, setIsDarkModeState] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem('dark_mode_enabled');
                if (storedTheme !== null) {
                    setIsDarkModeState(storedTheme === 'true');
                }
            } catch (e) {
                console.error('Failed to load theme preference:', e);
            }
        };
        loadTheme();
    }, []);

    const setDarkMode = async (value: boolean) => {
        setIsDarkModeState(value);
        try {
            await AsyncStorage.setItem('dark_mode_enabled', String(value));
        } catch (e) {
            console.error('Failed to save theme preference:', e);
        }
    };

    const toggleDarkMode = () => {
        setDarkMode(!isDarkMode);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, setDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
};
