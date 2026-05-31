import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import { type UserRole } from '../../types';
import toast from 'react-hot-toast';
import api from '../../services/api';


const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole>('store');
    const [isLoading, setIsLoading] = useState(false);

    const roles: { value: UserRole; label: string; description: string }[] = [
        { value: 'store', label: 'Store Worker', description: 'Manage inventory & execute scans' },
        { value: 'engineer', label: 'Production Engineer', description: 'Monitor production & RM usage' },
        { value: 'manager', label: 'Production Manager', description: 'Oversee operations & reports' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 5. Ensure login request body: { email, password }
            const response = await api.loginUser({
                email,
                password
            });
            
            // 2. Add console logs
            console.log("Login success");
            console.log("Token received");
            
            // 1. Save token
            localStorage.setItem("token", response.data.token);
            console.log("Token saved");
            
            console.log("JWT token saved successfully");
            
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            
            toast.success("Logged in successfully!");
            
            // 3. Redirect to dashboard after login
            window.location.href = '/'; 
        } catch (error: any) {
            console.error("Login Error", error);
            // 4. Handle backend errors properly
            toast.error(error.message || "Invalid credentials or network error");
        } finally {
            if (mountedRef.current) setIsLoading(false);
        }
    };

    // Phase 7: Use mounted checks
    const mountedRef = React.useRef(true);
    React.useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to access your account"
        >
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email address
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all duration-200 ease-in-out"
                            placeholder="you@example.com"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Role
                    </label>
                    <div className="relative">
                        <select
                            id="role"
                            name="role"
                            className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md shadow-sm bg-white/50 backdrop-blur-sm transition-all"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                        >
                            {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                        <div className="mt-2 text-sm text-gray-500 italic">
                            {roles.find(r => r.value === selectedRole)?.description}
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all duration-200 ease-in-out"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm">
                        <a href="#" className="font-medium text-primary hover:opacity-80 transition-colors">
                            Forgot your password?
                        </a>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? 'Signing in...' : 'Sign in'}
                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </button>
                </div>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">
                            Don't have an account?
                        </span>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link to="/signup" className="font-medium text-primary hover:opacity-80 transition-colors">
                        Create an account
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
};

export default Login;
