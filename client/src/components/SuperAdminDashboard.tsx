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
import { Building2, Plus, Users, BookOpen, CreditCard, Settings, Trash2, Edit2, Crown, CheckCircle2, UserPlus, Shield, Mail, Brain, TrendingUp, Zap, Key } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  maxTokensPerMonth: number;
  includesAi: boolean;
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

interface AiUsageSummary {
  organizationId: string | null;
  organizationName: string;
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  endpointBreakdown: { endpoint: string; requests: number; tokens: number }[];
}

interface PlatformTotals {
  totalRequests: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  estimatedCost: number;
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
  const [aiUsageSummary, setAiUsageSummary] = useState<AiUsageSummary[]>([]);
  const [platformTotals, setPlatformTotals] = useState<PlatformTotals>({
    totalRequests: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    estimatedCost: 0,
  });
  const [isAiUsageLoading, setIsAiUsageLoading] = useState(false);
  
  // AI Settings state
  const [aiSettings, setAiSettings] = useState({
    provider: "gemini",
    geminiModel: "gemini-2.5-flash",
    openaiModel: "gpt-4o",
    deepseekModel: "deepseek-chat",
    isActive: true,
    updatedAt: null as string | null,
    apiKeyStatus: {
      gemini: false,
      openai: false,
      deepseek: false,
    },
  });
  const [isAiSettingsLoading, setIsAiSettingsLoading] = useState(false);
  const [isSavingAiSettings, setIsSavingAiSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  
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

  const fetchAiUsage = async () => {
    setIsAiUsageLoading(true);
    try {
      const response = await fetch('/api/ai-usage/summary', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAiUsageSummary(data.summary || []);
        setPlatformTotals(data.platformTotals || {
          totalRequests: 0,
          totalTokens: 0,
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          estimatedCost: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching AI usage:', error);
    } finally {
      setIsAiUsageLoading(false);
    }
  };

  const fetchAiSettings = async () => {
    setIsAiSettingsLoading(true);
    try {
      const response = await fetch('/api/admin/ai-settings', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAiSettings(data);
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setIsAiSettingsLoading(false);
    }
  };

  const saveAiSettings = async () => {
    setIsSavingAiSettings(true);
    try {
      const response = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: aiSettings.provider,
          geminiModel: aiSettings.geminiModel,
          openaiModel: aiSettings.openaiModel,
          deepseekModel: aiSettings.deepseekModel,
          isActive: aiSettings.isActive,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSettings(data);
        toast({
          title: "Success",
          description: "AI settings updated successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update AI settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: "Error",
        description: "Failed to save AI settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingAiSettings(false);
    }
  };
  
  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingApiKey(true);
    try {
      const keyData: Record<string, string> = {};
      if (aiSettings.provider === "gemini") {
        keyData.geminiKey = apiKeyInput;
      } else if (aiSettings.provider === "openai") {
        keyData.openaiKey = apiKeyInput;
      } else if (aiSettings.provider === "deepseek") {
        keyData.deepseekKey = apiKeyInput;
      }
      
      const response = await fetch('/api/admin/ai-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(keyData),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSettings(prev => ({
          ...prev,
          apiKeyStatus: data.apiKeyStatus,
        }));
        setApiKeyInput("");
        toast({
          title: "Success",
          description: "API key saved securely",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setIsSavingApiKey(false);
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
                        {plan.name} - ₹{plan.priceMonthly}/mo
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

      <Tabs defaultValue={organizations.some(o => !o.isActive && o.settings?.pendingApproval) ? "pending" : "organizations"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            <Shield className="h-4 w-4 mr-2" />
            Pending Approvals
            {organizations.filter(o => !o.isActive && o.settings?.pendingApproval).length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {organizations.filter(o => !o.isActive && o.settings?.pendingApproval).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="organizations" data-testid="tab-organizations">
            <Building2 className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-plans">
            <CreditCard className="h-4 w-4 mr-2" />
            License Plans
          </TabsTrigger>
          <TabsTrigger value="ai-usage" data-testid="tab-ai-usage" onClick={fetchAiUsage}>
            <Brain className="h-4 w-4 mr-2" />
            AI Usage
          </TabsTrigger>
          <TabsTrigger value="ai-settings" data-testid="tab-ai-settings" onClick={fetchAiSettings}>
            <Settings className="h-4 w-4 mr-2" />
            AI Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {(() => {
            const pendingOrgs = organizations.filter(o => !o.isActive && o.settings?.pendingApproval);
            if (pendingOrgs.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No pending approvals</h3>
                    <p className="text-muted-foreground text-center">
                      All organization registrations have been processed.
                    </p>
                  </CardContent>
                </Card>
              );
            }
            return (
              <div className="grid gap-4">
                {pendingOrgs.map(org => (
                  <Card key={org.id} data-testid={`card-pending-org-${org.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle>{org.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">Pending Approval</Badge>
                            {org.license && (
                              <Badge variant="outline" className="text-xs">{org.license.planName}</Badge>
                            )}
                          </div>
                          <CardDescription>
                            Registered: {org.settings?.registeredAt ? new Date(org.settings.registeredAt).toLocaleDateString() : 'Unknown'}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/organizations/${org.id}/approve`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ approved: true }),
                                });
                                if (response.ok) {
                                  toast({ title: "Success", description: `${org.name} has been approved and activated.` });
                                  fetchData();
                                } else {
                                  const data = await response.json();
                                  throw new Error(data.error || 'Failed to approve');
                                }
                              } catch (err: any) {
                                toast({ title: "Error", description: err.message, variant: "destructive" });
                              }
                            }}
                            data-testid={`button-approve-org-${org.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/organizations/${org.id}/approve`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ approved: false }),
                                });
                                if (response.ok) {
                                  toast({ title: "Rejected", description: `${org.name} registration has been rejected.` });
                                  fetchData();
                                } else {
                                  const data = await response.json();
                                  throw new Error(data.error || 'Failed to reject');
                                }
                              } catch (err: any) {
                                toast({ title: "Error", description: err.message, variant: "destructive" });
                              }
                            }}
                            data-testid={`button-reject-org-${org.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Selected Plan</p>
                          <p className="font-medium">{org.license?.planName || 'No plan'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Max Users</p>
                          <p className="font-medium">{org.license?.limits?.maxUsers || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Max Courses</p>
                          <p className="font-medium">{org.license?.limits?.maxCourses || '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>

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
                    ₹{plan.priceMonthly}
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Tokens/Month</span>
                      <span className="font-medium">{plan.maxTokensPerMonth >= 100000000 ? 'Unlimited' : `${(plan.maxTokensPerMonth / 1000000).toFixed(1)}M`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Included</span>
                      <Badge variant={plan.includesAi ? "default" : "secondary"} className="text-xs">
                        {plan.includesAi ? 'Yes' : 'Bring Your Own'}
                      </Badge>
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

        <TabsContent value="ai-usage" className="space-y-4">
          {isAiUsageLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading AI usage data...</div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Total API Requests</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{platformTotals.totalRequests.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Across all organizations</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{platformTotals.totalTokens.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {platformTotals.totalPromptTokens.toLocaleString()} input / {platformTotals.totalCompletionTokens.toLocaleString()} output
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{platformTotals.estimatedCost.toFixed(4)}</div>
                    <p className="text-xs text-muted-foreground">Based on Gemini pricing</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Organizations Using AI</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiUsageSummary.length}</div>
                    <p className="text-xs text-muted-foreground">With recorded usage</p>
                  </CardContent>
                </Card>
              </div>

              {aiUsageSummary.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No AI usage recorded yet</h3>
                    <p className="text-muted-foreground text-center">
                      AI token usage will appear here once users start using AI-powered features.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Usage by Organization</CardTitle>
                    <CardDescription>Token usage breakdown per customer organization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {aiUsageSummary.map((org) => (
                        <div
                          key={org.organizationId || 'platform'}
                          className="flex items-center justify-between p-4 border rounded-md"
                          data-testid={`ai-usage-org-${org.organizationId || 'platform'}`}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{org.organizationName}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>{org.totalRequests} requests</span>
                              <span>{org.totalTokens.toLocaleString()} tokens</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">₹{org.estimatedCost.toFixed(4)}</p>
                            <p className="text-xs text-muted-foreground">estimated cost</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Feature Usage Breakdown</CardTitle>
                  <CardDescription>Token usage by AI endpoint/feature</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const endpointTotals = new Map<string, { requests: number; tokens: number }>();
                      aiUsageSummary.forEach((org) => {
                        org.endpointBreakdown?.forEach((ep) => {
                          const current = endpointTotals.get(ep.endpoint) || { requests: 0, tokens: 0 };
                          endpointTotals.set(ep.endpoint, {
                            requests: current.requests + ep.requests,
                            tokens: current.tokens + ep.tokens,
                          });
                        });
                      });
                      const sortedEndpoints = Array.from(endpointTotals.entries())
                        .sort((a, b) => b[1].tokens - a[1].tokens);
                      
                      if (sortedEndpoints.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No endpoint data available yet
                          </p>
                        );
                      }

                      return sortedEndpoints.map(([endpoint, data]) => {
                        const percentage = platformTotals.totalTokens > 0 
                          ? (data.tokens / platformTotals.totalTokens) * 100 
                          : 0;
                        const endpointName = endpoint.replace('/api/gemini/', '').replace(/-/g, ' ');
                        return (
                          <div key={endpoint} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{endpointName}</span>
                              <span className="text-muted-foreground">
                                {data.requests} calls / {data.tokens.toLocaleString()} tokens
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="ai-settings" className="space-y-4">
          {isAiSettingsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading AI settings...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    AI Provider Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure which AI provider and model to use for all AI features across the platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ai-provider">Active AI Provider</Label>
                      <Select
                        value={aiSettings.provider}
                        onValueChange={(value) => setAiSettings(prev => ({ ...prev, provider: value }))}
                      >
                        <SelectTrigger id="ai-provider" data-testid="select-ai-provider">
                          <SelectValue placeholder="Select AI provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">
                            <div className="flex items-center gap-2">
                              <span>Google Gemini</span>
                              {aiSettings.apiKeyStatus?.gemini && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Key Configured</Badge>
                              )}
                            </div>
                          </SelectItem>
                          <SelectItem value="openai">
                            <div className="flex items-center gap-2">
                              <span>OpenAI (ChatGPT)</span>
                              {aiSettings.apiKeyStatus?.openai && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Key Configured</Badge>
                              )}
                            </div>
                          </SelectItem>
                          <SelectItem value="deepseek">
                            <div className="flex items-center gap-2">
                              <span>DeepSeek</span>
                              {aiSettings.apiKeyStatus?.deepseek && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Key Configured</Badge>
                              )}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="model-select">
                        {aiSettings.provider === "gemini" && "Gemini Model"}
                        {aiSettings.provider === "openai" && "OpenAI Model"}
                        {aiSettings.provider === "deepseek" && "DeepSeek Model"}
                      </Label>
                      
                      {aiSettings.provider === "gemini" && (
                        <Select
                          value={aiSettings.geminiModel || "gemini-2.5-flash"}
                          onValueChange={(value) => setAiSettings(prev => ({ ...prev, geminiModel: value }))}
                        >
                          <SelectTrigger id="model-select" data-testid="select-gemini-model">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</SelectItem>
                            <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</SelectItem>
                            <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      {aiSettings.provider === "openai" && (
                        <Select
                          value={aiSettings.openaiModel || "gpt-4o"}
                          onValueChange={(value) => setAiSettings(prev => ({ ...prev, openaiModel: value }))}
                        >
                          <SelectTrigger id="model-select" data-testid="select-openai-model">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4o">GPT-4o (Latest)</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      {aiSettings.provider === "deepseek" && (
                        <Select
                          value={aiSettings.deepseekModel || "deepseek-chat"}
                          onValueChange={(value) => setAiSettings(prev => ({ ...prev, deepseekModel: value }))}
                        >
                          <SelectTrigger id="model-select" data-testid="select-deepseek-model">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                            <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                            <SelectItem value="deepseek-reasoner">DeepSeek Reasoner</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Key className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-xs ${
                          (aiSettings.provider === "gemini" && aiSettings.apiKeyStatus?.gemini) ||
                          (aiSettings.provider === "openai" && aiSettings.apiKeyStatus?.openai) ||
                          (aiSettings.provider === "deepseek" && aiSettings.apiKeyStatus?.deepseek)
                            ? 'text-green-600' 
                            : 'text-amber-600'
                        }`}>
                          {(aiSettings.provider === "gemini" && aiSettings.apiKeyStatus?.gemini) ||
                           (aiSettings.provider === "openai" && aiSettings.apiKeyStatus?.openai) ||
                           (aiSettings.provider === "deepseek" && aiSettings.apiKeyStatus?.deepseek)
                            ? 'API key configured' 
                            : 'API key not set - configure below'}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>AI Features Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable or disable AI features platform-wide
                        </p>
                      </div>
                      <Switch
                        checked={aiSettings.isActive}
                        onCheckedChange={(checked) => setAiSettings(prev => ({ ...prev, isActive: checked }))}
                        data-testid="switch-ai-active"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {aiSettings.updatedAt && (
                        <span>Last updated: {new Date(aiSettings.updatedAt).toLocaleString()}</span>
                      )}
                    </div>
                    <Button 
                      onClick={saveAiSettings} 
                      disabled={isSavingAiSettings}
                      data-testid="button-save-ai-settings"
                    >
                      {isSavingAiSettings ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Key for {aiSettings.provider === "gemini" ? "Google Gemini" : aiSettings.provider === "openai" ? "OpenAI" : "DeepSeek"}
                  </CardTitle>
                  <CardDescription>
                    Enter your API key to enable AI features. Keys are encrypted and stored securely.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={
                          (aiSettings.provider === "gemini" && aiSettings.apiKeyStatus?.gemini) ||
                          (aiSettings.provider === "openai" && aiSettings.apiKeyStatus?.openai) ||
                          (aiSettings.provider === "deepseek" && aiSettings.apiKeyStatus?.deepseek)
                            ? "default" 
                            : "destructive"
                        }
                      >
                        {(aiSettings.provider === "gemini" && aiSettings.apiKeyStatus?.gemini) ||
                         (aiSettings.provider === "openai" && aiSettings.apiKeyStatus?.openai) ||
                         (aiSettings.provider === "deepseek" && aiSettings.apiKeyStatus?.deepseek)
                          ? "Key Configured" 
                          : "Not Configured"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {aiSettings.provider === "gemini" && "Get your key from Google AI Studio"}
                        {aiSettings.provider === "openai" && "Get your key from OpenAI Dashboard"}
                        {aiSettings.provider === "deepseek" && "Get your key from DeepSeek Platform"}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="api-key-input">
                        {(aiSettings.provider === "gemini" && aiSettings.apiKeyStatus?.gemini) ||
                         (aiSettings.provider === "openai" && aiSettings.apiKeyStatus?.openai) ||
                         (aiSettings.provider === "deepseek" && aiSettings.apiKeyStatus?.deepseek)
                          ? "Update API Key (leave blank to keep current)" 
                          : "Enter API Key"}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="api-key-input"
                          type="password"
                          placeholder={`Enter your ${aiSettings.provider === "gemini" ? "Gemini" : aiSettings.provider === "openai" ? "OpenAI" : "DeepSeek"} API key`}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          data-testid="input-api-key"
                          className="flex-1"
                        />
                        <Button 
                          onClick={saveApiKey}
                          disabled={isSavingApiKey || !apiKeyInput.trim()}
                          data-testid="button-save-api-key"
                        >
                          {isSavingApiKey ? "Saving..." : "Save Key"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your API key is encrypted with AES-256 before storage and is never exposed.
                      </p>
                    </div>
                    
                    {!((aiSettings.provider === "gemini" && aiSettings.apiKeyStatus?.gemini) ||
                       (aiSettings.provider === "openai" && aiSettings.apiKeyStatus?.openai) ||
                       (aiSettings.provider === "deepseek" && aiSettings.apiKeyStatus?.deepseek)) && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          AI features will not work until you configure an API key for the selected provider.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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
                  <Label htmlFor="edit-plan-price">Monthly Price (₹)</Label>
                  <Input
                    id="edit-plan-price"
                    data-testid="input-edit-plan-price"
                    type="number"
                    value={selectedPlan.priceMonthly || ''}
                    onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, priceMonthly: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-yearly">Yearly Price (₹)</Label>
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
              <div className="space-y-2">
                <Label htmlFor="edit-plan-tokens">AI Token Cap (per month)</Label>
                <Input
                  id="edit-plan-tokens"
                  data-testid="input-edit-plan-tokens"
                  type="number"
                  value={selectedPlan.maxTokensPerMonth || 1000000}
                  onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, maxTokensPerMonth: parseInt(e.target.value) || 1000000 } : null)}
                />
                <p className="text-xs text-muted-foreground">
                  Set to 100,000,000 or higher for unlimited
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="edit-plan-includes-ai">AI Included in Plan</Label>
                  <p className="text-xs text-muted-foreground">
                    If disabled, organizations must provide their own AI API key
                  </p>
                </div>
                <Switch
                  id="edit-plan-includes-ai"
                  data-testid="switch-plan-includes-ai"
                  checked={selectedPlan.includesAi ?? true}
                  onCheckedChange={(checked) => setSelectedPlan(prev => prev ? { ...prev, includesAi: checked } : null)}
                />
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
                maxTokensPerMonth: selectedPlan.maxTokensPerMonth,
                includesAi: selectedPlan.includesAi ?? true,
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
              <Separator />
              <div className="space-y-2">
                <Label>Reset Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="reset-password"
                    data-testid="input-reset-password"
                    type="password"
                    placeholder="Enter new password (min 6 chars)"
                    value={(selectedOrgAdmin as any).newPassword || ""}
                    onChange={(e) => setSelectedOrgAdmin(prev => prev ? { ...prev, newPassword: e.target.value } : null)}
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const newPassword = (selectedOrgAdmin as any).newPassword;
                      if (!newPassword || newPassword.length < 6) {
                        toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
                        return;
                      }
                      try {
                        const response = await fetch(`/api/users/${selectedOrgAdmin.userId}/reset-password`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ newPassword }),
                        });
                        if (response.ok) {
                          toast({ title: "Success", description: "Password has been reset" });
                          setSelectedOrgAdmin(prev => prev ? { ...prev, newPassword: "" } : null);
                        } else {
                          const data = await response.json();
                          throw new Error(data.error || 'Failed to reset password');
                        }
                      } catch (err: any) {
                        toast({ title: "Error", description: err.message, variant: "destructive" });
                      }
                    }}
                    data-testid="button-reset-password"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
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
