"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/lib/auth";
import { organizationApi } from "@/lib/api";
import { Resource } from "@/lib/types";
import {
    Plus,
    Trash2,
    AlertCircle,
    Package,
    Users,
    Calendar,
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

interface ResourceWithUI extends Resource {
    isDeleting?: boolean;
}

export default function ResourcesManagement() {
    const [resources, setResources] = useState<ResourceWithUI[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Form state
    const [newResourceName, setNewResourceName] = useState("");
    const [newResourceCapacity, setNewResourceCapacity] = useState("");

    // Fetch resources on mount
    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const accessToken = authStorage.getAccessToken();
            if (!accessToken) {
                setError("Not authenticated");
                return;
            }
            console.log("ACCESSTOKEN", accessToken)

            const response = await organizationApi.getResources(accessToken);
            console.log("RESPONSE", response);

            if (response.success && response.data?.resources) {
                setResources(response.data.resources);
                console.log("response.data", response.data)
            } else {
                setError(response.message || "Failed to load resources");
                console.log("RESPONSE ERROR", response)
            }
        } catch (err: any) {
            console.error("Fetch resources error:", err);
            setError(err.message || "Failed to load resources");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateResource = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);

        // Validation
        if (!newResourceName.trim()) {
            setCreateError("Resource name is required");
            return;
        }

        const capacity = parseInt(newResourceCapacity);
        if (isNaN(capacity) || capacity <= 0) {
            setCreateError("Capacity must be a positive number");
            return;
        }

        try {
            setIsCreating(true);

            const accessToken = authStorage.getAccessToken();
            if (!accessToken) {
                setCreateError("Not authenticated");
                return;
            }

            const response = await organizationApi.createResource(accessToken, {
                name: newResourceName.trim(),
                capacity: capacity,
            });

            if (response.success && response.data?.resource) {
                // Add new resource to list
                setResources([response.data.resource, ...resources]);

                // Reset form and close dialog
                setNewResourceName("");
                setNewResourceCapacity("");
                setIsCreateDialogOpen(false);
            } else {
                setCreateError(response.message || "Failed to create resource");
            }
        } catch (err: any) {
            console.error("Create resource error:", err);
            setCreateError(err.message || "Failed to create resource");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteResource = async (resourceId: string) => {
        if (!confirm("Are you sure you want to delete this resource? This action cannot be undone.")) {
            return;
        }

        try {
            // Set deleting state for this resource
            setResources((prev) =>
                prev.map((r) => (r.id === resourceId ? { ...r, isDeleting: true } : r))
            );

            const accessToken = authStorage.getAccessToken();
            if (!accessToken) {
                alert("Not authenticated");
                return;
            }

            const response = await organizationApi.deleteResource(accessToken, resourceId);

            if (response.success) {
                // Remove resource from list
                setResources((prev) => prev.filter((r) => r.id !== resourceId));
            } else {
                alert(response.message || "Failed to delete resource");
                // Reset deleting state
                setResources((prev) =>
                    prev.map((r) => (r.id === resourceId ? { ...r, isDeleting: false } : r))
                );
            }
        } catch (err: any) {
            console.error("Delete resource error:", err);
            alert(err.message || "Failed to delete resource");
            // Reset deleting state
            setResources((prev) =>
                prev.map((r) => (r.id === resourceId ? { ...r, isDeleting: false } : r))
            );
        }
    };

    const openCreateDialog = () => {
        setNewResourceName("");
        setNewResourceCapacity("");
        setCreateError(null);
        setIsCreateDialogOpen(true);
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
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error && resources.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Failed to Load Resources</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={fetchResources}>Try Again</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Package className="h-8 w-8" />
                        Resources
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your organization's resources and their capacities
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Resource
                </Button>
            </div>

            {/* Resources List */}
            {resources.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Resources Yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Get started by creating your first resource
                    </p>
                    <Button onClick={openCreateDialog} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Your First Resource
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {resources.map((resource) => (
                        <ResourceCard
                            key={resource.id}
                            resource={resource}
                            onDelete={handleDeleteResource}
                        />
                    ))}
                </div>
            )}

            {/* Create Resource Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Create New Resource
                        </DialogTitle>
                        <DialogDescription>
                            Add a new resource to your organization. Resources can be rooms,
                            equipment, or any bookable items.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateResource} className="space-y-4">
                        {createError && (
                            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{createError}</span>
                            </div>
                        )}

                        <Field>
                            <FieldLabel>Resource Name *</FieldLabel>
                            <Input
                                type="text"
                                placeholder="e.g., Conference Room A, Projector #1"
                                value={newResourceName}
                                onChange={(e) => setNewResourceName(e.target.value)}
                                disabled={isCreating}
                                required
                            />
                        </Field>

                        <Field>
                            <FieldLabel>Capacity *</FieldLabel>
                            <Input
                                type="number"
                                min="1"
                                placeholder="e.g., 10"
                                value={newResourceCapacity}
                                onChange={(e) => setNewResourceCapacity(e.target.value)}
                                disabled={isCreating}
                                required
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Maximum number of people/items this resource can handle at once
                            </p>
                        </Field>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                                disabled={isCreating}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating} className="gap-2">
                                <Plus className="h-4 w-4" />
                                {isCreating ? "Creating..." : "Create Resource"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Resource Card Component
function ResourceCard({
    resource,
    onDelete,
}: {
    resource: ResourceWithUI;
    onDelete: (id: string) => void;
}) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-card">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{resource.name}</h3>
                        <p className="text-sm text-muted-foreground">
                            Created {formatDate(resource.createdAt)}
                        </p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(resource.id)}
                    disabled={resource.isDeleting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="font-semibold">{resource.capacity}</span>
                </div>

                <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>ID: {resource.id.slice(0, 8)}...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
