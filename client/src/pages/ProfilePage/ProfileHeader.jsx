import { getInitials, getPrimaryRole } from '@/lib/utils';
import { Shield } from 'lucide-react';

const ProfileHeader = ({ user }) => {
    return (
        <div className="bg-base-100 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-purple-600 p-8">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                    {/* Avatar */}
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

                    {/* User Info */}
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

