export const theme = {
    colors: {
        primary: '#2C5F2D',    // Deep Sabeel Green
        secondary: '#111827',  // Dark Text / Heading
        accent: '#d9ab83',     // Sandy Gold Accent
        background: '#FFFFFF',
        surface: '#F9FAFB',
        divider: '#F3F4F6',
        text: '#111827',
        textSecondary: '#6B7280',
        muted: '#9CA3AF',
        border: '#E5E7EB',
        error: '#DC2626',
        success: '#10B981',
        white: '#FFFFFF',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 14,
        lg: 20,
        xl: 28,
        full: 9999,
    },
};

export type Theme = typeof theme;
