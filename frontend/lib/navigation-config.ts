import {
  Calendar,
  CalendarCheck,
  Users,
  BarChart3,
  Home,
  CreditCard,
  Briefcase,
  Settings,
  UserCog,
} from "lucide-react";

export const navigationByRole = {
  customer: [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/dashboard/user/appointments", label: "My Appointments", icon: CalendarCheck },
    { href: "/search", label: "Book Appointments", icon: Calendar },
  ],
  organizer: [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/org/appointments", label: "Appointments", icon: CalendarCheck },
    { href: "/dashboard/org/all-appointments", label: "Booked Appointments", icon: CalendarCheck },
    { href: "/dashboard/org/resources", label: "Resources", icon: Briefcase },
    { href: "/dashboard/org/users", label: "Team", icon: Users },
    { href: "/dashboard/org/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/org/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Admin Dashboard", icon: Home },
    { href: "/dashboard/admin/users", label: "User Management", icon: UserCog }, // Wait, UserCog was used in Navbar
    { href: "/dashboard/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
  ],
};
