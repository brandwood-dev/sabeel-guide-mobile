import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export const useProfileVM = () => {
    const [user, setUser] = useState({
        firstName: 'Ahmed',
        lastName: 'Mohammed',
        email: 'ahmed.guide@sabeel.com',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        uniqueIdentifier: 'GUI-882-901',
        gender: 'Homme',
        nationality: 'Tunisienne',
        dateOfBirth: '1990-01-01',
        address: 'Rue de la Liberté',
        city: 'Tunis',
        country: 'Tunisie',
        phoneNumber: '+216 22 123 456',
        shareLocation: true,
        bio: '',
        languagesSpoken: 'Français, Arabe, Anglais',
    });

    const [isUploading, setIsUploading] = useState(false);

    const loadProfile = useCallback(async () => {
        // Mock loading
    }, []);

    const handleUpdateProfile = async (data: any) => {
        setUser(prev => ({ ...prev, ...data }));
        Alert.alert('Succès', 'Profil mis à jour avec succès');
        return true;
    };

    const handlePickAndUploadImage = async () => {
        Alert.alert('Info', 'Fonctionnalité de changement d\'image bientôt disponible');
    };

    const handleLogout = async () => {
        // Mock logout
    };

    return {
        user,
        loading: false,
        isUploading,
        error: null,
        loadProfile,
        handleUpdateProfile,
        handlePickAndUploadImage,
        handleLogout,
    };
};
