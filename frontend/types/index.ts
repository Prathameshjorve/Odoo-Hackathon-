import { LucideIcon } from "lucide-react"

export interface SubMenuItem {
  title: string
  url: string
}

export interface MenuItem {
  title: string
  url: string
  icon: LucideIcon
  subItems?: SubMenuItem[]
  roles?: ("owner" | "manager" | "employee")[]
}

export interface MenuSectionType {
  label: string
  items: MenuItem[]
  roles?: ("owner" | "manager" | "employee")[]
}


export interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN" | "OWNER" | "MANAGER" | "EMPLOYEE";
  verified: boolean;
}
