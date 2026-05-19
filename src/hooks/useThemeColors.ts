import { theme } from '@/theme';
import { useThemeContext } from '@/context/ThemeContext';

const lightColors = {
    ...theme.colors,
    divider: '#E5E7EB',
    black: '#000000',
    white: '#FFFFFF',
};

const darkColors = {
    primary: '#3A7D44',         // Rich premium green (better contrast and visibility in dark mode)
    secondary: '#E2E8F0',       // Slate-200 for headlines/headings
    accent: '#d9ab83',          // Soft Sandy Gold
    background: '#121824',      // Elegant Deep Slate Blue-Gray (NOT pure black)
    surface: '#1E2638',         // Elegant lighter slate blue-gray for cards & surface elements
    divider: '#2A354F',         // Soft slate-blue divider
    text: '#E2E8F0',            // Clean light-slate for primary text readability
    textSecondary: '#94A3B8',   // Slate-400 for secondary text
    muted: '#64748B',           // Slate-500 for descriptions and muted elements
    border: '#2E3B56',          // Dark slate border
    error: '#EF4444',
    success: '#10B981',
    black: '#000000',
    white: '#FFFFFF',
};

export function useThemeColors() {
    try {
        const { isDarkMode } = useThemeContext();
        return isDarkMode ? darkColors : lightColors;
    } catch (e) {
        return lightColors;
    }
}

export function useIsDarkMode() {
    try {
        const { isDarkMode } = useThemeContext();
        return isDarkMode;
    } catch (e) {
        return false;
    }
}

