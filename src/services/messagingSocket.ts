import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { SERVER_BASE_URL, getMemoryToken } from './api';

export const createMessagingSocket = async (): Promise<any> => {
    const memoryToken = getMemoryToken();
    const token = memoryToken || await AsyncStorage.getItem('auth_token');

    return io(`${SERVER_BASE_URL}/messaging`, {
        transports: ['websocket', 'polling'],
        auth: {
            token,
        },
    });
};
