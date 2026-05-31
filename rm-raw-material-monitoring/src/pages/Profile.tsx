import { User, Mail, Shield, Calendar, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
    const { role, profileName, user: authUser } = useAuth();

    // Mock user data merged with real Auth data
    const user = {
        name: profileName || 'Sarah Johnson',
        email: authUser?.email || 'sarah.johnson@manufacturing.com',
        role: role,
        joinDate: 'March 2025',
        department: 'Production Management',
        location: 'Manufacturing Plant - Zone A'
    };

    // Generate initials for avatar
    const initials = user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();

    const roleLabels = {
        store: 'Store Worker',
        engineer: 'Production Engineer',
        manager: 'Production Manager'
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">User Profile</h1>

            {/* Profile Card */}
            <Card>
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                {initials}
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
                                    {roleLabels[role as keyof typeof roleLabels]}
                                </span>
                            </div>

                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail size={16} className="text-gray-400" />
                                    <span className="text-sm">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Shield size={16} className="text-gray-400" />
                                    <span className="text-sm">{user.department}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className="text-sm">{user.location}</span>
                                </div>
                            </div>
                        </div>

                        {/* Edit Button */}
                        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium">
                            Edit Profile
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Account Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Member Since</span>
                            <span className="text-sm font-medium text-gray-900">{user.joinDate}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Account Status</span>
                            <span className="text-sm font-medium text-emerald-600">Active</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">Last Login</span>
                            <span className="text-sm font-medium text-gray-900">Today, 9:30 AM</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Scans This Week</span>
                            <span className="text-sm font-bold text-primary">24</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Materials Processed</span>
                            <span className="text-sm font-bold text-primary">12</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">Alerts Resolved</span>
                            <span className="text-sm font-bold text-emerald-600">5</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center group">
                            <User className="w-6 h-6 mx-auto text-gray-400 group-hover:text-primary transition-colors" />
                            <span className="block mt-2 text-sm font-medium text-gray-700">Edit Profile</span>
                        </button>
                        <button className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center group">
                            <Shield className="w-6 h-6 mx-auto text-gray-400 group-hover:text-primary transition-colors" />
                            <span className="block mt-2 text-sm font-medium text-gray-700">Security</span>
                        </button>
                        <button className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center group">
                            <Calendar className="w-6 h-6 mx-auto text-gray-400 group-hover:text-primary transition-colors" />
                            <span className="block mt-2 text-sm font-medium text-gray-700">Activity Log</span>
                        </button>
                        <button className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center group">
                            <Mail className="w-6 h-6 mx-auto text-gray-400 group-hover:text-primary transition-colors" />
                            <span className="block mt-2 text-sm font-medium text-gray-700">Notifications</span>
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Profile;
