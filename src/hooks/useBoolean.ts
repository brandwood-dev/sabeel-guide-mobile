import { useState, useCallback } from 'react';

export const useBoolean = (initialValue: boolean = false) => {
    const [value, setValue] = useState(initialValue);

    const setTrue = useCallback(() => setValue(true), []);
    const setFalse = useCallback(() => setValue(false), []);
    const toggle = useCallback(() => setValue((v) => !v), []);

    return [value, { setTrue, setFalse, toggle, setValue }] as const;
};
