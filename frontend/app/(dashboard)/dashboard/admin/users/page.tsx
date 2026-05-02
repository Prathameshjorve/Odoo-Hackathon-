"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  UserCheck,
  UserX,
  Building2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Loader,
  Download,
} from "lucide-react";
import { authStorage } from "@/lib/auth";
import { adminApi } from "@/lib/api";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ORGANIZATION";
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  organization?: {
    id: string;
    name: string;
  };
  isMember?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        return;
      }

      const response = await adminApi.getAllUsers(accessToken, {
        page: pagination.page,
        limit: pagination.limit,
        role: roleFilter !== "all" ? roleFilter : undefined,
        search: searchQuery || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      if (response.success && response.data) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      console.error("Fetch users error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const viewUserDetails = (user: UserData) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const confirmDeleteUser = (user: UserData) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      const accessToken = authStorage.getAccessToken();
      if (!accessToken) return;

      const response = await adminApi.deleteUser(accessToken, userToDelete.id);

      if (response.success) {
        // Remove user from list
        setUsers(users.filter(u => u.id !== userToDelete.id));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
      }
    } catch (err: any) {
      console.error("Delete user error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const exportToCSV = () => {
    if (users.length === 0) return;

    const headers = ["Name", "Email", "Role", "Organization", "Status", "Email Verified", "Joined Date"];
    const csvData = users.map(user => [
      user.name || "—",
      user.email,
      user.role,
      user.organization?.name || "—",
      user.isActive ? "Verified" : "Unverified",
      user.emailVerified ? "Yes" : "No",
      formatDate(user.createdAt),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate stats from current users
  const stats = {
    total: pagination.total,
    active: users.filter(u => u.isActive).length,
    organizations: users.filter(u => u.role === "ORGANIZATION").length,
    inactive: users.filter(u => !u.isActive).length,
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="px-4 xl:px-6 py-6 space-y-6 animate-in fade-in duration-300">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 animate-pulse" />
          <Skeleton className="h-4 w-96 animate-pulse" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 animate-pulse" />
          <Skeleton className="h-10 w-32 animate-pulse" />
          <Skeleton className="h-10 w-32 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-20 animate-pulse" />
                <Skeleton className="h-8 w-16 animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
        <Card className="overflow-hidden">
          <div className="p-4">
            <Skeleton className="h-10 w-full animate-pulse" />
          </div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="p-4 border-t">
              <Skeleton className="h-6 w-full animate-pulse" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 xl:px-6 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User & Provider Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all users and service providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={exportToCSV} 
            disabled={users.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="USER">Users</SelectItem>
            <SelectItem value="ORGANIZATION">Organizations</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Verified</SelectItem>
            <SelectItem value="inactive">Unverified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            Total Users
          </div>
          <div className="text-2xl font-bold">{pagination.total}</div>
        </div>
        <div className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <UserCheck className="h-4 w-4" />
            Verified
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            Organizations
          </div>
          <div className="text-2xl font-bold">{stats.organizations}</div>
        </div>
        <div className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <UserX className="h-4 w-4" />
            Unverified
          </div>
          <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No users found</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-accent/50 transition-colors duration-150 cursor-pointer">
                  <TableCell className="font-medium">{user.name || '—'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.role === "ORGANIZATION"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                      }
                    >
                      {user.role === "ORGANIZATION" ? (
                        <Building2 className="h-3 w-3 mr-1" />
                      ) : (
                        <Users className="h-3 w-3 mr-1" />
                      )}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.organization ? (
                      <div>
                        <p className="text-sm">{user.organization.name}</p>
                        {user.isMember && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Member
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isActive ? "default" : "secondary"}
                      className={
                        user.isActive
                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                      }
                    >
                      {user.isActive ? "Verified" : "Unverified"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => viewUserDetails(user)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => confirmDeleteUser(user)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Info */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {users.length} of {pagination.total} users
          </span>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </div>
      )}

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about this user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="font-medium">{selectedUser.name || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Role
                  </label>
                  <Badge variant="outline" className="mt-1">
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <Badge
                    variant={selectedUser.isActive ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {selectedUser.isActive ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email Verified
                  </label>
                  <p className="font-medium">
                    {selectedUser.emailVerified ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Joined Date
                  </label>
                  <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
              {selectedUser.organization && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Organization
                  </label>
                  <p className="font-medium">{selectedUser.organization.name}</p>
                  {selectedUser.isMember && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Member
                    </Badge>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  User ID
                </label>
                <p className="font-mono text-sm">{selectedUser.id}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="py-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="font-medium">{userToDelete.name || 'Unnamed User'}</p>
                <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                <Badge variant="outline" className="mt-2">
                  {userToDelete.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                This will permanently delete the user account, all their bookings, notifications, and related data.
                {userToDelete.role === "ORGANIZATION" && (
                  <span className="block mt-2 text-red-600 font-medium">
                    Warning: This user is an organization admin. Deleting them will also delete their organization and all associated appointments.
                  </span>
                )}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
