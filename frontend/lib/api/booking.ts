import { apiClient } from "./client";

export const bookingApi = {
  // Get published appointments (public)
  getPublishedAppointments: async (
    token: string,
    params?: {
      organizationId?: string;
      search?: string;
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.organizationId) queryParams.append("organizationId", params.organizationId);
    if (params?.search) queryParams.append("search", params.search);
    
    const endpoint = `/appointments/published${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return await apiClient.get(endpoint, token);
  },

  // Get appointment details (public with optional secret link)
  getAppointmentDetails: async (id: string, token: string, secretLink?: string) => {
    const queryParams = new URLSearchParams();
    if (secretLink) queryParams.append("secretLink", secretLink);
    
    const endpoint = `/appointments/${id}/details${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return await apiClient.get(endpoint, token);
  },

  // Get available time slots
  getAvailableSlots: async (
    id: string,
    date: string,
    token: string,
    userId?: string,
    resourceId?: string
  ) => {
    const queryParams = new URLSearchParams({ date });
    if (userId) queryParams.append("userId", userId);
    if (resourceId) queryParams.append("resourceId", resourceId);

    const endpoint = `/appointments/${id}/slots?${queryParams.toString()}`;
    return await apiClient.get(endpoint, token);
  },

  // Create a booking (requires auth)
  createBooking: async (
    appointmentId: string,
    bookingData: {
      startTime: string;
      resourceId?: string;
      assignedUserId?: string;
      userResponses?: any;
      secretLink?: string;
    },
    token: string
  ) => {
    return await apiClient.post(
      `/appointments/${appointmentId}/book`,
      bookingData,
      token
    );
  },

  // Get user's bookings (requires auth)
  getUserBookings: async (token: string) => {
    return await apiClient.get("/bookings/my", token);
  },

  // Get organization bookings (requires auth - org admin/member)
  getOrganizationBookings: async (token: string) => {
    return await apiClient.get("/bookings/organization", token);
  },

  // Cancel a booking (requires auth)
  cancelBooking: async (bookingId: string, token: string) => {
    return await apiClient.delete(`/bookings/${bookingId}`, token);
  },
};
