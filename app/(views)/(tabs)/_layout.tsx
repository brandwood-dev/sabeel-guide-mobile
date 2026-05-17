import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/navigation/CustomTabBar';
import { useUser } from '@/context/UserContext';

export default function TabLayout() {
    return (

        <Tabs
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
