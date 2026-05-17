import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { UserProvider } from '@/context/UserContext';
import { ChatProvider } from '@/context/ChatContext';
import { NotificationWrapper } from '@/components/NotificationWrapper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { createMessagingSocket } from '@/services/messagingSocket';
import { pruneIncomingOffers, putIncomingOffer } from '@/services/callCache';
import { useUser } from '@/context/UserContext';
import { useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        ...Ionicons.font,
        ...MaterialCommunityIcons.font,
    });

    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setVisibilityAsync('hidden');
            NavigationBar.setBehaviorAsync('overlay-swipe');
        }
    }, []);

    if (!fontsLoaded) {
        return null;
    }

    const CallOfferListener = () => {
        const router = useRouter();
        const { user } = useUser();
        const socketRef = useRef<any>(null);

        useEffect(() => {
            let isMounted = true;

            const connect = async () => {
                try {
                    const token = await AsyncStorage.getItem('auth_token');
                    if (!token) return;
                    const socket = await createMessagingSocket();
                    socketRef.current = socket;

                    try {
                        socket.off?.('call_offer');
                    } catch {}

                    socket.on('call_offer', (payload: any) => {
                        if (!isMounted) return;
                        if (!payload?.callId || !payload?.fromUserId || !payload?.sdp) return;

                        pruneIncomingOffers();
                        putIncomingOffer({
                            callId: String(payload.callId),
                            fromUserId: String(payload.fromUserId),
                            fromRole: payload?.fromRole ? String(payload.fromRole) : '',
                            sdp: payload.sdp,
                            metadata: payload?.metadata || null,
                        });

                        router.push({
                        pathname: '/(views)/(screens)/call' as any,
                        params: {
                            type: 'receiver',
                            callId: String(payload.callId),
                            fromUserId: String(payload.fromUserId),
                            fromRole: payload?.fromRole ? String(payload.fromRole) : '',
                            pilgrimUserId: String(payload.fromUserId),
                            name: payload?.metadata?.name ? String(payload.metadata.name) : 'Appel',
                            photo: payload?.metadata?.photo ? String(payload.metadata.photo) : '',
                        },
                        });
                    });
                } catch {
                    // ignore
                }
            };

            connect();
            return () => {
                isMounted = false;
                if (socketRef.current) {
                    try {
                        socketRef.current.disconnect();
                    } catch {}
                }
                socketRef.current = null;
            };
        }, [router, user?.id]);

        return null;
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Provider store={store}>
                <UserProvider>
                    <NotificationWrapper>
                        <ChatProvider>
                            <CallOfferListener />
                            <Stack screenOptions={{ headerShown: false }} />
                            <StatusBar style="auto" />
                        </ChatProvider>
                    </NotificationWrapper>
                </UserProvider>
            </Provider>
        </GestureHandlerRootView>
    );
}

