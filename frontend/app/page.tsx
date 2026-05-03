"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/theme-toggle";
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  Users, 
  Zap, 
  Shield, 
  Bell,
  CheckCircle2,
  Star,
  TrendingUp,
  Sparkles,
  CalendarCheck
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    const accessToken = authStorage.getAccessToken();
    if (accessToken) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen max-w-[1600px] mx-auto bg-gradient-to-b from-background via-background to-accent/5 dark:from-background dark:via-background dark:to-accent/10">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur  supports-[backdrop-filter]:bg-background/60">
        <div className=" flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 p-1.5 overflow-hidden">
              <img src="/logo.png" alt="BookFastX Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight">BookFastX</span>
          </div>
          <nav className="flex items-center gap-3">
            <ModeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="flex items-center gap-1.5">
                Get Started
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 md:px-8 py-20 md:py-32 overflow-hidden">
        {/* Elegant Radial Glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-radial from-primary/8 via-primary/3 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        </div>
        
        <div className="mx-auto text-center space-y-8 relative">
          {/* Badge */}
          <div className="flex justify-center animate-in fade-in slide-in-from-top-4 duration-1000">
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-primary/20 bg-primary/5">
              <Sparkles className="size-3.5 mr-1.5 text-primary" />
              Revolutionize Your Scheduling
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="space-y-6 animate-in fade-in slide-in-from-top-6 duration-1000 delay-150">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
              BookFastX,
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Work Stress-Free
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Simplify appointment scheduling, empower your team, and deliver exceptional customer experiences with our intelligent booking platform.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Get Started
                <ArrowRight className="ml-2 size-5" />
              </Button>
            </Link>
            <Link href="/search">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 font-semibold border-2 hover:bg-accent">
                <Calendar />BookFastX
              </Button>
            </Link>
          </div>
    
        </div>
      </section>

      {/* Features Grid */}
      <section className=" px-4 md:px-8 py-20 bg-accent/5 dark:bg-accent/5">
        <div className=" space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Master Your Schedule
              <span className="text-primary"> Effortlessly</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features to simplify bookings, reduce no-shows, and keep your team perfectly synchronized.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Cards */}
            {[
              {
                icon: CalendarCheck,
                title: "Smart Scheduling",
                description: "Intelligent booking system that automatically finds the best time slots for everyone",
                gradient: "from-blue-500/10 to-slate-500/10"
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Coordinate with team members and manage multiple calendars in one place",
                gradient: "from-slate-500/10 to-blue-400/10"
              },
              {
                icon: Bell,
                title: "Smart Reminders",
                description: "Automated notifications and reminders to reduce no-shows by up to 80%",
                gradient: "from-blue-400/10 to-cyan-400/10"
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-level encryption and secure authentication to protect your data",
                gradient: "from-slate-600/10 to-slate-500/10"
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Optimized performance ensures smooth experience even with thousands of appointments",
                gradient: "from-blue-600/10 to-blue-400/10"
              },
              {
                icon: TrendingUp,
                title: "Analytics & Insights",
                description: "Track booking trends and optimize your schedule with detailed analytics",
                gradient: "from-cyan-500/10 to-blue-500/10"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative bg-card hover:bg-accent/50 border rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-xl`} />
                <div className="relative space-y-4">
                  <div className="inline-flex p-3 bg-primary/10 rounded-lg">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className=" px-4 md:px-8 py-20">
        <div >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-12 text-center text-primary-foreground shadow-2xl">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
            <div className="relative space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Transform Your Scheduling?
              </h2>
              <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
                Join thousands of teams already using BookFastX to manage their appointments seamlessly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base px-8 py-6 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    Create Free Account
                    <ArrowRight className="ml-2 size-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 font-semibold bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
                    Sign In to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-accent/5">
        <div className=" px-4 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 p-1.5 overflow-hidden">
                  <img src="/logo.png" alt="BookFastX Logo" className="h-full w-full object-contain" />
                </div>
                <span className="text-lg font-bold tracking-tight">BookFastX</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The smart way to book, manage, and optimize your appointments.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2026 BookFastX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
