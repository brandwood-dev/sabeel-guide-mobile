import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
    if (Notifications) return Notifications;

    if (Platform.OS === 'web') return null;

    try {
        const { NativeModulesProxy } = await import('expo-modules-core');

        if (!NativeModulesProxy.ExpoPushTokenManager) {
            console.warn(
                '[Notifications] Native module ExpoPushTokenManager not found. Falling back to local notifications.'
            );
            const mod = await import('expo-notifications');
            Notifications = mod;
            return mod;
        }

        const mod = await import('expo-notifications');
        Notifications = mod;
        return mod;
    } catch (err) {
        console.warn('[Notifications] Failed to initialize notifications', err);
        return null;
    }
}

let initialized = false;

export async function ensureNotificationSetup() {
    if (initialized) return;

    const mod = await getNotificationsModule();
    if (!mod) return;

    initialized = true;

    mod.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });

    const { status: existingStatus } = await mod.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await mod.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
        await mod.setNotificationChannelAsync('messages', {
            name: 'Messages',
            importance: mod.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            showBadge: true,
        });
    }
}

export async function presentLocalMessageNotification(opts: {
    title: string;
    body: string;
    data?: Record<string, any>;
}) {
    try {
        await ensureNotificationSetup();
        const mod = await getNotificationsModule();
        if (!mod) return;

        const { status } = await mod.getPermissionsAsync();
        if (status !== 'granted') return;

        await mod.scheduleNotificationAsync({
            content: {
                title: opts.title,
                body: opts.body,
                data: opts.data || {},
                sound: true,
                priority: mod.AndroidNotificationPriority.MAX,
                ...({
                    android: {
                        channelId: 'messages',
                        importance: mod.AndroidImportance.MAX,
                    },
                } as any),
            },
            trigger: null,
        });
    } catch (e) {
        // ignore
    }
}
