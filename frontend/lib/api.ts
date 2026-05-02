import { User, Organization, Appointment, Booking, TimeSlot, Notification } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  user?: any;
  accessToken?: string;
  refreshToken?: string;
}

// Specific response types for better type safety
export interface UserMeResponse {
  user: User;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ConvertToOrganizationResponse {
  user: User;
  organization: Organization;
}

export interface ResourcesResponse {
  resources: Array<{
    id: string;
    name: string;
    capacity: number;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ResourceResponse {
  resource: {
    id: string;
    name: string;
    capacity: number;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout = 15000
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const config: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true", // Skip ngrok browser warning
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Get content type to check if it's JSON
      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      let data: any;

      if (isJson) {
        try {
          data = await response.json();
        } catch (parseError) {
          // JSON parsing failed
          const error: any = new Error("Invalid JSON response from server");
          error.status = response.status;
          error.isNetworkError = true;
          throw error;
        }
      } else {
        // Not JSON - likely HTML error page or ngrok page
        const textResponse = await response.text();
        console.error("Non-JSON response received:", textResponse.substring(0, 200));

        const error: any = new Error(
          response.status === 404
            ? "API endpoint not found. Please check your API server is running."
            : "Server returned non-JSON response. API may be unreachable."
        );
        error.status = response.status;
        error.isUnauthorized = response.status === 401 || response.status === 403;
        error.isNetworkError = response.status >= 500 || !isJson;
        throw error;
      }

      if (!response.ok) {
        const error: any = new Error(data.message || "Something went wrong");
        error.status = response.status;
        error.isUnauthorized = response.status === 401 || response.status === 403;
        throw error;
      }

      return data;
    } catch (error: any) {
      // If error already has status, re-throw it
      if (error.status !== undefined) {
        throw error;
      }

      // Network error (fetch failed)
      const networkError: any = new Error(
        error.name === "AbortError"
          ? "Request timed out. Please check your API server or network connection."
          : error.message || "Network error. Please check your internet connection and API server."
      );
      networkError.isNetworkError = true;
      throw networkError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: "GET",
      headers,
    });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    token?: string
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    token?: string
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: "DELETE",
      headers,
    });
  }
}

export const api = new ApiClient(API_BASE_URL);

// Auth API functions
export const authApi = {
  register: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post("/auth/register", data),

  login: (data: { email: string; password: string }): Promise<ApiResponse<LoginResponse>> =>
    api.post<LoginResponse>("/auth/login", data),

  verifyEmail: (token: string, email: string) =>
    api.get(`/auth/verify-email?token=${token}&email=${email}`),

  resendVerification: (email: string) =>
    api.post("/auth/resend-verification-email", { email }),

  logout: (refreshToken?: string) =>
    api.post("/auth/logout", refreshToken ? { refreshToken } : {}),

  refreshToken: (refreshToken: string) =>
    api.post("/auth/refresh-token", { refreshToken }),

  requestPasswordReset: (email: string) =>
    api.post("/auth/request-password-reset", { email }),

  resetPassword: (token: string, email: string, newPassword: string) =>
    api.post("/auth/reset-password", { token, email, newPassword }),
};

// User API functions
export const userApi = {
  getMe: (token: string): Promise<ApiResponse<UserMeResponse>> =>
    api.get<UserMeResponse>("/user/me", token),

  updateProfile: (token: string, data: any) =>
    api.put("/user/update", data, token),

  deleteAccount: (token: string, password: string) =>
    api.delete("/user/delete", token),

  logout: (refreshToken: string) =>
    api.post("/auth/logout", { refreshToken }),

  convertToOrganization: (token: string, business: any): Promise<ApiResponse<ConvertToOrganizationResponse>> =>
    api.post<ConvertToOrganizationResponse>("/user/convert-to-organization", { business }, token),
};

// Organization API functions
export const organizationApi = {
  // Member Management
  getMembers: (token: string) =>
    api.get("/organization/members", token),

  addMember: (token: string, email: string) =>
    api.post("/organization/members", { email }, token),

  removeMember: (token: string, memberId: string) =>
    api.delete(`/organization/members/${memberId}`, token),

  leaveOrganization: (token: string) =>
    api.post("/organization/leave", {}, token),

  // Resource Management
  createResource: (token: string, data: { name: string; capacity: number }): Promise<ApiResponse<ResourceResponse>> =>
    api.post<ResourceResponse>("/organization/resources", data, token),

  getResources: (token: string): Promise<ApiResponse<ResourcesResponse>> =>
    api.get<ResourcesResponse>("/organization/resources", token),

  deleteResource: (token: string, resourceId: string) =>
    api.delete(`/organization/resources/${resourceId}`, token),

  // Organization Settings
  updateOrganization: (token: string, data: {
    name?: string;
    location?: string;
    description?: string;
    businessHours?: Array<{ day: string; from: string; to: string }>;
  }) =>
    api.put("/organization/update", data, token),

  // Appointment Management
  createAppointment: (token: string, data: any) =>
    api.post("/organization/appointments", data, token),

  getAppointments: (token: string): Promise<ApiResponse<{ appointments: Appointment[] }>> =>
    api.get<{ appointments: Appointment[] }>("/organization/appointments", token),

  getOrganizationAppointments: (token: string): Promise<ApiResponse<{ appointments: Appointment[] }>> =>
    api.get<{ appointments: Appointment[] }>("/organization/appointments", token),

  getAppointment: (token: string, appointmentId: string): Promise<ApiResponse<{ appointment: Appointment }>> =>
    api.get<{ appointment: Appointment }>(`/organization/appointments/${appointmentId}`, token),

  updateAppointment: (token: string, appointmentId: string, data: any) =>
    api.put(`/appointments/${appointmentId}`, data, token),

  publishAppointment: (token: string, appointmentId: string) =>
    api.post(`/appointments/${appointmentId}/publish`, {}, token),

  unpublishAppointment: (token: string, appointmentId: string) =>
    api.post(`/appointments/${appointmentId}/unpublish`, {}, token),

  generateSecretLink: (token: string, appointmentId: string, data: {
    expiryTime?: string;
    expiryCapacity?: number;
  }) =>
    api.post(`/appointments/${appointmentId}/secret-link`, data, token),
};

// Booking API functions
export const bookingApi = {
  // Public endpoints
  getPublishedAppointments: (params?: {
    organizationId?: string;
    search?: string;
  }): Promise<ApiResponse<Appointment[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.organizationId) queryParams.append("organizationId", params.organizationId);
    if (params?.search) queryParams.append("search", params.search);

    const endpoint = `/appointments/published${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return api.get<Appointment[]>(endpoint);
  },

  getAppointmentDetails: (appointmentId: string, secretLink?: string): Promise<ApiResponse<Appointment>> => {
    const queryParams = secretLink ? `?secretLink=${secretLink}` : "";
    return api.get<Appointment>(`/appointments/${appointmentId}/details${queryParams}`);
  },

  getAvailableSlots: (
    appointmentId: string,
    date: string,
    userId?: string,
    resourceId?: string
  ): Promise<ApiResponse<TimeSlot[]>> => {
    const queryParams = new URLSearchParams({ date });
    if (userId) queryParams.append("userId", userId);
    if (resourceId) queryParams.append("resourceId", resourceId);

    return api.get<TimeSlot[]>(`/appointments/${appointmentId}/slots?${queryParams.toString()}`);
  },

  // Protected endpoints (require authentication)
  createBooking: (token: string, appointmentId: string, bookingData: {
    startTime: string;
    resourceId?: string;
    assignedUserId?: string;
    userResponses?: any;
    secretLink?: string;
    numberOfSlots?: number; // Number of continuous slots to book
  }): Promise<ApiResponse<Booking>> =>
    api.post<Booking>(`/appointments/${appointmentId}/book`, bookingData, token),

  getUserBookings: (token: string): Promise<ApiResponse<Booking[]>> =>
    api.get<Booking[]>("/bookings/my", token),

  getOrganizationBookings: (token: string): Promise<ApiResponse<Booking[]>> =>
    api.get<Booking[]>("/bookings/organization", token),

  cancelBooking: (token: string, bookingId: string) =>
    api.delete(`/bookings/${bookingId}`, token),

  cancelBookingByOrganization: (token: string, bookingId: string) =>
    api.delete(`/bookings/${bookingId}/organization`, token),
};

// Payments API functions
export const paymentsApi = {
  createOrder: (token: string, bookingId: string) =>
    api.post<{ orderId: string; amount: number; currency: string; bookingId: string; merchantKeyId: string | null }>(
      "/payments/create-order",
      { bookingId },
      token
    ),
};

// Media API functions
export const mediaApi = {
  uploadFile: async (token: string, file: File, folder: string = "general") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return response.json();
  },

  deleteFile: async (token: string, fileUrl: string) => {
    const response = await fetch(`${API_BASE_URL}/media/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileUrl }),
    });

    return response.json();
  },
};

// Public API functions (no authentication required)
export const publicApi = {
  // Get all organizations with search
  getAllOrganizations: (search?: string): Promise<ApiResponse<{
    organizations: Array<{
      id: string;
      name: string;
      description: string | null;
      location: string | null;
      businessHours: any;
      createdAt: string;
      publishedAppointmentsCount: number;
    }>
  }>> => {
    const queryParams = search ? `?search=${encodeURIComponent(search)}` : "";
    return api.get(`/public/organizations${queryParams}`);
  },

  // Get single organization with published appointments
  getOrganizationById: (organizationId: string): Promise<ApiResponse<{
    organization: Organization & {
      appointments: Appointment[];
    };
  }>> => {
    return api.get(`/public/organizations/${organizationId}`);
  },
};

// Notification API functions
export const notificationApi = {
  // Get all notifications for current user
  getNotifications: (token: string, params?: {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
  }): Promise<ApiResponse<{
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    unreadCount: number;
  }>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.read !== undefined) queryParams.append("read", params.read.toString());
    if (params?.type) queryParams.append("type", params.type);

    const endpoint = `/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return api.get(endpoint, token);
  },

  // Get unread notification count
  getUnreadCount: (token: string): Promise<ApiResponse<{ unreadCount: number }>> =>
    api.get("/notifications/unread-count", token),

  // Mark notification as read
  markAsRead: (token: string, notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`, {}, token),

  // Mark all notifications as read
  markAllAsRead: (token: string) =>
    api.put("/notifications/mark-all-read", {}, token),

  // Delete a notification
  deleteNotification: (token: string, notificationId: string) =>
    api.delete(`/notifications/${notificationId}`, token),

  // Delete all read notifications
  deleteAllRead: (token: string) =>
    api.delete("/notifications/read", token),
};

// Admin API functions (requires admin privileges)
export const adminApi = {
  // Get admin dashboard statistics
  getStats: (token: string): Promise<ApiResponse<{
    totalUsers: number;
    totalOrganizations: number;
    totalAppointments: number;
    totalBookings: number;
    verifiedUsers: number;
    activeUsers: number;
    pendingAppointments: number;
    confirmedAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    revenueThisMonth: number;
    recentBookings: number;
  }>> => api.get("/admin/stats", token),

  // Get all users with pagination and filters
  getAllUsers: (token: string, params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<{
    users: Array<{
      id: string;
      name: string;
      email: string;
      role: "USER" | "ORGANIZATION";
      emailVerified: boolean;
      isActive: boolean;
      isMember?: boolean;
      createdAt: string;
      updatedAt: string;
      organization?: { id: string; name: string };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.role) queryParams.append("role", params.role);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);

    const endpoint = `/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return api.get(endpoint, token);
  },

  // Get reports and analytics data
  getReports: (token: string, days?: number): Promise<ApiResponse<{
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalRevenue: number;
    averageBookingValue: number;
    peakHours: Array<{ hour: string; count: number }>;
    providerUtilization: Array<{ name: string; percentage: number; bookings: number }>;
    monthlyTrends: Array<{ month: string; appointments: number }>;
  }>> => {
    const endpoint = days ? `/admin/reports?days=${days}` : "/admin/reports";
    return api.get(endpoint, token);
  },

  // Get recent activity
  getRecentActivity: (token: string, limit?: number): Promise<ApiResponse<{
    activities: Array<{
      type: string;
      icon: string;
      text: string;
      time: string;
      color: string;
    }>;
  }>> => {
    const endpoint = limit ? `/admin/activity?limit=${limit}` : "/admin/activity";
    return api.get(endpoint, token);
  },

  // Delete a user by ID
  deleteUser: (token: string, userId: string): Promise<ApiResponse<void>> =>
    api.delete(`/admin/users/${userId}`, token),
};
