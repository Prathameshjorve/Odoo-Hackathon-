import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Service APIs
export const serviceAPI = {
  getAllServices: (params) => api.get('/services', { params }),
  getServiceById: (id) => api.get(`/services/${id}`),
  createService: (data) => api.post('/services', data),
  updateService: (id, data) => api.put(`/services/${id}`, data),
  deleteService: (id) => api.delete(`/services/${id}`),
  getMyServices: () => api.get('/services/my-services'),
  getServicesByOrganiser: (organiserId) => api.get(`/services/organiser/${organiserId}`),
};

// Appointment APIs
export const appointmentAPI = {
  getAvailableSlots: (params) => api.get('/appointments/slots/available', { params }),
  createAppointment: (data) => api.post('/appointments', data),
  getMyAppointments: (params) => api.get('/appointments/my-appointments', { params }),
  getAppointmentById: (id) => api.get(`/appointments/${id}`),
  cancelAppointment: (id, data) => api.put(`/appointments/${id}/cancel`, data),
  rescheduleAppointment: (id, data) => api.put(`/appointments/${id}/reschedule`, data),
  confirmAppointment: (id) => api.put(`/appointments/${id}/confirm`),
  getStats: () => api.get('/appointments/stats'),
};

// Admin APIs
export const adminAPI = {
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),
  activateUser: (id) => api.put(`/admin/users/${id}/activate`),
  deactivateUser: (id) => api.put(`/admin/users/${id}/deactivate`),
  getStats: () => api.get('/admin/stats'),
  getDashboardData: () => api.get('/admin/dashboard/data'),
};

export default api;
