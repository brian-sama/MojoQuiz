/**
 * AdminPage — Organization & User Governance
 * 
 * Features:
 * 1. User Management (Role assignment)
 * 2. Audit Log Viewer (Action tracking)
 * 3. Stats Overview
 */

import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../hooks/useApi';
import Skeleton from '../../components/common/Skeleton';

const AdminPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersData, logsData] = await Promise.all([
                api.getUsers(),
                api.getAdminAuditLogs()
            ]);
            setUsers(usersData);
            setLogs(logsData);
        } catch (err: any) {
            console.error('Failed to load admin data:', err);
            setError(err.message || 'Failed to load administrative data');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await api.updateUserRole(userId, newRole);
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err: any) {
            alert('Failed to update role: ' + err.message);
        }
    };

    return (
        <AppLayout>
            <div className="admin-header mb-xl">
                <h1 className="text-3xl text-bold mb-sm">Governance & Controls</h1>
                <p className="text-muted">Manage your organization's users, roles, and security audit logs.</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="card mb-lg p-md border-error">
                    <p className="text-error">{error}</p>
                    <button className="btn btn-secondary mt-sm" onClick={loadData}>Retry</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-md mb-lg">
                <button
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('users')}
                >
                    Users & Roles
                </button>
                <button
                    className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('logs')}
                >
                    Audit Logs
                </button>
            </div>

            <div className="card w-full overflow-hidden">
                {loading ? (
                    <div className="p-xl">
                        <Skeleton variant="text" width="100%" height={40} className="mb-sm" />
                        <Skeleton variant="text" width="100%" height={40} className="mb-sm" />
                        <Skeleton variant="text" width="100%" height={40} className="mb-sm" />
                    </div>
                ) : activeTab === 'users' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted text-sm uppercase">
                                <tr>
                                    <th className="p-md">Name</th>
                                    <th className="p-md">Email</th>
                                    <th className="p-md">Role</th>
                                    <th className="p-md">Last Login</th>
                                    <th className="p-md">Organization</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-muted-50 transition-colors">
                                        <td className="p-md text-bold">{user.displayName}</td>
                                        <td className="p-md text-sm text-secondary">{user.email}</td>
                                        <td className="p-md">
                                            <select
                                                className="input text-sm p-xs w-auto"
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                title="Change User Role"
                                            >
                                                <option value="owner">Owner</option>
                                                <option value="admin">Admin</option>
                                                <option value="presenter">Presenter</option>
                                                <option value="analyst">Analyst</option>
                                                <option value="user">User</option>
                                            </select>
                                        </td>
                                        <td className="p-md text-sm">
                                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="p-md text-sm text-muted">
                                            {user.organizationId || 'None'}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-xl text-center text-muted">No users found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted text-sm uppercase">
                                <tr>
                                    <th className="p-md">Time</th>
                                    <th className="p-md">Actor</th>
                                    <th className="p-md">Action</th>
                                    <th className="p-md">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td className="p-md whitespace-nowrap text-muted">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-md">
                                            <div className="flex flex-col">
                                                <span className="text-bold">{log.actor_name}</span>
                                                <span className="text-xs text-muted">{log.actor_email}</span>
                                            </div>
                                        </td>
                                        <td className="p-md">
                                            <span className={`status-badge status-badge-${log.action.toLowerCase() === 'user_login' ? 'completed' : 'draft'}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-md font-mono text-xs">
                                            {JSON.stringify(log.metadata)}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-xl text-center text-muted">No audit logs recorded</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default AdminPage;
