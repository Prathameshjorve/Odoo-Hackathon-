"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BookNow</span>
          </div>
          <nav className="flex items-center gap-3">
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
              Schedule Smarter,
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Work Better Together
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The all-in-one appointment management platform that helps teams and organizations streamline scheduling, collaborate effortlessly, and never miss a beat.
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
                <Calendar />Book Appointments
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
              Everything You Need to
              <span className="text-primary"> Manage Appointments</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to save time, reduce no-shows, and keep everyone on the same page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Cards */}
            {[
              {
                icon: CalendarCheck,
                title: "Smart Scheduling",
                description: "Intelligent booking system that automatically finds the best time slots for everyone",
                gradient: "from-blue-500/10 to-cyan-500/10"
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Coordinate with team members and manage multiple calendars in one place",
                gradient: "from-purple-500/10 to-pink-500/10"
              },
              {
                icon: Bell,
                title: "Smart Reminders",
                description: "Automated notifications and reminders to reduce no-shows by up to 80%",
                gradient: "from-orange-500/10 to-red-500/10"
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-level encryption and secure authentication to protect your data",
                gradient: "from-green-500/10 to-emerald-500/10"
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Optimized performance ensures smooth experience even with thousands of appointments",
                gradient: "from-yellow-500/10 to-amber-500/10"
              },
              {
                icon: TrendingUp,
                title: "Analytics & Insights",
                description: "Track booking trends and optimize your schedule with detailed analytics",
                gradient: "from-indigo-500/10 to-violet-500/10"
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

      {/* Benefits Section */}
      <section className=" px-4 md:px-8 py-20">
        <div >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="border-primary/20 bg-primary/5">
                  Why Choose BookNow
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold">
                  Save Time, Increase Productivity
                </h2>
                <p className="text-lg text-muted-foreground">
                  Join thousands of professionals who have transformed their scheduling workflow with BookNow.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  "Reduce scheduling time by 90%",
                  "Eliminate double bookings forever",
                  "Sync across all your devices",
                  "Integrate with your favorite tools",
                  "24/7 customer support"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="size-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <Link href="/register">
                  <Button size="lg" className="font-semibold">
                    Get Started Now
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 via-primary/10 to-background rounded-2xl p-8 border shadow-2xl">
                <div className="h-full w-full bg-card rounded-xl border p-6 space-y-4">
                  {/* Mock Calendar UI */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <h3 className="font-semibold text-lg">Your Schedule</h3>
                    <Calendar className="size-5 text-primary" />
                  </div>
                  {[
                    { time: "09:00 AM", title: "Team Meeting", color: "bg-blue-500" },
                    { time: "11:30 AM", title: "Client Call", color: "bg-purple-500" },
                    { time: "02:00 PM", title: "Project Review", color: "bg-green-500" },
                    { time: "04:30 PM", title: "1-on-1 Session", color: "bg-orange-500" }
                  ].map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                      <div className={`w-1 h-12 ${event.color} rounded-full`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {event.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                Join thousands of teams already using BookNow to manage their appointments seamlessly.
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
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">BookNow</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The modern way to manage appointments and schedules.
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
            <p>&copy; 2025 BookNow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
