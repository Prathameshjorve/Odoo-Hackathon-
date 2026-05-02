import { useState, useEffect } from 'react';
import { Calendar, Users, Briefcase, TrendingUp, Plus, Edit, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { serviceAPI, appointmentAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';

interface ServiceType {
  _id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  isActive: boolean;
}

interface AppointmentType {
  _id: string;
  service: { name: string };
  customer: { name: string; email: string };
  date: string;
  startTime: string;
  status: string;
  paymentAmount: number;
}

export default function OrganizerDashboard() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);
  const [stats, setStats] = useState({ totalAppointments: 0, confirmedAppointments: 0, pendingAppointments: 0, completedAppointments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesRes, appointmentsRes, statsRes] = await Promise.all([
        serviceAPI.getMyServices(),
        appointmentAPI.getMyAppointments({ role: 'organiser' }),
        appointmentAPI.getStats(),
      ]);

      setServices(servicesRes.data.data);
      setAppointments(appointmentsRes.data.data);
      setStats(statsRes.data.data);
    } catch (error: any) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your services and bookings</p>
          </div>
          <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700">
            <Plus className="w-4 h-4 mr-2" /> New Service
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Appointments</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalAppointments}</p>
              </div>
              <Calendar className="w-10 h-10 text-indigo-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Confirmed</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.confirmedAppointments}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-emerald-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pendingAppointments}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-3xl font-bold text-violet-600">{stats.completedAppointments}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-violet-500 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Services Section */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Your Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Card key={service._id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{service.name}</h3>
                    <p className="text-sm text-slate-500">{service.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Edit className="w-4 h-4 text-indigo-600" />
                    </button>
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">${service.price} · {service.duration} min</p>
                  </div>
                  {service.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      Inactive
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Appointments Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Appointments</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Service</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Customer</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Date & Time</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Amount</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {appointments.slice(0, 5).map((apt) => (
                    <tr key={apt._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">{apt.service.name}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{apt.customer.name}</p>
                          <p className="text-xs text-slate-500">{apt.customer.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(apt.date).toLocaleDateString()} {apt.startTime}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">${apt.paymentAmount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            apt.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : apt.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
