import { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Search,
    Edit,
    Trash2,
    Shield,
    Key,
    ChevronLeft,
    ChevronRight,
    X,
    CheckCircle2,
    XCircle,
    UserRoundPlus,
} from 'lucide-react';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    assignRoles,
    removeRoles,
    resetUserPassword,
    getRoles,
} from '@/services/userService';

import Header from './Header';
import FilterField from './FilterField';
import UserTable from './UserTable';

const UserManagementPage = () => {
    const [roles, setRoles] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        isVerified: '',
        status: '',
        dateFrom: '',
        dateTo: '',
    });

    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        address: '',
        roles: [],
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Function to trigger refresh
    const triggerRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            email: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            address: '',
            roles: [],
        });
        setFormErrors({});
        setSelectedUser(null);
    };

    // Fetch roles
    const fetchRoles = async () => {
        try {
            const res = await getRoles();
            if (res.success) {
                setRoles(res.data.roles);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);


    return (
        <div className="flex-1 px-6 py-8 bg-base-200 overflow-y-auto">
            <div className="">
                {/* Header */}
                <Header
                    roles={roles}
                    triggerRefresh={triggerRefresh}
                />

                {/* Filters */}
                <FilterField
                    filters={filters}
                    setFilters={setFilters}
                    pagination={pagination}
                    setPagination={setPagination}
                    roles={roles} />

                {/* Users Table */}
                <UserTable
                    filters={filters}
                    setFilters={setFilters}
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    formData={formData}
                    setFormData={setFormData}
                    formErrors={formErrors}
                    setFormErrors={setFormErrors}
                    submitting={submitting}
                    setSubmitting={setSubmitting}
                    resetForm={resetForm}
                    pagination={pagination}
                    setPagination={setPagination}
                    roles={roles}
                    refreshKey={refreshKey} />
            </div>
        </div>
    );
};

export default UserManagementPage;

