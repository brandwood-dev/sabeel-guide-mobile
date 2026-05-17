import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/theme';

export default function Index() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const token = await AsyncStorage.getItem('auth_token');
                if (token) {
                    router.replace('/(views)/(tabs)/home');
                } else {
                    router.replace('/(onboarding)');
                }
            } catch (e) {
                router.replace('/(onboarding)');
            } finally {
                setChecking(false);
            }
        };
        checkSession();
    }, []);

    if (checking) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return null;
}

