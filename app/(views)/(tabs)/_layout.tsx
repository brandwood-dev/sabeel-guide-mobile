import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/navigation/CustomTabBar';
import { useUser } from '@/context/UserContext';

export default function TabLayout() {
    const { userMode, user } = useUser();
    const tabsKey = `tabs_${String(userMode)}_${String((user as any)?.activeRole || '')}`;
    return (

        <Tabs
            key={tabsKey}
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                }}
            />
            <Tabs.Screen
                name="umrah"
                options={{
                    title: 'Pilgrims',
                }}
            />
            <Tabs.Screen
                name="tracking"
                options={{
                    title: 'Tracking',
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                }}
            />
        </Tabs>
    );
}
