export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  provider: string;
  category: string;
  description: string;
  image?: string;
}

export interface Provider {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  services: string[];
}

export interface Appointment {
  id: string;
  service: string;
  provider: string;
  customer: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  venue: string;
  price: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'organiser' | 'admin';
  status: 'active' | 'inactive';
  joinedAt: string;
}

export const services: Service[] = [
  {
    id: 's1',
    name: 'Hair Styling & Cut',
    duration: 45,
    price: 55,
    provider: 'Sarah Johnson',
    category: 'Beauty',
    description: 'Professional hair cut and styling session with expert consultation.',
  },
  {
    id: 's2',
    name: 'Dental Consultation',
    duration: 30,
    price: 80,
    provider: 'Dr. Michael Chen',
    category: 'Healthcare',
    description: 'Comprehensive dental check-up and oral health consultation.',
  },
  {
    id: 's3',
    name: 'Business Coaching',
    duration: 60,
    price: 150,
    provider: 'Emma Williams',
    category: 'Coaching',
    description: 'One-on-one business strategy and coaching session.',
  },
  {
    id: 's4',
    name: 'Yoga Class',
    duration: 60,
    price: 35,
    provider: 'Aria Patel',
    category: 'Wellness',
    description: 'Group yoga class for all experience levels with certified instructor.',
  },
  {
    id: 's5',
    name: 'Financial Advisory',
    duration: 45,
    price: 120,
    provider: 'Robert Kim',
    category: 'Finance',
    description: 'Personal financial planning and investment advisory session.',
  },
  {
    id: 's6',
    name: 'Therapy Session',
    duration: 50,
    price: 110,
    provider: 'Dr. Lisa Anderson',
    category: 'Healthcare',
    description: 'Confidential therapy session with licensed psychologist.',
  },
];

export const providers: Provider[] = [
  { id: 'p1', name: 'Sarah Johnson', role: 'Senior Stylist', avatar: 'SJ', rating: 4.9, services: ['s1'] },
  { id: 'p2', name: 'Dr. Michael Chen', role: 'Dentist', avatar: 'MC', rating: 4.8, services: ['s2'] },
  { id: 'p3', name: 'Emma Williams', role: 'Business Coach', avatar: 'EW', rating: 5.0, services: ['s3'] },
  { id: 'p4', name: 'Aria Patel', role: 'Yoga Instructor', avatar: 'AP', rating: 4.9, services: ['s4'] },
  { id: 'p5', name: 'Robert Kim', role: 'Financial Advisor', avatar: 'RK', rating: 4.7, services: ['s5'] },
  { id: 'p6', name: 'Dr. Lisa Anderson', role: 'Psychologist', avatar: 'LA', rating: 4.9, services: ['s6'] },
];

export const appointments: Appointment[] = [
  { id: 'a1', service: 'Hair Styling & Cut', provider: 'Sarah Johnson', customer: 'John Doe', date: '2026-05-10', time: '10:00 AM', status: 'confirmed', venue: 'Downtown Studio', price: 55 },
  { id: 'a2', service: 'Dental Consultation', provider: 'Dr. Michael Chen', customer: 'Jane Smith', date: '2026-05-11', time: '2:30 PM', status: 'pending', venue: 'Medical Plaza', price: 80 },
  { id: 'a3', service: 'Business Coaching', provider: 'Emma Williams', customer: 'Alex Brown', date: '2026-05-12', time: '11:00 AM', status: 'confirmed', venue: 'Online', price: 150 },
  { id: 'a4', service: 'Yoga Class', provider: 'Aria Patel', customer: 'Maria Garcia', date: '2026-05-09', time: '7:00 AM', status: 'completed', venue: 'Wellness Center', price: 35 },
  { id: 'a5', service: 'Financial Advisory', provider: 'Robert Kim', customer: 'David Lee', date: '2026-05-13', time: '3:00 PM', status: 'confirmed', venue: 'Online', price: 120 },
  { id: 'a6', service: 'Therapy Session', provider: 'Dr. Lisa Anderson', customer: 'Sophie Turner', date: '2026-05-08', time: '4:00 PM', status: 'cancelled', venue: 'Wellness Center', price: 110 },
  { id: 'a7', service: 'Hair Styling & Cut', provider: 'Sarah Johnson', customer: 'Tom Wilson', date: '2026-05-14', time: '1:00 PM', status: 'confirmed', venue: 'Downtown Studio', price: 55 },
  { id: 'a8', service: 'Dental Consultation', provider: 'Dr. Michael Chen', customer: 'Emily Davis', date: '2026-05-15', time: '9:00 AM', status: 'pending', venue: 'Medical Plaza', price: 80 },
];

export const users: User[] = [
  { id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'customer', status: 'active', joinedAt: '2026-01-15' },
  { id: 'u2', name: 'Jane Smith', email: 'jane@example.com', role: 'customer', status: 'active', joinedAt: '2026-02-20' },
  { id: 'u3', name: 'Sarah Johnson', email: 'sarah@salon.com', role: 'organiser', status: 'active', joinedAt: '2025-11-01' },
  { id: 'u4', name: 'Dr. Michael Chen', email: 'mchen@dental.com', role: 'organiser', status: 'active', joinedAt: '2025-10-15' },
  { id: 'u5', name: 'Alex Brown', email: 'alex@example.com', role: 'customer', status: 'inactive', joinedAt: '2026-03-10' },
  { id: 'u6', name: 'Emma Williams', email: 'emma@coach.com', role: 'organiser', status: 'active', joinedAt: '2025-09-05' },
  { id: 'u7', name: 'Maria Garcia', email: 'maria@example.com', role: 'customer', status: 'active', joinedAt: '2026-04-01' },
  { id: 'u8', name: 'Admin User', email: 'admin@booksy.com', role: 'admin', status: 'active', joinedAt: '2025-01-01' },
];

export const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

// Slots considered unavailable (for demo)
export const unavailableSlots = ['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM'];

export const bookingStats = {
  totalBookings: 1284,
  todayAppointments: 24,
  revenue: 45680,
  activeClients: 312,
};

export const adminStats = {
  totalUsers: 2456,
  totalOrganisers: 189,
  totalAppointments: 8432,
  revenue: 342580,
};

export const peakHoursData = [
  { hour: '9 AM', bookings: 45 },
  { hour: '10 AM', bookings: 78 },
  { hour: '11 AM', bookings: 92 },
  { hour: '12 PM', bookings: 65 },
  { hour: '1 PM', bookings: 48 },
  { hour: '2 PM', bookings: 85 },
  { hour: '3 PM', bookings: 110 },
  { hour: '4 PM', bookings: 95 },
  { hour: '5 PM', bookings: 72 },
];

export const providerUtilization = [
  { name: 'Sarah J.', utilization: 85 },
  { name: 'Dr. Chen', utilization: 92 },
  { name: 'Emma W.', utilization: 78 },
  { name: 'Aria P.', utilization: 88 },
  { name: 'Robert K.', utilization: 70 },
  { name: 'Dr. Lisa', utilization: 82 },
];

export const monthlyAppointments = [
  { month: 'Jan', appointments: 420 },
  { month: 'Feb', appointments: 560 },
  { month: 'Mar', appointments: 680 },
  { month: 'Apr', appointments: 750 },
  { month: 'May', appointments: 890 },
];