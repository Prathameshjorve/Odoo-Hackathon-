"use client"

import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import {
    User,
    Building2,
    Mail,
    Shield,
    Hash,
    Calendar,
    Heart,
    Search,
    ArrowRight,
    Sparkles,
    Clock,
    Star
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function UserDashboardPage() {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return (
            <div className="w-full py-6 space-y-8">
                {/* Header Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-96" />
                </div>

                {/* Quick Actions Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>

                {/* Cards Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
                    <Skeleton className="h-80 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full py-6 space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 via-red-500/5 to-background border p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">
                                Welcome back, {user?.name?.split(' ')[0] || 'User'}!
                            </h1>
                            <p className="text-muted-foreground">
                                Manage your bookings and discover new appointments
                            </p>
                        </div>
                    </div>

                    <Badge variant="secondary" className="w-fit px-3 py-1.5 text-sm">
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        {user?.role}
                    </Badge>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/search" className="group">
                    <Card className="h-full hover:shadow-lg hover:border-rose-500/50 transition-all duration-300 cursor-pointer bg-gradient-to-br from-rose-500/5 to-transparent">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="p-2.5 bg-rose-500/10 rounded-xl group-hover:bg-rose-500/20 transition-colors">
                                    <Search className="h-5 w-5 text-rose-500" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-semibold mt-4 text-lg">Find Appointments</h3>
                            <p className="text-sm text-muted-foreground mt-1">Browse and book new appointments</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/user/appointments" className="group">
                    <Card className="h-full hover:shadow-lg hover:border-red-500/50 transition-all duration-300 cursor-pointer bg-gradient-to-br from-red-500/5 to-transparent">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="p-2.5 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                                    <Calendar className="h-5 w-5 text-red-500" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-semibold mt-4 text-lg">My Bookings</h3>
                            <p className="text-sm text-muted-foreground mt-1">View your upcoming appointments</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/profile" className="group">
                    <Card className="h-full hover:shadow-lg hover:border-rose-500/50 transition-all duration-300 cursor-pointer bg-gradient-to-br from-rose-500/5 to-transparent">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="p-2.5 bg-rose-500/10 rounded-xl group-hover:bg-rose-500/20 transition-colors">
                                    <User className="h-5 w-5 text-rose-500" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-semibold mt-4 text-lg">My Profile</h3>
                            <p className="text-sm text-muted-foreground mt-1">Update your personal details</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Account Information - Takes 2 columns */}
                <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Account Information</CardTitle>
                                <CardDescription>Your personal details and account info</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Profile Summary */}
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xl truncate">{user?.name || 'Not set'}</p>
                                <p className="text-muted-foreground truncate">{user?.email}</p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard/profile">Edit Profile</Link>
                            </Button>
                        </div>

                        <Separator />

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Email Address</p>
                                    <p className="font-medium truncate mt-1">{user?.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Account Type</p>
                                    <Badge variant="secondary" className="mt-1.5">{user?.role}</Badge>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl sm:col-span-2">
                                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Account ID</p>
                                    <p className="font-mono text-sm mt-1 truncate">{user?.id}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Upgrade Card - Takes 1 column */}
                <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300 border-primary/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                    <CardHeader className="relative">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Upgrade Account</CardTitle>
                                <CardDescription>Unlock more features</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="relative space-y-5">
                        <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/10">
                            <Building2 className="h-10 w-10 text-primary mb-3" />
                            <h3 className="font-semibold text-lg">Become an Organization</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                Create appointments, manage resources, and grow your business.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Star className="h-4 w-4 text-rose-500" />
                                <span>Create unlimited appointments</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Star className="h-4 w-4 text-rose-500" />
                                <span>Manage team members</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Star className="h-4 w-4 text-rose-500" />
                                <span>Track bookings & analytics</span>
                            </div>
                        </div>

                        <Button className="w-full" asChild>
                            <Link href="/dashboard/user/convert-user">
                                <Building2 className="h-4 w-4 mr-2" />
                                Convert to Organization
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Tips Section */}
            <Card className="bg-gradient-to-r from-rose-500/5 via-red-500/5 to-rose-500/5 border-rose-500/20">
                <CardContent className="py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-xl">
                            <Heart className="h-6 w-6 text-rose-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg">Quick Tip</h3>
                            <p className="text-muted-foreground mt-1">
                                Use the search feature to discover appointments from various organizations.
                                You can filter by category, location, and availability to find the perfect match!
                            </p>
                        </div>
                        <Button variant="outline" className="shrink-0" asChild>
                            <Link href="/search">
                                <Search className="h-4 w-4 mr-2" />
                                Start Searching
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
