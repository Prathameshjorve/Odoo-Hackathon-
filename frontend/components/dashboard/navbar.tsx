
"use client";

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  SlashIcon,
  LogOut,
  User,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { GetUserData, clearAuthData } from "@/lib/auth";
import NotificationDropdown from "./notification-dropdown";
import { useRouter } from "next/navigation";
import { ModeToggle } from "../theme-toggle";
import { navigationByRole } from "@/lib/navigation-config";

// ---------------------- Types ----------------------
type UserRole = "customer" | "organizer" | "admin";

// ---------------------- Navigation Config ----------------------


// Mobile navigation structure
const getMobileNav = (role: UserRole) => {
  const items = navigationByRole[role] || navigationByRole.customer;

  if (role === "admin") {
    return [
      {
        name: "Administration",
        items: items.map(item => ({ label: item.label, href: item.href })),
      },
    ];
  }

  if (role === "organizer") {
    return [
      {
        name: "Organization",
        items: items.map(item => ({ label: item.label, href: item.href })),
      },
    ];
  }

  return [
    {
      name: "Main",
      items: items.map(item => ({ label: item.label, href: item.href })),
    },
  ];
};

// Mobile Nav Component
function MobileNav({ nav }: { nav: { name: string; items: { label: string; href: string }[] }[] }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "extend-touch-target block size-8 touch-manipulation items-center justify-start gap-2.5 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent md:hidden dark:hover:bg-transparent"
          )}
        >
          <div className="relative flex items-center justify-center">
            <div className="relative size-4">
              <span
                className={cn(
                  "bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100",
                  open ? "top-[0.4rem] -rotate-45" : "top-1"
                )}
              />
              <span
                className={cn(
                  "bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100",
                  open ? "top-[0.4rem] rotate-45" : "top-2.5"
                )}
              />
            </div>
            <span className="sr-only">Toggle Menu</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background/90 no-scrollbar h-(--radix-popover-content-available-height) w-(--radix-popover-content-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur duration-100"
        align="start"
        side="bottom"
        alignOffset={-16}
        sideOffset={4}
      >
        <div className="flex flex-col gap-12 overflow-auto px-6 py-6">
          {nav.map((category, index) => (
            <div className="flex flex-col gap-4" key={index}>
              <p className="text-muted-foreground text-sm font-medium">
                {category.name}
              </p>
              <div className="flex flex-col gap-3">
                {category.items.map((item, idx) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      className={cn(
                        "text-2xl font-medium",
                        isActive && "text-primary"
                      )}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------- User Profile Dropdown ----------------------
function UserProfileDropdown({
  align,
  sizeClass,
  userName,
  userEmail,
  userRole,
  onLogout,
}: {
  align: "start" | "center" | "end"
  sizeClass: string
  userName: string
  userEmail: string
  userRole: string
  onLogout: () => void
}) {
  const handleLogout = () => {
    onLogout();
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            sizeClass
          )}
          aria-label="Open user menu"
        >
          <Avatar className={cn("h-full w-full")}>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userName || 'User'}`} alt="User avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
            <p className="text-xs leading-none text-muted-foreground capitalize mt-1">
              Role: {userRole}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="flex items-center cursor-pointer">
            <Link href="/dashboard/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>


        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------- Navbar ----------------------
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userData, setUserData] = React.useState<{
    name: string;
    email: string;
    role: UserRole;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const userRole = userData?.isAdmin ? "admin" : userData?.role === "ORGANIZATION" ? "organizer" : "customer";
  const userName = userData?.name || "";
  const userEmail = userData?.email || "";
  const navigationLinks = userData ? navigationByRole[userRole] : [];
  const mobileNavStructure = userData ? getMobileNav(userRole) : [{ name: "Main", items: [] }];

  const handleLogout = React.useCallback(() => {
    clearAuthData();
    router.push("/login");
  }, [router]);

  React.useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const data = await GetUserData();
        if (data) {
          console.log("Navbar - User data:", data); // Debug log
          setUserData({
            name: data.name,
            email: data.email,
            role: data.role as UserRole
          });
        } else {
          // No user data, redirect to login
          router.push("/login");
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  return (
    <header className="sticky top-0 z-50 border-border w-full flex-col items-center justify-between gap-3 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center justify-between gap-4 h-16">
        <div className="flex flex-1 items-center justify-start gap-2">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "dark:hover:bg-accent text-accent-foreground hidden md:flex h-8 w-8"
            )}
          >
            {/* Logo - Calendar Icon */}
            <Calendar className="h-5 w-5" />
          </Link>

          <SlashIcon className="hidden md:flex h-4 w-4 text-muted-foreground -rotate-[20deg]" />

          <MobileNav nav={mobileNavStructure} />

          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-lg hidden sm:inline-block">BookFastX</span>
          </Link>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Separator
            orientation="vertical"
            className="hidden data-[orientation=vertical]:h-5 md:flex"
          />
          <ModeToggle />
          <div className="flex items-center gap-1.5">
            <NotificationDropdown />
          </div>

          <Separator
            orientation="vertical"
            className="hidden data-[orientation=vertical]:h-5 sm:flex"
          />

          {isLoading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : (
            <UserProfileDropdown
              align="end"
              sizeClass="h-8 w-8"
              userName={userName}
              userEmail={userEmail}
              userRole={userRole}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>


    </header>
  )
}
