import { useState, useEffect } from 'react';
import { Users, Briefcase, Calendar, TrendingUp, Search, Shield, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { adminAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCustomers: 0,
    totalOrganisers: 0,
    totalAppointments: 0,
    confirmedAppointments: 0,
    completedAppointments: 0,
    totalServices: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([adminAPI.getAllUsers(), adminAPI.getStats()]);

      setUsers(usersRes.data.data);
      setStats(statsRes.data.data);
    } catch (error: any) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await adminAPI.deactivateUser(userId);
      setUsers(users.map((u) => (u._id === userId ? { ...u, status: 'inactive' } : u)));
      toast.success('User deactivated');
    } catch (error: any) {
      toast.error('Failed to deactivate user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await adminAPI.activateUser(userId);
      setUsers(users.map((u) => (u._id === userId ? { ...u, status: 'active' } : u)));
      toast.success('User activated');
    } catch (error: any) {
      toast.error('Failed to activate user');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">System overview and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalUsers}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {stats.totalCustomers} customers, {stats.totalOrganisers} organisers
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Appointments</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalAppointments}</p>
                <p className="text-xs text-slate-400 mt-1">{stats.confirmedAppointments} confirmed</p>
              </div>
              <Calendar className="w-10 h-10 text-indigo-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Services</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalServices}</p>
                <p className="text-xs text-slate-400 mt-1">Active services</p>
              </div>
              <Briefcase className="w-10 h-10 text-emerald-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Revenue</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">${stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Total income</p>
              </div>
              <TrendingUp className="w-10 h-10 text-emerald-500 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Users Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Users Management</h2>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Email</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Role</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Joined</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' && <Shield className="w-4 h-4 text-amber-500" />}
                          <span className="capitalize">{user.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : user.status === 'inactive'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleDeactivateUser(user._id)}
                              className="px-3 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user._id)}
                              className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
