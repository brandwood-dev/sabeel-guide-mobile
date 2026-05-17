import React, { useEffect, useState, useRef } from 'react';
import { Alert, View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { theme } from '../../../src/theme';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from 'react-native-reanimated';
import { getUserAvatarUrl } from '@/services/media';
import { createMessagingSocket } from '@/services/messagingSocket';
import { messagingApi } from '@/services/api';
import { getIncomingOffer, popIncomingOffer } from '@/services/callCache';
import { useUser } from '@/context/UserContext';
import {
    mediaDevices,
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

const { width, height } = Dimensions.get('window');

const CallScreen = () => {
    const { name, photo, group, type = 'receiver', pilgrimUserId, callId, fromUserId, conversationId } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useUser();
    const isSender = type === 'sender';
    const [callStatus, setCallStatus] = useState(isSender ? 'Calling...' : 'Incoming call...');
    const [timer, setTimer] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);
    const ringAnimation = useSharedValue(1);
    const callStartAtRef = useRef<number | null>(null);

    const socketRef = useRef<any>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<any>(null);
    const callIdRef = useRef<string>(`call-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    const remoteUserId = useRef<string>('');

    const ensureSocketListeners = () => {
        const socket = socketRef.current;
        if (!socket) return;

        try {
            socket.off?.('call_end');
            socket.off?.('call_ice_candidate');
        } catch {}

        socket.on('call_end', (payload: any) => {
            if (payload?.callId && String(payload.callId) !== String(callIdRef.current)) return;
            endCall();
        });

        socket.on('call_ice_candidate', async (payload: any) => {
            if (payload?.callId && String(payload.callId) !== String(callIdRef.current)) return;
            const pc = peerRef.current;
            if (!pc || !payload?.candidate) return;
            try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {}
        });
    };

    useEffect(() => {
        if (isSender && !isAnswered) {
            const t = setTimeout(() => {
                if (!isAnswered) {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    persistMissedCallToChat();
                    endCall();
                }
            }, 30000);
            return () => clearTimeout(t);
        }
        return;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSender, isAnswered, callId]);

    useEffect(() => {
        if (!isSender && !isAnswered) {
            const t = setTimeout(() => {
                if (!isAnswered) {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    persistMissedCallToChat();
                    endCall();
                }
            }, 30000);
            return () => clearTimeout(t);
        }
        return;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSender, isAnswered, callId]);

    useEffect(() => {
        setupAudio();
        
        // Ringing animation
        ringAnimation.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            true
        );

        return () => {
            try {
                socketRef.current?.disconnect();
            } catch {}
            socketRef.current = null;

            try {
                const pc = peerRef.current;
                peerRef.current = null;
                if (pc) {
                    (pc as any).onicecandidate = null;
                    (pc as any).ontrack = null;
                    pc.close();
                }
            } catch {}

            try {
                const stream = localStreamRef.current;
                localStreamRef.current = null;
                if (stream?.getTracks) {
                    stream.getTracks().forEach((t: any) => t.stop && t.stop());
                }
            } catch {}

            try {
                InCallManager.stop();
            } catch {}

            stopAudio();
            Vibration.cancel();
        };
    }, []);

    useEffect(() => {
        // Keep a stable callId for both sender and receiver flows
        if (typeof callId === 'string' && callId) {
            callIdRef.current = String(callId);
        }
        const remote = isSender
            ? (typeof pilgrimUserId === 'string' ? String(pilgrimUserId) : '')
            : (typeof fromUserId === 'string' ? String(fromUserId) : '');
        remoteUserId.current = remote;
    }, [callId, fromUserId, pilgrimUserId, isSender]);

    useEffect(() => {
        if (!isSender) return;
        if (!pilgrimUserId || typeof pilgrimUserId !== 'string') return;

        let mounted = true;

        const start = async () => {
            try {
                const socket = await createMessagingSocket();
                socketRef.current = socket;

                socket.on('call_unavailable', (payload: any) => {
                    if (payload?.callId && String(payload.callId) !== String(callIdRef.current)) return;
                    setCallStatus('Offline');
                    if (!isAnswered) {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        persistMissedCallToChat();
                    }
                });

                socket.on('call_answer', async (payload: any) => {
                    if (payload?.callId && String(payload.callId) !== String(callIdRef.current)) return;
                    if (!payload?.sdp) return;
                    const pc = peerRef.current;
                    if (!pc) return;
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        setIsAnswered(true);
                        setCallStatus('In Call');
                        stopAudio();
                    } catch {}
                });

                socket.on('call_ice_candidate', async (payload: any) => {
                    if (payload?.callId && String(payload.callId) !== String(callIdRef.current)) return;
                    const pc = peerRef.current;
                    if (!pc || !payload?.candidate) return;
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    } catch {}
                });

                socket.on('call_end', (payload: any) => {
                    if (payload?.callId && String(payload.callId) !== String(callIdRef.current)) return;
                    endCall();
                });

                const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
                localStreamRef.current = stream;

                try {
                    InCallManager.start({ media: 'audio' } as any);
                    InCallManager.setSpeakerphoneOn(isSpeakerOn);
                } catch {}

                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                });
                peerRef.current = pc;

                stream.getTracks().forEach((track: any) => {
                    pc.addTrack(track, stream);
                });

                try {
                    stream.getAudioTracks?.().forEach((t: any) => {
                        t.enabled = !isMuted;
                    });
                } catch {}

                (pc as any).onicecandidate = (event: any) => {
                    const candidate = event?.candidate;
                    if (!candidate) return;
                    try {
                        socketRef.current?.emit('call_ice_candidate', {
                            callId: callIdRef.current,
                            targetUserId: String(pilgrimUserId),
                            candidate,
                        });
                    } catch {}
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const callerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Guide';
                const callerPhoto = getUserAvatarUrl((user as any)?.photo || (user as any)?.imageUrl || '');

                socket.emit('call_offer', {
                    callId: callIdRef.current,
                    targetUserId: String(pilgrimUserId),
                    sdp: offer,
                    metadata: {
                        name: callerName,
                        photo: callerPhoto,
                    },
                });
            } catch (e: any) {
                if (!mounted) return;
                setCallStatus('Offline');
            }
        };

        start();

        return () => {
            mounted = false;
        };
    }, [isSender, pilgrimUserId]);

    const answerWebrtc = async () => {
        const targetId = remoteUserId.current;
        if (!targetId) {
            Alert.alert('Erreur', 'Appel invalide');
            return;
        }

        try {
            if (!socketRef.current) {
                socketRef.current = await createMessagingSocket();
            }

            ensureSocketListeners();

            const cached = getIncomingOffer(callIdRef.current) || popIncomingOffer(callIdRef.current);
            if (!cached?.sdp) {
                Alert.alert('Erreur', 'Offer SDP manquante');
                return;
            }

            const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            try {
                InCallManager.start({ media: 'audio' } as any);
                InCallManager.setSpeakerphoneOn(isSpeakerOn);
            } catch {}

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            peerRef.current = pc;

            stream.getTracks().forEach((track: any) => {
                pc.addTrack(track, stream);
            });

            try {
                stream.getAudioTracks?.().forEach((t: any) => {
                    t.enabled = !isMuted;
                });
            } catch {}

            (pc as any).onicecandidate = (event: any) => {
                const candidate = event?.candidate;
                if (!candidate) return;
                try {
                    socketRef.current?.emit('call_ice_candidate', {
                        callId: callIdRef.current,
                        targetUserId: targetId,
                        candidate,
                    });
                } catch {}
            };

            await pc.setRemoteDescription(new RTCSessionDescription(cached.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socketRef.current?.emit('call_answer', {
                callId: callIdRef.current,
                targetUserId: targetId,
                sdp: answer,
                metadata: null,
            });
        } catch (e: any) {
            Alert.alert('Erreur', e?.message || "Impossible de répondre à l'appel");
        }
    };

    const missedPersistedRef = useRef(false);
    const persistMissedCallToChat = async () => {
        if (!isSender) return;
        if (missedPersistedRef.current) return;
        missedPersistedRef.current = true;
        try {
            let convId = conversationId && typeof conversationId === 'string' ? String(conversationId) : '';
            if (!convId) {
                const pid = isSender
                    ? (typeof pilgrimUserId === 'string' ? String(pilgrimUserId) : '')
                    : (typeof fromUserId === 'string' ? String(fromUserId) : '');
                if (!pid) return;
                const res = await messagingApi.getOrCreateGuidePilgrimConversation(pid);
                const created = res?.data?.conversation;
                if (created?.id) {
                    convId = String(created.id);
                }
            }
            if (!convId) return;
            await messagingApi.sendMessage(String(convId), { content: 'Appel manqué' });
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        let interval: any;
        if (isAnswered) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isAnswered]);

    const setupAudio = async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                staysActiveInBackground: true,
                playThroughEarpieceAndroid: false
            });
            const { sound } = await Audio.Sound.createAsync(
                require('@/../assets/images/sonne.mp3'),
                { shouldPlay: true, isLooping: true }
            );
            soundRef.current = sound;
        } catch (error) {
            console.log('Error loading sound', error);
        }
    };

    const stopAudio = async () => {
        if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswer = () => {
        setIsAnswered(true);
        setCallStatus('In Call');
        stopAudio();
        callStartAtRef.current = Date.now();
        Vibration.vibrate([0, 500, 100, 500]); // Short vibration pattern when answered

        // Only receiver needs to craft and send the WebRTC answer
        if (!isSender) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            answerWebrtc();
        }
    };

    const persistCallDurationToChat = async (seconds: number) => {
        try {
            let convId = conversationId && typeof conversationId === 'string' ? String(conversationId) : '';
            if (!convId) {
                const pid = typeof fromUserId === 'string' ? String(fromUserId) : '';
                if (!pid) return;
                const res = await messagingApi.getOrCreateGuidePilgrimConversation(pid);
                const created = res?.data?.conversation;
                if (created?.id) {
                    convId = String(created.id);
                }
            }
            if (!convId) return;
            const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
            if (safeSeconds <= 0) return;
            const mins = Math.floor(safeSeconds / 60);
            const secs = safeSeconds % 60;
            const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            await messagingApi.sendMessage(String(convId), { content: `Appel terminé - Durée: ${formatted}` });
        } catch {
            // ignore
        }
    };

    const endCall = () => {
        stopAudio();
        Vibration.cancel();

        // Save duration only when call was answered
        if (isAnswered) {
            const seconds = callStartAtRef.current
                ? Math.max(0, Math.round((Date.now() - callStartAtRef.current) / 1000))
                : timer;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            persistCallDurationToChat(seconds);
        }

        try {
            const targetId = remoteUserId.current || (typeof pilgrimUserId === 'string' ? String(pilgrimUserId) : '');
            if (socketRef.current && callIdRef.current && targetId) {
                socketRef.current.emit('call_end', {
                    callId: callIdRef.current,
                    targetUserId: String(targetId),
                });
            }
        } catch {}
        router.back();
    };

    const toggleMute = () => {
        const next = !isMuted;
        setIsMuted(next);
        try {
            const stream = localStreamRef.current;
            stream?.getAudioTracks?.().forEach((t: any) => {
                t.enabled = !next;
            });
        } catch {}
    };

    const toggleSpeaker = () => {
        const next = !isSpeakerOn;
        setIsSpeakerOn(next);
        try {
            InCallManager.setSpeakerphoneOn(next);
        } catch {}
    };

    const animatedRingStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ringAnimation.value }],
        opacity: 2 - ringAnimation.value
    }));

    const avatarUri =
        getUserAvatarUrl(photo as string) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || 'User'))}&background=2C5F2D&color=fff`;

    return (
        <View style={styles.container}>
            <Image source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} blurRadius={20} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />

            {/* Debug: Manual Switch (Optionnel pour démo) */}
            <TouchableOpacity 
                style={styles.switchBtn} 
                onPress={() => router.setParams({ type: isSender ? 'receiver' : 'sender' })}
            >
                <Ionicons name="swap-horizontal" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.avatarContainer}>
                        {!isAnswered && (
                            <Animated.View style={[styles.ring, animatedRingStyle]} />
                        )}
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    </Animated.View>
                    <Animated.Text entering={FadeInDown.delay(400)} style={styles.name}>{name}</Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(500)} style={styles.status}>
                        {isAnswered ? formatTime(timer) : callStatus}
                    </Animated.Text>
                    {group && <Text style={styles.groupText}>{group}</Text>}
                </View>

                <View style={styles.footer}>
                    {isAnswered ? (
                        <View style={styles.inCallActions}>
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.circleBtn} onPress={toggleMute}>
                                    <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color="#fff" />
                                    <Text style={styles.btnLabel}>{isMuted ? 'Muet' : 'Micro'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.circleBtn}>
                                    <Ionicons name="keypad" size={28} color="#fff" />
                                    <Text style={styles.btnLabel}>Keypad</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.circleBtn} onPress={toggleSpeaker}>
                                    <Ionicons name={isSpeakerOn ? "volume-high" : "volume-low"} size={28} color="#fff" />
                                    <Text style={styles.btnLabel}>{isSpeakerOn ? 'HP On' : 'HP Off'}</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <TouchableOpacity style={[styles.hangupBtn, styles.large]} onPress={endCall}>
                                <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        isSender ? (
                            <View style={styles.senderActions}>
                                <TouchableOpacity style={[styles.hangupBtn, styles.large]} onPress={endCall}>
                                    <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.btnLabelSecondary}>Cancel</Text>
                            </View>
                        ) : (
                            <View style={styles.answerRow}>
                                <View style={styles.callControl}>
                                    <TouchableOpacity style={[styles.hangupBtn]} onPress={endCall}>
                                        <MaterialCommunityIcons name="phone-hangup" size={28} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.btnLabelSecondary}>Decline</Text>
                                </View>

                                <View style={styles.callControl}>
                                    <TouchableOpacity style={[styles.answerBtn]} onPress={handleAnswer}>
                                        <Ionicons name="call" size={28} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.btnLabelSecondary}>Answer</Text>
                                </View>
                            </View>
                        )
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

export default CallScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: height * 0.15,
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#fff',
    },
    ring: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    name: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    status: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
    },
    groupText: {
        fontSize: 14,
        color: theme.colors.primary,
        marginTop: 6,
        fontWeight: '600',
    },
    switchBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    footer: {
        paddingBottom: 50,
        paddingHorizontal: 40,
    },
    answerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    callControl: {
        alignItems: 'center',
    },
    hangupBtn: {
        width: 65,
        height: 65,
        borderRadius: 35,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    answerBtn: {
        width: 65,
        height: 65,
        borderRadius: 35,
        backgroundColor: '#4CD964',
        justifyContent: 'center',
        alignItems: 'center',
    },
    large: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignSelf: 'center',
        marginTop: 40,
    },
    inCallActions: {
        alignItems: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 30,
    },
    circleBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnLabel: {
        color: '#fff',
        fontSize: 12,
        marginTop: 8,
    },
    btnLabelSecondary: {
        color: '#fff',
        fontSize: 14,
        marginTop: 10,
        fontWeight: '500',
    },
    senderActions: {
        alignItems: 'center',
    }
});
