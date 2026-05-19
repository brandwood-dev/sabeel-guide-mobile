
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function SplashGuideFree() {
    const router = useRouter();

    useEffect(() => {
        // Keep behavior minimal: route exists so expo-router can load.
        // Redirect to main splash if this screen is ever reached.
        router.replace('/(guide)/splash' as any);
    }, [router]);

    return <View style={{ flex: 1 }} />;
}
