import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function ProfileLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#fff',
                },
                headerTintColor: theme.colors.secondary,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                headerBackTitle: '',
                headerShadowVisible: false,
            }}
        >

            <Stack.Screen
                name="personal-info"
                options={{
                    title: 'Personal Information',
                }}
            />
            <Stack.Screen
                name="contact-details"
                options={{
                    title: 'Contact Details',
                }}
            />
            <Stack.Screen
                name="professional-profile"
                options={{
                    title: 'Professional Profile',
                }}
            />
            <Stack.Screen
                name="identity-kyc"
                options={{
                    title: 'Identity & KYC',
                }}
            />
            <Stack.Screen
                name="payment-methods"
                options={{
                    title: 'Payment Methods',
                }}
            />
            <Stack.Screen
                name="security"
                options={{
                    title: 'Login & Security',
                }}
            />
        </Stack>
    );
}
