export interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ORGANIZATION";
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  isMember?: boolean;
  organizationId?: string | null;
  organizationName?: string;
  organization?: Organization;
  adminOrganization?: Organization;
  phone?: string | null;
  // Computed on backend: whether this user's organization has a Razorpay connection
  razorpayConnected?: boolean;
  // Super admin flag - set for specific admin emails
  isAdmin?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  location: string | null;
  businessHours?: BusinessHour[];
  description?: string | null;
  adminId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessHour {
  day: string;
  from: string;
  to: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: "USER" | "ORGANIZATION";
}

export interface LoginData {
  email: string;
  password: string;
}

export interface Resource {
  id: string;
  name: string;
  capacity: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  bookType: "USER" | "RESOURCE";
  assignmentType: "AUTOMATIC" | "BY_VISITOR";
  allowMultipleSlots: boolean;
  maxSlotsPerBooking?: number; // Maximum continuous slots a user can book
  price?: number;
  isPaid?: boolean;
  location?: string;
  picture?: string;
  cancellationHours: number;
  schedule: any; // JSON
  questions: any; // JSON
  isPublished: boolean;
  secretLink?: string;
  expiryTime?: string;
  expiryCapacity?: number;
  bookingsCount: number;
  introMessage?: string;
  confirmationMessage?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  allowedUsers?: User[];
  allowedResources?: Resource[];
}

export interface Booking {
  id: string;
  appointmentId: string;
  userId: string;
  resourceId?: string;
  assignedUserId?: string;
  startTime: string;
  endTime: string;
  numberOfSlots?: number; // Number of continuous slots booked
  userResponses?: any;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  totalAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  appointment?: Appointment;
  user?: User;
  resource?: Resource;
  assignedUser?: User;
}

export interface TimeSlot {
  start?: string;
  end?: string;
  startTime?: string;
  endTime?: string;
  availableCount?: number; // Number of available spots in this slot
}

export type NotificationType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_UPDATED"
  | "APPOINTMENT_PUBLISHED"
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "RESOURCE_CREATED"
  | "RESOURCE_DELETED"
  | "ORGANIZATION_UPDATED"
  | "EMAIL_VERIFIED"
  | "PASSWORD_CHANGED";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  relatedId?: string;
  relatedType?: string;
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}
