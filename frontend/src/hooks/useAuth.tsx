import { useState, createContext, useContext } from 'react';

interface AuthContextType {
    token: string | null;
    userId: string | null;
    spreadsheetId: string | null;
    email: string | null;
    name: string | null;
    login: (token: string, userId: string, spreadsheetId: string, email?: string, name?: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
    const [userId, setUserId] = useState<string | null>(localStorage.getItem('user_id'));
    const [spreadsheetId, setSpreadsheetId] = useState<string | null>(localStorage.getItem('spreadsheet_id'));
    const [email, setEmail] = useState<string | null>(localStorage.getItem('user_email'));
    const [name, setName] = useState<string | null>(localStorage.getItem('user_name'));

    const login = (newToken: string, newUserId: string, newSpreadsheetId: string, newEmail?: string, newName?: string) => {
        setToken(newToken);
        setUserId(newUserId);
        setSpreadsheetId(newSpreadsheetId);
        setEmail(newEmail || null);
        setName(newName || null);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('user_id', newUserId);
        localStorage.setItem('spreadsheet_id', newSpreadsheetId);
        if (newEmail) localStorage.setItem('user_email', newEmail);
        if (newName) localStorage.setItem('user_name', newName);
    };

    const logout = () => {
        setToken(null);
        setUserId(null);
        setSpreadsheetId(null);
        setEmail(null);
        setName(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('spreadsheet_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_name');
    };

    return (
        <AuthContext.Provider value={{ token, userId, spreadsheetId, email, name, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
