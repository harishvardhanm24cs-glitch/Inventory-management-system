import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserRole } from '../types';

export interface User {
    uid: string;
    email: string | null;
}

interface AuthContextType {
    user: User | null;
    role: UserRole;
    profileName: string;
    isLoading: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>('store'); // Default fallback
    const [profileName, setProfileName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    setUser({ uid: parsed.uid, email: parsed.email });
                    setRole(parsed.role || 'store');
                    setProfileName(parsed.name || 'User');
                } catch {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        };
        
        checkSession();
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setRole('store');
        setProfileName('');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, role, profileName, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}
