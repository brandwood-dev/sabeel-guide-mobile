import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


type UserMode = 'guide' | 'agency';

interface UserContextType {
    user: any | null;
    setUser: (user: any) => void;
    userMode: UserMode;
    setUserMode: (mode: UserMode) => void;
    agencyId: string | null;
    setAgencyId: (id: string | null) => void;
    showAgencyIdPopup: boolean;
    setShowAgencyIdPopup: (show: boolean) => void;
    isBottomNavVisible: boolean;
    setBottomNavVisibility: (visible: boolean) => void;
    onboardingStep: 'none' | 'profile_tab' | 'personal_info';
    setOnboardingStep: (step: 'none' | 'profile_tab' | 'personal_info') => void;
    unreadMessagesCount: number;
    setUnreadMessagesCount: (count: number | ((prev: number) => number)) => void;
}


const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [userMode, setUserMode] = useState<UserMode>('guide');
    const [agencyId, setAgencyId] = useState<string | null>(null);
    const [showAgencyIdPopup, setShowAgencyIdPopup] = useState(false);
    const [isBottomNavVisible, setBottomNavVisibility] = useState(true);
    const [onboardingStep, setOnboardingStep] = useState<'none' | 'profile_tab' | 'personal_info'>('none');
    const [unreadMessagesCount, setUnreadMessagesCountState] = useState<number>(0);

    const getRoleKey = (u: any, m: UserMode) => (u?.activeRole === 'agency' || m === 'agency' ? 'agency' : 'freelance');
    const unreadKeyForRole = (roleKey: string) => `unread_messages_count_${roleKey}`;

    // Load user from AsyncStorage on mount
    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem('user_data');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    setUser(parsed);
                    const nextAgencyId = parsed?.agencyId || null;
                    setAgencyId(nextAgencyId);
                    const nextMode: UserMode = parsed?.activeRole === 'agency' ? 'agency' : 'guide';
                    setUserMode(nextMode);
                    if (nextAgencyId) {
                        setShowAgencyIdPopup(false);
                    }

                    const roleKey = getRoleKey(parsed, nextMode);
                    const unreadRaw = await AsyncStorage.getItem(unreadKeyForRole(roleKey));
                    if (unreadRaw) {
                        const parsedUnread = Number(unreadRaw);
                        setUnreadMessagesCountState(Number.isFinite(parsedUnread) ? parsedUnread : 0);
                    } else {
                        setUnreadMessagesCountState(0);
                    }
                }
            } catch (e) {}
        };
        loadUser();
    }, []);

    const setUnreadMessagesCount = async (count: number | ((prev: number) => number)) => {
        const nextRaw = typeof count === 'function' ? (count as any)(unreadMessagesCount) : count;
        const safe = Number.isFinite(nextRaw) ? Math.max(0, Math.floor(nextRaw)) : 0;
        setUnreadMessagesCountState(safe);
        try {
            const roleKey = getRoleKey(user, userMode);
            await AsyncStorage.setItem(unreadKeyForRole(roleKey), String(safe));
        } catch (e) {}
    };

    // Also update AsyncStorage when user state changes
    const handleSetUser = async (newUser: any) => {
        setUser(newUser);
        const nextAgencyId = newUser?.agencyId || null;
        setAgencyId(nextAgencyId);
        const nextMode: UserMode = newUser?.activeRole === 'agency' ? 'agency' : 'guide';
        setUserMode(nextMode);
        if (nextAgencyId) {
            setShowAgencyIdPopup(false);
        }
        try {
            await AsyncStorage.setItem('user_data', JSON.stringify(newUser));
        } catch (e) {}

        // Reload unread count for this role
        try {
            const roleKey = getRoleKey(newUser, nextMode);
            const unreadRaw = await AsyncStorage.getItem(unreadKeyForRole(roleKey));
            const parsedUnread = unreadRaw ? Number(unreadRaw) : 0;
            setUnreadMessagesCountState(Number.isFinite(parsedUnread) ? parsedUnread : 0);
        } catch (e) {
            setUnreadMessagesCountState(0);
        }
    };

    return (
        <UserContext.Provider value={{
            user,
            setUser: handleSetUser,
            userMode,
            setUserMode,
            agencyId,
            setAgencyId,
            showAgencyIdPopup,
            setShowAgencyIdPopup,
            isBottomNavVisible,
            setBottomNavVisibility,
            onboardingStep,
            setOnboardingStep,
            unreadMessagesCount,
            setUnreadMessagesCount,
        }}>

            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
