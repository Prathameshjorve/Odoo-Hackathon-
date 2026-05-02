"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/lib/auth";
import { organizationApi } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import {
  Plus,
  Trash2,
  AlertCircle,
  Users,
  Mail,
  Shield,
  CheckCircle2,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  isMember: boolean;
  createdAt: string;
  isDeleting?: boolean;
}

export default function UsersManagement() {
  const { user } = useUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  const isAdmin = user && !user.isMember;

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        setError("Not authenticated");
        return;
      }

      const response = await organizationApi.getMembers(accessToken);

      if (response.success && response.data) {
        const data = response.data as { members: Member[] };
        setMembers(data.members);
      } else {
        setError(response.message || "Failed to load members");
      }
    } catch (err: any) {
      console.error("Fetch members error:", err);
      setError(err.message || "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError("Please enter a valid email address");
      return;
    }

    // Check if trying to add self
    if (user && inviteEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setInviteError("You cannot add yourself as a member");
      return;
    }

    try {
      setIsInviting(true);

      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        setInviteError("Not authenticated");
        return;
      }

      const response = await organizationApi.addMember(
        accessToken,
        inviteEmail.trim()
      );

      if (response.success && response.data) {
        const data = response.data as { member: Member };
        setMembers([...members, data.member]);
        setInviteSuccess(
          response.message ||
          "Member invited successfully! They will receive an email with login credentials."
        );
        setInviteEmail("");

        setTimeout(() => {
          setIsInviteDialogOpen(false);
          setInviteSuccess(null);
        }, 2500);
      } else {
        setInviteError(response.message || "Failed to invite member");
      }
    } catch (err: any) {
      console.error("Invite member error:", err);
      setInviteError(err.message || "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName}? They will lose access to all organization resources.`
      )
    ) {
      return;
    }

    try {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, isDeleting: true } : m))
      );

      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        alert("Not authenticated");
        return;
      }

      const response = await organizationApi.removeMember(accessToken, memberId);

      if (response.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        alert(response.message || "Failed to remove member");
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, isDeleting: false } : m))
        );
      }
    } catch (err: any) {
      console.error("Remove member error:", err);
      alert(err.message || "Failed to remove member");
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, isDeleting: false } : m))
      );
    }
  };

  const openInviteDialog = () => {
    setInviteEmail("");
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Members</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchMembers}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            Team Members
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Manage your organization's team members"
              : "View your organization's team members"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openInviteDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Members Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start building your team by inviting members
          </p>
          {isAdmin && (
            <Button onClick={openInviteDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Invite Your First Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isAdmin={!!isAdmin}
              currentUserId={user?.id}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      )}

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization. They'll receive an
              email with login credentials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteMember} className="space-y-4">
            {inviteError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <Field>
              <FieldLabel>Email Address *</FieldLabel>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={isInviting || !!inviteSuccess}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                If the user doesn't exist, we'll create an account and send them
                their login credentials
              </p>
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
                disabled={isInviting || !!inviteSuccess}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isInviting || !!inviteSuccess}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                {isInviting ? "Sending Invitation..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberCard({
  member,
  isAdmin,
  currentUserId,
  onRemove,
}: {
  member: Member;
  isAdmin: boolean;
  currentUserId?: string;
  onRemove: (id: string, name: string) => void;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isCurrentUser = member.id === currentUserId;
  const isMemberAdmin = !member.isMember;

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${isMemberAdmin
                ? "bg-purple-100 dark:bg-purple-900/20"
                : "bg-blue-100 dark:bg-blue-900/20"
              }`}
          >
            {isMemberAdmin ? (
              <Shield className="h-5 w-5 text-purple-600" />
            ) : (
              <Users className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {member.name}
              {isCurrentUser && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  You
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isMemberAdmin ? "Administrator" : "Member"}
            </p>
          </div>
        </div>

        {isAdmin && !isMemberAdmin && !isCurrentUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(member.id, member.name)}
            disabled={member.isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{member.email}</span>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          Joined {formatDate(member.createdAt)}
        </div>
      </div>
    </div>
  );
}
