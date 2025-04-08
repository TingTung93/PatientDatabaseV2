import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    Snackbar,
    Alert,
    AlertProps,
    AlertColor,
} from '@mui/material';

interface ToastContextType {
    showToast: (message: string, severity?: AlertColor) => void;
}

interface ToastState {
    open: boolean;
    message: string;
    severity: AlertColor;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [state, setState] = useState<ToastState>({
        open: false,
        message: '',
        severity: 'info',
    });

    const showToast = useCallback((message: string, severity: AlertColor = 'info') => {
        setState({
            open: true,
            message,
            severity,
        });
    }, []);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setState((prev) => ({ ...prev, open: false }));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Snackbar
                open={state.open}
                autoHideDuration={6000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleClose}
                    severity={state.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {state.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
}; 