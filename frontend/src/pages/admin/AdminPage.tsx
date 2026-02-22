/**
 * AdminPage — Organization & User Governance
 * 
 * Features:
 * 1. User Management (Role assignment)
 * 2. Audit Log Viewer (Action tracking)
 * 3. Stats Overview
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../hooks/useApi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';

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
        <DashboardLayout>
            <div className="admin-header mb-xl">
                <h1 className="text-3xl font-bold mb-xs">Governance & Controls</h1>
                <p className="text-muted">Manage your organization's users, roles, and security audit logs.</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="card mb-lg p-md border-error text-error text-sm">
                    <p>{error}</p>
                    <button className="btn btn-secondary btn-small mt-sm" onClick={loadData}>Retry</button>
                </div>
            )}

            {/* Tabs */}
            <div className="tabs mb-lg flex gap-md border-b border-border">
                <button
                    className={`tab-btn pb-sm px-sm font-semibold transition-all ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'}`}
                    onClick={() => setActiveTab('users')}
                >
                    Users & Roles
                </button>
                <button
                    className={`tab-btn pb-sm px-sm font-semibold transition-all ${activeTab === 'logs' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'}`}
                    onClick={() => setActiveTab('logs')}
                >
                    Security Audit Logs
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="card w-full shadow-premium overflow-hidden">
                        {loading ? (
                            <div className="p-xl text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-md text-muted">Retrieving infrastructure data...</p>
                            </div>
                        ) : activeTab === 'users' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-bg-alt text-[10px] uppercase tracking-wider text-muted">
                                        <tr>
                                            <th className="p-lg">User</th>
                                            <th className="p-lg">Email</th>
                                            <th className="p-lg">Access Level</th>
                                            <th className="p-lg">Last Active</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-bg-alt/50 transition-colors">
                                                <td className="p-lg">
                                                    <div className="flex items-center gap-md">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                            {user.displayName?.[0]}
                                                        </div>
                                                        <span className="font-bold text-sm">{user.displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-lg text-sm text-secondary">{user.email}</td>
                                                <td className="p-lg">
                                                    <select
                                                        className="input text-xs py-xs px-sm w-auto bg-transparent border-gray-200"
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
                                                <td className="p-lg text-sm text-muted">
                                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-bg-alt text-[10px] uppercase tracking-wider text-muted">
                                        <tr>
                                            <th className="p-lg">Timestamp</th>
                                            <th className="p-lg">Actor</th>
                                            <th className="p-lg">Action</th>
                                            <th className="p-lg">Metadata</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-sm">
                                        {logs.map(log => (
                                            <tr key={log.id} className="hover:bg-bg-alt/50 transition-colors">
                                                <td className="p-lg whitespace-nowrap text-muted text-[10px]">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-lg">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm">{log.actor_name}</span>
                                                        <span className="text-xs text-muted">{log.actor_email}</span>
                                                    </div>
                                                </td>
                                                <td className="p-lg">
                                                    <span className={`status-badge status-badge-${log.action.toLowerCase().includes('fail') ? 'ended' : 'active'} text-[10px]`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="p-lg">
                                                    <div className="font-mono text-[9px] bg-bg-alt p-xs rounded border border-border max-w-[200px] truncate" title={JSON.stringify(log.metadata)}>
                                                        {JSON.stringify(log.metadata)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default AdminPage;
