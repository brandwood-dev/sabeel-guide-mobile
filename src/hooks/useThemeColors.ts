import { theme } from '@/theme';

export function useThemeColors() {
    // Sabeel_Guide doesn't currently use Redux-based theme switching, so we just return the static theme.
    return {
        ...theme.colors,
        divider: '#E5E7EB',
        black: '#000000',
        white: '#FFFFFF',
    };
}

export function useIsDarkMode() {
    return false; // Default to false for now
}
