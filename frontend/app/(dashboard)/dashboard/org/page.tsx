"use client"

import { useUser } from '@/contexts/UserContext'
import { 
    Building2, 
    MapPin, 
    Clock, 
    User, 
    Mail, 
    Shield, 
    BadgeCheck,
    Calendar,
    Users,
    Settings,
    ArrowRight,
    Sparkles
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export default function OrganizationPage() {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return (
            <div className="w-full py-6 space-y-8">
                {/* Header Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-10 w-72" />
                    <Skeleton className="h-5 w-96" />
                </div>
                
                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>

                {/* Cards Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-72 rounded-xl" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            </div>
        );
    }

    const organization = user?.adminOrganization || user?.organization;
    const isAdmin = !user?.isMember;

    return (
        <div className="w-full py-6 space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {organization?.name || 'Organization Dashboard'}
                            </h1>
                        </div>
                        <p className="text-muted-foreground max-w-lg">
                            {organization?.description || 'Manage your organization, appointments, and resources all in one place.'}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Badge variant={isAdmin ? "default" : "secondary"} className="px-3 py-1.5 text-sm">
                            <Shield className="h-3.5 w-3.5 mr-1.5" />
                            {isAdmin ? 'Administrator' : 'Member'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/dashboard/org/all-appointments" className="group">
                    <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-semibold mt-3">All Bookings</h3>
                            <p className="text-sm text-muted-foreground">View and manage bookings</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/org/appointments" className="group">
                    <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                                    <Sparkles className="h-5 w-5 text-purple-500" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-semibold mt-3">Appointments</h3>
                            <p className="text-sm text-muted-foreground">Create & edit appointments</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/org/resources" className="group">
                    <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                                    <Users className="h-5 w-5 text-emerald-500" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-semibold mt-3">Resources</h3>
                            <p className="text-sm text-muted-foreground">Manage team & resources</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/org/settings" className="group">
                    <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                                    <Settings className="h-5 w-5 text-orange-500" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-semibold mt-3">Settings</h3>
                            <p className="text-sm text-muted-foreground">Organization settings</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Account Information - Takes 2 columns */}
                <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Account Information</CardTitle>
                                <CardDescription>Your personal details</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-lg truncate">{user?.name || 'Not set'}</p>
                                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                                    <p className="font-medium">{user?.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Role</p>
                                    <Badge variant="outline" className="mt-1">{user?.role}</Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                        <span className="font-medium">{isAdmin ? 'Administrator' : 'Member'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Organization Details - Takes 3 columns */}
                {organization && (
                    <Card className="lg:col-span-3 hover:shadow-lg transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Building2 className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Organization Details</CardTitle>
                                    <CardDescription>Your organization information</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Organization Name & Location */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 className="h-3 w-3" /> Organization Name
                                    </p>
                                    <p className="font-semibold text-lg">{organization.name}</p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3" /> Location
                                    </p>
                                    <p className="font-semibold text-lg">{organization.location}</p>
                                </div>
                            </div>

                            {/* Business Hours */}
                            {organization.businessHours && organization.businessHours.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold">Business Hours</h4>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {organization.businessHours.map((hours: any, index: number) => (
                                            <div 
                                                key={index} 
                                                className="p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                                            >
                                                <p className="font-medium text-sm">{hours.day}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {hours.from} - {hours.to}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Organization ID */}
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div>
                                    <p className="text-xs text-muted-foreground">Organization ID</p>
                                    <p className="font-mono text-sm">{organization.id}</p>
                                </div>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/dashboard/org/settings">
                                        <Settings className="h-4 w-4 mr-1.5" />
                                        Manage
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
