import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * LibreTranslate Service
 * Integrates with LibreTranslate for dynamic app translation.
 * Uses a local cache to minimize API calls and ensure performance.
 */

const LIBRE_TRANSLATE_URL = 'https://libretranslate.de/translate';
const CACHE_KEY_PREFIX = '@sg_translation_cache_';

export type SupportedLang = 'fr' | 'en' | 'ar';

export const translationService = {
    translate: async (text: string, target: SupportedLang, source: SupportedLang = 'fr'): Promise<string> => {
        if (!text || target === source) return text;

        const cacheKey = `${CACHE_KEY_PREFIX}${target}_${text.substring(0, 50)}`;
        try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) return cached;

            const response = await axios.post(LIBRE_TRANSLATE_URL, {
                q: text,
                source,
                target,
                format: 'text',
            }, { headers: { 'Content-Type': 'application/json' } });

            const translatedText = response.data.translatedText;
            await AsyncStorage.setItem(cacheKey, translatedText);
            return translatedText;
        } catch (error) {
            console.warn('[TRANSLATION ERROR]', error);
            return text;
        }
    },

    translateList: async (list: string[], target: SupportedLang): Promise<string[]> => {
        return Promise.all(list.map(t => translationService.translate(t, target)));
    },
};

/**
 * Static Dictionary — Instant UI translations, no API needed
 */
export const uiTranslations: Record<string, Record<SupportedLang, string>> = {
    // Navigation
    'Accueil': { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' },
    'Messages': { fr: 'Messages', en: 'Messages', ar: 'الرسائل' },
    'Profil': { fr: 'Profil', en: 'Profile', ar: 'الملف الشخصي' },
    'Langue': { fr: 'Langue', en: 'Language', ar: 'اللغة' },

    // Onboarding
    'Commencer': { fr: 'Commencer', en: 'Get Started', ar: 'ابدأ الآن' },
    'Suivant': { fr: 'Suivant', en: 'Next', ar: 'التالي' },
    'Passer': { fr: 'Passer', en: 'Skip', ar: 'تخطي' },
    'Choisir la langue': { fr: 'Choisir la langue', en: 'Choose Language', ar: 'اختر اللغة' },
    'Accompagnement Spirituel': { fr: 'Accompagnement Spirituel', en: 'Spiritual Guidance', ar: 'الإرشاد الروحي' },
    'Guidez vos pèlerins avec sérénité tout au long de leur parcours sacré avec des outils dédiés.': {
        fr: 'Guidez vos pèlerins avec sérénité tout au long de leur parcours sacré avec des outils dédiés.',
        en: 'Guide your pilgrims with serenity throughout their sacred journey with dedicated tools.',
        ar: 'أرشد حجاجك بهدوء طوال رحلتهم المقدسة باستخدام أدوات مخصصة.',
    },
    'Sécurité & Tracking': { fr: 'Sécurité & Tracking', en: 'Safety & Tracking', ar: 'الأمان والتتبع' },
    'Gardez un œil sur votre groupe en temps réel et assurez leur sécurité 24h/24 grâce au GPS intégré.': {
        fr: 'Gardez un œil sur votre groupe en temps réel et assurez leur sécurité 24h/24 grâce au GPS intégré.',
        en: 'Keep an eye on your group in real-time and ensure their safety 24/7 with integrated GPS.',
        ar: 'راقب مجموعتك في الوقت الفعلي وضمن سلامتهم على مدار الساعة بفضل نظام GPS المدمج.',
    },
    'Assistance 24/7': { fr: 'Assistance 24/7', en: 'Support 24/7', ar: 'دعم على مدار الساعة' },
    'Restez en contact permanent avec vos pèlerins et répondez à leurs besoins en un instant.': {
        fr: 'Restez en contact permanent avec vos pèlerins et répondez à leurs besoins en un instant.',
        en: 'Stay in permanent contact with your pilgrims and respond to their needs instantly.',
        ar: 'ابق على تواصل دائم مع حجاجك وأجب على احتياجاتهم في لحظة.',
    },
    'Revenus Flexibles': { fr: 'Revenus Flexibles', en: 'Flexible Income', ar: 'دخل مرن' },
    'Gérez votre propre planning, fixez vos disponibilités et générez des revenus en tant que guide freelance certifié Sabeel.': {
        fr: 'Gérez votre propre planning, fixez vos disponibilités et générez des revenus en tant que guide freelance certifié Sabeel.',
        en: 'Manage your own schedule, set your availability, and earn income as a Sabeel certified freelance guide.',
        ar: 'أدر جدولك الزمني الخاص، وحدد توفرك، واكسب دخلاً كمرشد مستقل معتمد من سبيل.',
    },

    // Auth
    'Connexion': { fr: 'Connexion', en: 'Login', ar: 'تسجيل الدخول' },
    'Se connecter': { fr: 'Se connecter', en: 'Sign In', ar: 'تسجيل الدخول' },
    'Email': { fr: 'Email', en: 'Email', ar: 'البريد الإلكتروني' },
    'Mot de passe': { fr: 'Mot de passe', en: 'Password', ar: 'كلمة المرور' },
    'Mot de passe oublié ?': { fr: 'Mot de passe oublié ?', en: 'Forgot password?', ar: 'نسيت كلمة المرور؟' },
    'Continuer': { fr: 'Continuer', en: 'Continue', ar: 'استمرار' },

    // Profile
    'MON COMPTE': { fr: 'COMPTE', en: 'ACCOUNT', ar: 'الحساب' },
    'Mon Compte': { fr: 'Mon Compte', en: 'My Account', ar: 'حسابي' },
    'Informations personnelles': { fr: 'Informations personnelles', en: 'Personal Information', ar: 'المعلومات الشخصية' },
    'Mes documents': { fr: 'Mes documents', en: 'My Documents', ar: 'مستنداتي' },
    'Portefeuille': { fr: 'Portefeuille', en: 'Wallet', ar: 'المحفظة' },
    'SERVICES': { fr: 'SERVICES', en: 'SERVICES', ar: 'الخدمات' },
    'Mon agence': { fr: 'Mon agence', en: 'My Agency', ar: 'وكالتي' },
    'Mon Code QR': { fr: 'Mon Code QR', en: 'My QR Code', ar: 'رمز QR الخاص بي' },
    'PARAMÈTRES': { fr: 'PARAMÈTRES', en: 'SETTINGS', ar: 'الإعدادات' },
    'Changer le mot de passe': { fr: 'Changer le mot de passe', en: 'Change Password', ar: 'تغيير كلمة المرور' },
    'Mode sombre': { fr: 'Mode sombre', en: 'Dark Mode', ar: 'الوضع الداكن' },
    'Profil visible pour les pèlerins': { fr: 'Profil visible pour les pèlerins', en: 'Profile visible to pilgrims', ar: 'الملف الشخصي مرئي للحجاج' },
    'INFORMATIONS': { fr: 'INFORMATIONS', en: 'INFORMATION', ar: 'معلومات' },
    'Confidentialité': { fr: 'Confidentialité', en: 'Privacy', ar: 'الخصوصية' },
    'FAQ': { fr: 'FAQ', en: 'FAQ', ar: 'الأسئلة الشائعة' },
    'Aide & Support': { fr: 'Aide & Support', en: 'Help & Support', ar: 'المساعدة والدعم' },
    'À propos': { fr: 'À propos', en: 'About', ar: 'حول' },
    'COMPTE': { fr: 'COMPTE', en: 'ACCOUNT', ar: 'الحساب' },
    'Se déconnecter': { fr: 'Se déconnecter', en: 'Sign Out', ar: 'تسجيل الخروج' },
    'Supprimer le compte': { fr: 'Supprimer le compte', en: 'Delete Account', ar: 'حذف الحساب' },
    'Avis': { fr: 'Avis', en: 'Reviews', ar: 'آراء' },

    // Language page
    "Langue de l'application": { fr: "Langue de l'application", en: 'App Language', ar: 'لغة التطبيق' },
    "Sélectionnez votre langue de préférence pour l'ensemble de l'application.": {
        fr: "Sélectionnez votre langue de préférence pour l'ensemble de l'application.",
        en: 'Select your preferred language for the entire application.',
        ar: 'اختر لغتك المفضلة لكامل التطبيق.',
    },
    'Appliquer le changement': { fr: 'Appliquer le changement', en: 'Apply Change', ar: 'تطبيق التغيير' },
    'Langue modifiée': { fr: 'Langue modifiée', en: 'Language Changed', ar: 'تم تغيير اللغة' },
    'Les menus seront désormais affichés dans la langue choisie.': {
        fr: 'Les menus seront désormais affichés dans la langue choisie.',
        en: 'Menus will now be displayed in the chosen language.',
        ar: 'ستُعرض القوائم الآن باللغة المختارة.',
    },
    'Les menus et les données seront désormais affichés dans la langue choisie.': {
        fr: 'Les menus et les données seront désormais affichés dans la langue choisie.',
        en: 'Menus and data will now be displayed in the chosen language.',
        ar: 'ستُعرض القوائم والبيانات الآن باللغة المختارة.',
    },

    // Home Dashboard
    'Bonjour': { fr: 'Bonjour', en: 'Hello', ar: 'مرحباً' },
    'Votre tableau de bord aujourd\'hui': { fr: 'Votre tableau de bord aujourd\'hui', en: 'Your dashboard today', ar: 'لوحة التحكم الخاصة بك اليوم' },
    'Notifications': { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
    'Tout lire': { fr: 'Tout lire', en: 'Mark all read', ar: 'تحديد الكل كمقروء' },

    // Common
    'Annuler': { fr: 'Annuler', en: 'Cancel', ar: 'إلغاء' },
    'Confirmer': { fr: 'Confirmer', en: 'Confirm', ar: 'تأكيد' },
    'Fermer': { fr: 'Fermer', en: 'Close', ar: 'إغلاق' },
    'Enregistrer': { fr: 'Enregistrer', en: 'Save', ar: 'حفظ' },
    'Chargement...': { fr: 'Chargement...', en: 'Loading...', ar: 'جاري التحميل...' },
};
