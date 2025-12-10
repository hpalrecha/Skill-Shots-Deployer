import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Users, BookOpen, CreditCard, Settings, Trash2, Edit2, Crown, CheckCircle2, UserPlus, Shield, Mail } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  settings: any;
  createdAt: string;
  updatedAt: string;
  license: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    currentUsers: number;
    currentCreators: number;
    currentCourses: number;
    currentStorageMb: number;
    startsAt: string;
    expiresAt: string | null;
    limits?: LicensePlan;
  } | null;
  memberCount: number;
}

interface LicensePlan {
  id: string;
  name: string;
  description: string | null;
  maxUsers: number;
  maxCreators: number;
  maxCourses: number;
  maxStorageMb: number;
  features: any;
  priceMonthly: string | null;
  priceYearly: string | null;
  isActive: boolean;
}

interface OrgAdmin {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  joinedAt: string;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface SuperAdminDashboardProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function SuperAdminDashboard({ currentUser }: SuperAdminDashboardProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [licensePlans, setLicensePlans] = useState<LicensePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LicensePlan | null>(null);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [orgAdmins, setOrgAdmins] = useState<Record<string, OrgAdmin[]>>({});
  const [isAddOrgAdminDialogOpen, setIsAddOrgAdminDialogOpen] = useState(false);
  const [isEditOrgAdminDialogOpen, setIsEditOrgAdminDialogOpen] = useState(false);
  const [selectedOrgForAdmin, setSelectedOrgForAdmin] = useState<Organization | null>(null);
  const [selectedOrgAdmin, setSelectedOrgAdmin] = useState<OrgAdmin | null>(null);
  const [newOrgAdmin, setNewOrgAdmin] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const { toast } = useToast();

  const [newOrg, setNewOrg] = useState({
    name: "",
    slug: "",
    description: "",
    planId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [orgsRes, plansRes] = await Promise.all([
        fetch('/api/organizations', { credentials: 'include' }),
        fetch('/api/license-plans', { credentials: 'include' }),
      ]);

      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        setOrganizations(orgsData);
      }
      
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setLicensePlans(plansData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrgAdmins = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/members`, { credentials: 'include' });
      if (response.ok) {
        const members = await response.json();
        const admins = members.filter((m: OrgAdmin) => m.role === 'admin' || m.user?.role === 'OrgAdmin');
        setOrgAdmins(prev => ({ ...prev, [orgId]: admins }));
      }
    } catch (error) {
      console.error('Error fetching org admins:', error);
    }
  };

  const handleAddOrgAdmin = async () => {
    if (!selectedOrgForAdmin || !newOrgAdmin.name || !newOrgAdmin.email || !newOrgAdmin.password) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${selectedOrgForAdmin.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newOrgAdmin.name,
          email: newOrgAdmin.email,
          password: newOrgAdmin.password,
          role: 'OrgAdmin',
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Organization admin created successfully",
        });
        setIsAddOrgAdminDialogOpen(false);
        setNewOrgAdmin({ name: "", email: "", password: "" });
        fetchOrgAdmins(selectedOrgForAdmin.id);
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create organization admin",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create organization admin",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrgAdmin = async () => {
    if (!selectedOrgForAdmin || !selectedOrgAdmin) return;

    try {
      const response = await fetch(`/api/organizations/${selectedOrgForAdmin.id}/members/${selectedOrgAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role: 'admin',
          isActive: selectedOrgAdmin.isActive,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Organization admin updated successfully",
        });
        setIsEditOrgAdminDialogOpen(false);
        setSelectedOrgAdmin(null);
        fetchOrgAdmins(selectedOrgForAdmin.id);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update organization admin",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update organization admin",
        variant: "destructive",
      });
    }
  };

  const handleRemoveOrgAdmin = async (orgId: string, membershipId: string) => {
    if (!window.confirm('Are you sure you want to remove this admin from the organization?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}/members/${membershipId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Organization admin removed successfully",
        });
        fetchOrgAdmins(orgId);
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to remove organization admin",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove organization admin",
        variant: "destructive",
      });
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrg.name || !newOrg.slug) {
      toast({
        title: "Validation Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newOrg),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Organization created successfully",
        });
        setIsCreateOrgDialogOpen(false);
        setNewOrg({ name: "", slug: "", description: "", planId: "" });
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create organization",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrganization = async (orgId: string, data: Partial<Organization>) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Organization updated successfully",
        });
        setIsEditDialogOpen(false);
        setSelectedOrg(null);
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update organization",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update organization",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrganization = async (orgId: string) => {
    if (!window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Organization deleted successfully",
        });
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete organization",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete organization",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLicensePlan = async (planId: string, data: Partial<LicensePlan>) => {
    try {
      const response = await fetch(`/api/license-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "License plan updated successfully",
        });
        setIsEditPlanDialogOpen(false);
        setSelectedPlan(null);
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update license plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update license plan",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLicensePlan = async (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this license plan? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/license-plans/${planId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "License plan deleted successfully",
        });
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete license plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete license plan",
        variant: "destructive",
      });
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  const totalUsers = organizations.reduce((sum, org) => sum + (org.license?.currentUsers || 0), 0);
  const totalCourses = organizations.reduce((sum, org) => sum + (org.license?.currentCourses || 0), 0);
  const activeOrgs = organizations.filter(org => org.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            SuperAdmin Dashboard
          </h1>
          <p className="text-muted-foreground">Manage organizations, licenses, and platform settings</p>
        </div>
        
        <Dialog open={isCreateOrgDialogOpen} onOpenChange={setIsCreateOrgDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-org">
              <Plus className="h-4 w-4 mr-2" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Set up a new customer organization with a license plan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  data-testid="input-org-name"
                  value={newOrg.name}
                  onChange={(e) => {
                    setNewOrg(prev => ({
                      ...prev,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    }));
                  }}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">URL Slug</Label>
                <Input
                  id="org-slug"
                  data-testid="input-org-slug"
                  value={newOrg.slug}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="acme-corp"
                />
                <p className="text-xs text-muted-foreground">Used in URLs: skillshots.app/{newOrg.slug || 'your-slug'}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-description">Description</Label>
                <Textarea
                  id="org-description"
                  data-testid="input-org-description"
                  value={newOrg.description}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the organization"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-plan">License Plan</Label>
                <Select
                  value={newOrg.planId}
                  onValueChange={(value) => setNewOrg(prev => ({ ...prev, planId: value }))}
                >
                  <SelectTrigger data-testid="select-org-plan">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {licensePlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.priceMonthly}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOrgDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrganization} data-testid="button-submit-org">
                Create Organization
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-xs text-muted-foreground">{activeOrgs} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Across all organizations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">Published content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">License Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{licensePlans.length}</div>
            <p className="text-xs text-muted-foreground">Available plans</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations" data-testid="tab-organizations">
            <Building2 className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-plans">
            <CreditCard className="h-4 w-4 mr-2" />
            License Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          {organizations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No organizations yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first customer organization to get started.
                </p>
                <Button onClick={() => setIsCreateOrgDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {organizations.map(org => (
                <Card key={org.id} data-testid={`card-org-${org.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle>{org.name}</CardTitle>
                        <Badge variant={org.isActive ? "default" : "secondary"} className="text-xs">
                          {org.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {org.license && (
                          <Badge variant="outline" className="text-xs">
                            {org.license.planName}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{org.description || `/${org.slug}`}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedOrg(org);
                          setIsEditDialogOpen(true);
                        }}
                        data-testid={`button-edit-org-${org.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteOrganization(org.id)}
                        data-testid={`button-delete-org-${org.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Members</p>
                        <p className="text-lg font-semibold">
                          {org.license?.currentUsers || 0}
                          {org.license?.limits && (
                            <span className="text-sm text-muted-foreground font-normal">
                              /{org.license.limits.maxUsers}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Creators</p>
                        <p className="text-lg font-semibold">
                          {org.license?.currentCreators || 0}
                          {org.license?.limits && (
                            <span className="text-sm text-muted-foreground font-normal">
                              /{org.license.limits.maxCreators}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Courses</p>
                        <p className="text-lg font-semibold">
                          {org.license?.currentCourses || 0}
                          {org.license?.limits && (
                            <span className="text-sm text-muted-foreground font-normal">
                              /{org.license.limits.maxCourses}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">License Status</p>
                        <p className="text-lg font-semibold flex items-center gap-1">
                          {org.license ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              {org.license.status}
                            </>
                          ) : (
                            <span className="text-muted-foreground">No license</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">Organization Admins</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOrgForAdmin(org);
                            setIsAddOrgAdminDialogOpen(true);
                            if (!orgAdmins[org.id]) {
                              fetchOrgAdmins(org.id);
                            }
                          }}
                          data-testid={`button-add-orgadmin-${org.id}`}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add Admin
                        </Button>
                      </div>
                      
                      {orgAdmins[org.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {orgAdmins[org.id].map((admin) => (
                            <div 
                              key={admin.id} 
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              data-testid={`orgadmin-row-${admin.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Shield className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{admin.user?.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {admin.user?.email || 'No email'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-xs">OrgAdmin</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedOrgForAdmin(org);
                                    setSelectedOrgAdmin(admin);
                                    setIsEditOrgAdminDialogOpen(true);
                                  }}
                                  data-testid={`button-edit-orgadmin-${admin.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveOrgAdmin(org.id, admin.id)}
                                  data-testid={`button-remove-orgadmin-${admin.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-sm text-muted-foreground">
                          <p>No admins yet.</p>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => fetchOrgAdmins(org.id)}
                          >
                            Load admins
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {licensePlans.map(plan => (
              <Card key={plan.id} data-testid={`card-plan-${plan.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    {plan.name}
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    ${plan.priceMonthly}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Users</span>
                      <span className="font-medium">{plan.maxUsers === 999999 ? 'Unlimited' : plan.maxUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Creators</span>
                      <span className="font-medium">{plan.maxCreators === 999999 ? 'Unlimited' : plan.maxCreators}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Courses</span>
                      <span className="font-medium">{plan.maxCourses === 999999 ? 'Unlimited' : plan.maxCourses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage</span>
                      <span className="font-medium">{plan.maxStorageMb >= 50000 ? 'Unlimited' : `${plan.maxStorageMb}MB`}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {plan.features && Object.entries(plan.features as Record<string, boolean>)
                        .filter(([, enabled]) => enabled)
                        .map(([feature]) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature.replace(/([A-Z])/g, ' $1').trim()}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div className="pt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setIsEditPlanDialogOpen(true);
                      }}
                      data-testid={`button-edit-plan-${plan.id}`}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLicensePlan(plan.id)}
                      data-testid={`button-delete-plan-${plan.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization settings and status.
            </DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-org-name">Organization Name</Label>
                <Input
                  id="edit-org-name"
                  data-testid="input-edit-org-name"
                  value={selectedOrg.name}
                  onChange={(e) => setSelectedOrg(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-org-description">Description</Label>
                <Textarea
                  id="edit-org-description"
                  data-testid="input-edit-org-description"
                  value={selectedOrg.description || ''}
                  onChange={(e) => setSelectedOrg(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-org-active">Active Status</Label>
                <Switch
                  id="edit-org-active"
                  data-testid="switch-org-active"
                  checked={selectedOrg.isActive}
                  onCheckedChange={(checked) => setSelectedOrg(prev => prev ? { ...prev, isActive: checked } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedOrg(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedOrg && handleUpdateOrganization(selectedOrg.id, {
                name: selectedOrg.name,
                description: selectedOrg.description,
                isActive: selectedOrg.isActive,
              })}
              data-testid="button-save-org"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit License Plan</DialogTitle>
            <DialogDescription>
              Update license plan details and limits.
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="edit-plan-name">Plan Name</Label>
                <Input
                  id="edit-plan-name"
                  data-testid="input-edit-plan-name"
                  value={selectedPlan.name}
                  onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plan-description">Description</Label>
                <Textarea
                  id="edit-plan-description"
                  data-testid="input-edit-plan-description"
                  value={selectedPlan.description || ''}
                  onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-price">Monthly Price ($)</Label>
                  <Input
                    id="edit-plan-price"
                    data-testid="input-edit-plan-price"
                    type="number"
                    value={selectedPlan.priceMonthly || ''}
                    onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, priceMonthly: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-yearly">Yearly Price ($)</Label>
                  <Input
                    id="edit-plan-yearly"
                    data-testid="input-edit-plan-yearly"
                    type="number"
                    value={selectedPlan.priceYearly || ''}
                    onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, priceYearly: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-users">Max Users</Label>
                  <Input
                    id="edit-plan-users"
                    data-testid="input-edit-plan-users"
                    type="number"
                    value={selectedPlan.maxUsers}
                    onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, maxUsers: parseInt(e.target.value) || 0 } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-creators">Max Creators</Label>
                  <Input
                    id="edit-plan-creators"
                    data-testid="input-edit-plan-creators"
                    type="number"
                    value={selectedPlan.maxCreators}
                    onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, maxCreators: parseInt(e.target.value) || 0 } : null)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-courses">Max Courses</Label>
                  <Input
                    id="edit-plan-courses"
                    data-testid="input-edit-plan-courses"
                    type="number"
                    value={selectedPlan.maxCourses}
                    onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, maxCourses: parseInt(e.target.value) || 0 } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-storage">Storage (MB)</Label>
                  <Input
                    id="edit-plan-storage"
                    data-testid="input-edit-plan-storage"
                    type="number"
                    value={selectedPlan.maxStorageMb}
                    onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, maxStorageMb: parseInt(e.target.value) || 0 } : null)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-plan-active">Active Status</Label>
                <Switch
                  id="edit-plan-active"
                  data-testid="switch-plan-active"
                  checked={selectedPlan.isActive}
                  onCheckedChange={(checked) => setSelectedPlan(prev => prev ? { ...prev, isActive: checked } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditPlanDialogOpen(false);
              setSelectedPlan(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedPlan && handleUpdateLicensePlan(selectedPlan.id, {
                name: selectedPlan.name,
                description: selectedPlan.description,
                priceMonthly: selectedPlan.priceMonthly,
                priceYearly: selectedPlan.priceYearly,
                maxUsers: selectedPlan.maxUsers,
                maxCreators: selectedPlan.maxCreators,
                maxCourses: selectedPlan.maxCourses,
                maxStorageMb: selectedPlan.maxStorageMb,
                isActive: selectedPlan.isActive,
              })}
              data-testid="button-save-plan"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddOrgAdminDialogOpen} onOpenChange={setIsAddOrgAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organization Admin</DialogTitle>
            <DialogDescription>
              Create a new admin account for {selectedOrgForAdmin?.name}. This user will have full management access to the organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orgadmin-name">Full Name</Label>
              <Input
                id="orgadmin-name"
                data-testid="input-orgadmin-name"
                value={newOrgAdmin.name}
                onChange={(e) => setNewOrgAdmin(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgadmin-email">Email Address</Label>
              <Input
                id="orgadmin-email"
                data-testid="input-orgadmin-email"
                type="email"
                value={newOrgAdmin.email}
                onChange={(e) => setNewOrgAdmin(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgadmin-password">Password</Label>
              <Input
                id="orgadmin-password"
                data-testid="input-orgadmin-password"
                type="password"
                value={newOrgAdmin.password}
                onChange={(e) => setNewOrgAdmin(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter a secure password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddOrgAdminDialogOpen(false);
              setNewOrgAdmin({ name: "", email: "", password: "" });
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddOrgAdmin} data-testid="button-submit-orgadmin">
              <Shield className="h-4 w-4 mr-2" />
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOrgAdminDialogOpen} onOpenChange={setIsEditOrgAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization Admin</DialogTitle>
            <DialogDescription>
              Update admin settings for {selectedOrgAdmin?.user?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedOrgAdmin && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedOrgAdmin.user?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrgAdmin.user?.email}</p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="orgadmin-active">Active Status</Label>
                <Switch
                  id="orgadmin-active"
                  data-testid="switch-orgadmin-active"
                  checked={selectedOrgAdmin.isActive}
                  onCheckedChange={(checked) => setSelectedOrgAdmin(prev => prev ? { ...prev, isActive: checked } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditOrgAdminDialogOpen(false);
              setSelectedOrgAdmin(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOrgAdmin} data-testid="button-update-orgadmin">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
