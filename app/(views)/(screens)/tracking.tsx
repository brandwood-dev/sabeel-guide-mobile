import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    StatusBar,
    Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

const GROUPS = [
    { id: '1', name: 'Tous', count: 450, color: theme.colors.primary },
    { id: '2', name: 'Makkah Luxury', count: 120, color: '#FF9800' },
    { id: '3', name: 'Medina VIP', count: 85, color: '#2196F3' },
    { id: '4', name: 'Al-Mina A', count: 145, color: '#9C27B0' },
    { id: '5', name: 'Al-Quds Group', count: 100, color: '#4CAF50' },
];

const PILGRIMS_LOCATION = [
    { id: 'p1', name: 'Ahmed M.', lat: '21.4225', lng: '39.8262', age: 45, group: 'Makkah Luxury', avatar: 'https://i.pravatar.cc/150?u=a1' },
    { id: 'p2', name: 'Sara I.', lat: '21.4230', lng: '39.8270', age: 34, group: 'Medina VIP', avatar: 'https://i.pravatar.cc/150?u=a2' },
    { id: 'p3', name: 'Omar B.', lat: '21.4210', lng: '39.8250', age: 52, group: 'Al-Mina A', avatar: 'https://i.pravatar.cc/150?u=a3' },
    { id: 'p4', name: 'Fatima Z.', lat: '21.4245', lng: '39.8285', age: 29, group: 'Al-Quds Group', avatar: 'https://i.pravatar.cc/150?u=a4' },
    { id: 'p5', name: 'Yousuf I.', lat: '21.4220', lng: '39.8260', age: 61, group: 'Makkah Luxury', avatar: 'https://i.pravatar.cc/150?u=a5' },
];

const TrackingScreen = () => {
    const router = useRouter();
    const [selectedGroup, setSelectedGroup] = useState('1');
    const [selectedPilgrim, setSelectedPilgrim] = useState<any>(null);

    const filteredPilgrims = selectedGroup === '1'
        ? PILGRIMS_LOCATION
        : PILGRIMS_LOCATION.filter(p => p.group === GROUPS.find(g => g.id === selectedGroup)?.name);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Map View Placeholder/Background */}
            <View style={styles.mapContainer}>
                <Image
                    source="https://images.unsplash.com/photo-1526778545894-62b44c2860b1?w=1200"
                    style={styles.mapBase}
                    contentFit="cover"
                />

                {/* Custom Decorative Map Overlay Layers (UI Design) */}
                <View style={styles.mapOverlay} />

                {/* Back Button */}
                <SafeAreaView style={styles.safeHeader}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={theme.colors.secondary} />
                        </TouchableOpacity>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color={theme.colors.muted} />
                            <Text style={styles.searchText}>Rechercher un pèlerin...</Text>
                        </View>
                    </View>

                    {/* Group Filter Chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filterScroll}
                        contentContainerStyle={styles.filterContent}
                    >
                        {GROUPS.map(group => (
                            <TouchableOpacity
                                key={group.id}
                                style={[
                                    styles.filterChip,
                                    selectedGroup === group.id && { backgroundColor: theme.colors.primary }
                                ]}
                                onPress={() => setSelectedGroup(group.id)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    selectedGroup === group.id && { color: '#fff' }
                                ]}>
                                    {group.name} ({group.count})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>

                {/* Pilgrims Pins (UI Simulation) */}
                {filteredPilgrims.map((p, index) => (
                    <TouchableOpacity
                        key={p.id}
                        style={[
                            styles.markerContainer,
                            {
                                top: height * (0.3 + (index * 0.1)),
                                left: width * (0.2 + (index * 0.15)),
                                borderColor: GROUPS.find(g => g.name === p.group)?.color || theme.colors.primary
                            }
                        ]}
                        onPress={() => setSelectedPilgrim(p)}
                    >
                        <Image source={p.avatar} style={styles.markerAvatar} />
                        <View style={[styles.markerStatus, { backgroundColor: '#4CAF50' }]} />
                    </TouchableOpacity>
                ))}

                {/* Selected Pilgrim Detailed Card */}
                {selectedPilgrim && (
                    <View style={styles.pilgrimInfoCard}>
                        <View style={styles.cardHeader}>
                            <Image source={selectedPilgrim.avatar} style={styles.cardAvatar} />
                            <View style={styles.cardText}>
                                <Text style={styles.cardName}>{selectedPilgrim.name}</Text>
                                <Text style={styles.cardGroup}>{selectedPilgrim.group} • {selectedPilgrim.age} ans</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.callBtn}
                                onPress={() => router.push({
                                    pathname: '/call',
                                    params: {
                                        name: selectedPilgrim.name,
                                        avatar: selectedPilgrim.avatar
                                    }
                                })}
                            >
                                <Ionicons name="call" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.cardStats}>
                            <View style={styles.statItem}>
                                <Ionicons name="battery-full" size={16} color="#4CAF50" />
                                <Text style={styles.statText}>82%</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="walk" size={16} color={theme.colors.primary} />
                                <Text style={styles.statText}>1.2km</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="time" size={16} color="#FF9800" />
                                <Text style={styles.statText}>Mis à jour: 2min</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeCard} onPress={() => setSelectedPilgrim(null)}>
                            <Ionicons name="close" size={20} color={theme.colors.muted} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Map Tools */}
                <View style={styles.mapTools}>
                    <TouchableOpacity style={styles.toolBtn}>
                        <Ionicons name="layers" size={22} color={theme.colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn}>
                        <Ionicons name="locate" size={22} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn}>
                        <Ionicons name="add" size={22} color={theme.colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn}>
                        <Ionicons name="remove" size={22} color={theme.colors.secondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    mapBase: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    safeHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        gap: 12,
    },
    backBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    searchBar: {
        flex: 1,
        height: 46,
        backgroundColor: '#fff',
        borderRadius: 23,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    searchText: {
        color: theme.colors.muted,
        fontSize: 14,
        fontWeight: '500',
    },
    filterScroll: {
        marginTop: 16,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    markerContainer: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    markerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    markerStatus: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#fff',
    },
    pilgrimInfoCard: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    cardAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    cardText: {
        flex: 1,
    },
    cardName: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.secondary,
    },
    cardGroup: {
        fontSize: 13,
        color: theme.colors.muted,
        marginTop: 2,
    },
    callBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardStats: {
        flexDirection: 'row',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    statDivider: {
        width: 1,
        height: 16,
        backgroundColor: '#F0F0F0',
    },
    closeCard: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    mapTools: {
        position: 'absolute',
        right: 20,
        top: height * 0.35,
        gap: 12,
    },
    toolBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
});

export default TrackingScreen;
