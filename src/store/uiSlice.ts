import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SupportedLang = 'fr' | 'en' | 'ar';

interface UIState {
    isBottomNavVisible: boolean;
    language: SupportedLang;
}

const initialState: UIState = {
    isBottomNavVisible: true,
    language: 'fr',
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setBottomNavVisibility: (state, action: PayloadAction<boolean>) => {
            state.isBottomNavVisible = action.payload;
        },
        setLanguage: (state, action: PayloadAction<SupportedLang>) => {
            state.language = action.payload;
        },
    },
});

export const { setBottomNavVisibility, setLanguage } = uiSlice.actions;
export default uiSlice.reducer;
