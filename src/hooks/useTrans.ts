import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { uiTranslations, translationService, SupportedLang } from '@/services/translationService';

/**
 * Custom Hook for App-wide Translation
 * Combined static dictionary (instant) + dynamic LibreTranslate (async)
 * Mirrors the translation system from the main Sabeel application.
 */
export function useTrans() {
    const language = useSelector((state: RootState) => state.ui.language) as SupportedLang;

    /**
     * Translates a string using the static dictionary.
     * Falls back to the key itself if no translation is found.
     */
    const t = (key: string): string => {
        if (uiTranslations[key] && uiTranslations[key][language]) {
            return uiTranslations[key][language];
        }
        return key;
    };

    /**
     * For dynamic content (like pilgrim names, group descriptions).
     * Uses LibreTranslate API with AsyncStorage caching.
     */
    const translateDynamic = async (text: string): Promise<string> => {
        return translationService.translate(text, language);
    };

    return { t, language, translateDynamic };
}
