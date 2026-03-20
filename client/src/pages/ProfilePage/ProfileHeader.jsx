import { getInitials, getPrimaryRole } from '@/lib/utils';
import { Shield } from 'lucide-react';

const ProfileHeader = ({ user, isCustomer }) => {
    if (isCustomer) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="avatar placeholder shrink-0">
                            <div className="bg-primary/10 text-primary rounded-2xl w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center text-2xl sm:text-3xl font-bold">
                                <span>{getInitials(user)}</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 text-center sm:text-left">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">
                                {user.firstName} {user.lastName}
                            </h2>
                            <p className="text-gray-500 mt-1 break-all">{user.email}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-base-100 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-purple-600 p-8">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                    <div className="relative">
                        <div className="avatar placeholder">
                            <div className="bg-white text-primary rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center text-3xl md:text-4xl font-bold shadow-xl border-4 border-white">
                                <span>{getInitials(user)}</span>
                            </div>
                        </div>
                        {getPrimaryRole(user) && (
                            <div className="absolute -bottom-2 -right-2 badge badge-lg badge-secondary border-4 border-white">
                                {getPrimaryRole(user)}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left text-white">
                        <h1 className="text-2xl md:text-4xl font-bold mb-2">
                            {user.firstName} {user.lastName}
                        </h1>
                        <p className="text-white/80 text-lg mb-1">@{user.username}</p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                            {user.roles?.map((role, index) => (
                                <span
                                    key={index}
                                    className="badge badge-outline badge-lg bg-white/20 text-white border-white/50"
                                >
                                    <Shield className="w-4 h-4 mr-1" />
                                    {role.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;

