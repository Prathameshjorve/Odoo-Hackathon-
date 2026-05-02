import * as React from "react"
import Link from "next/link"
import {
  Package,
  Settings,
  ChevronDown,
  User2,
  LogOut,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MenuItem, MenuSectionType } from "@/types"
// TODO: Create menu-items.ts file or define menuSections here
// import { menuSections } from "./menu-items"



const useActiveRoute = () => {
  const pathname = usePathname()
  const isExactMatch = React.useCallback(
    (url: string) => pathname === url,
    [pathname]
  )

  const isActiveRoute = React.useCallback(
    (url: string, hasSubItems: boolean = false) => {
      // Exact match for dashboard home
      if (url === "/dashboard") {
        return pathname === url
      }

      // For parent items with subitems, don't highlight when on child routes
      if (hasSubItems && pathname.startsWith(url + "/")) {
        return false
      }

      // Check for exact match or child route
      return pathname === url || pathname.startsWith(url + "/")
    },
    [pathname]
  )

  const shouldExpandCollapsible = React.useCallback(
    (url: string) => pathname.startsWith(url),
    [pathname]
  )

  return { isExactMatch, isActiveRoute, shouldExpandCollapsible }
}

const MenuItemWithSubItems = ({ item, isActive, isExactMatch, shouldExpand }: {
  item: MenuItem
  isActive: (url: string, hasSubItems?: boolean) => boolean
  isExactMatch: (url: string) => boolean
  shouldExpand: (url: string) => boolean
}) => (
  <Collapsible asChild defaultOpen={shouldExpand(item.url)}>
    <SidebarMenuItem>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton>
          <item.icon />
          <span>{item.title}</span>
          <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.subItems?.map((subItem) => (
            <SidebarMenuSubItem key={subItem.url}>
              <SidebarMenuSubButton asChild isActive={isExactMatch(subItem.url)}>
                <Link href={subItem.url}>
                  <span>{subItem.title}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </SidebarMenuItem>
  </Collapsible>
)

const RegularMenuItem = ({ item, isActive }: {
  item: MenuItem
  isActive: (url: string, hasSubItems?: boolean) => boolean
}) => (
  <SidebarMenuItem>
    <SidebarMenuButton asChild isActive={isActive(item.url)}>
      <Link href={item.url}>
        <item.icon />
        <span>{item.title}</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)

const useAuthHook = () => {
  const router = useRouter()
  const [user, setUser] = React.useState<any>(null)

  React.useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem("user")
    localStorage.removeItem("devAccessToken")

    // Clear cookies by setting them to expire
    document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

    // Redirect to login
    router.push("/login")
  }

  return { user, logout }
}

const MenuSection = ({ section, isActive, isExactMatch, shouldExpand, userRole }: {
  section: MenuSectionType
  isActive: (url: string, hasSubItems?: boolean) => boolean
  isExactMatch: (url: string) => boolean
  shouldExpand: (url: string) => boolean
  userRole?: "owner" | "manager" | "employee"
}) => {
  // Filter items based on user role
  const filteredItems = section.items.filter(item => {
    if (!item.roles) return true // No role restriction
    if (!userRole) return false // No user role, hide restricted items
    // Normalize role to lowercase for comparison (backend sends OWNER/MANAGER/STAFF)
    const normalizedRole = userRole.toLowerCase() as "owner" | "manager" | "employee"
    return item.roles.includes(normalizedRole)
  })

  // Don't render section if all items are filtered out
  if (filteredItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {filteredItems.map((item) =>
            item.subItems ? (
              <MenuItemWithSubItems
                key={item.url}
                item={item}
                isActive={isActive}
                isExactMatch={isExactMatch}
                shouldExpand={shouldExpand}
              />
            ) : (
              <RegularMenuItem key={item.url} item={item} isActive={isActive} />
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const { user, logout } = useAuthHook()
  const { isExactMatch, isActiveRoute, shouldExpandCollapsible } = useActiveRoute()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="StockMaster" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">StockMaster</span>
                  <span className="truncate text-xs">Inventory System</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* TODO: Uncomment when menuSections is defined */}
        {/* {menuSections.map((section) => (
          <MenuSection
            key={section.label}
            section={section}
            isActive={isActiveRoute}
            isExactMatch={isExactMatch}
            shouldExpand={shouldExpandCollapsible}
            userRole={user?.role?.toLowerCase()}
          />
        ))} */}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip={{
                    children: user?.name || user?.email || "User",
                    hidden: false,
                  }}
                >
                  <div className="flex items-center justify-center">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || user?.email || "User"}</span>
                    <span className="truncate text-xs capitalize">{user?.role?.toLowerCase() || "staff"}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/account">
                    <User2 className="mr-2 h-4 w-4" />
                    <span>Account</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
