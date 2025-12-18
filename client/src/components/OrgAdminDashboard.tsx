import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Users, BookOpen, CreditCard, Settings, Trash2, Edit2, UserPlus, Mail, ShieldCheck, User as UserIcon, Cpu, Zap, Activity } from "lucide-react";
import { User, UserRole } from "../types";

interface OrganizationMember {
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

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  settings: any;
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
    limits?: {
      maxUsers: number;
      maxCreators: number;
      maxCourses: number;
      maxStorageMb: number;
    };
  } | null;
}

interface OrgAdminDashboardProps {
  currentUser: User;
}

export default function OrgAdminDashboard({ currentUser }: OrgAdminDashboardProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  const { toast } = useToast();

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    role: "Learner",
    department: "",
  });

  const [aiUsage, setAiUsage] = useState<{
    totalRequests: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    estimatedCost: number;
    endpointBreakdown: { endpoint: string; requests: number; tokens: number }[];
  } | null>(null);
  const [isAiUsageLoading, setIsAiUsageLoading] = useState(false);

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    setIsLoading(true);
    try {
      const orgRes = await fetch('/api/my-organization', { credentials: 'include' });
      
      if (orgRes.ok) {
        const orgResponse = await orgRes.json();
        
        // Handle the response structure - API returns { currentOrganization, organizations, ... }
        const orgData = orgResponse.currentOrganization;
        
        if (!orgData) {
          toast({
            title: "Error",
            description: "You are not part of any organization",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Fetch license details for this organization
        const orgDetailRes = await fetch(`/api/organizations/${orgData.id}`, { credentials: 'include' });
        if (orgDetailRes.ok) {
          const orgWithLicense = await orgDetailRes.json();
          setOrganization(orgWithLicense);
        } else {
          setOrganization(orgData);
        }
        
        const membersRes = await fetch(`/api/organizations/${orgData.id}/members`, { credentials: 'include' });
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }
      } else {
        toast({
          title: "Error",
          description: "You are not part of any organization",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAiUsage = async () => {
    setIsAiUsageLoading(true);
    try {
      const response = await fetch('/api/my-organization/ai-usage', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAiUsage(data);
      }
    } catch (error) {
      console.error('Error fetching AI usage:', error);
    } finally {
      setIsAiUsageLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.password) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    if (!organization) return;

    try {
      const response = await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newMember.name,
          email: newMember.email,
          password: newMember.password,
          role: newMember.role,
          department: newMember.department || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Member added successfully",
        });
        setIsAddMemberDialogOpen(false);
        setNewMember({ name: "", email: "", password: "", role: "Learner", department: "" });
        fetchOrganizationData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    if (!organization) return;

    try {
      const response = await fetch(`/api/organizations/${organization.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Member role updated",
        });
        setIsEditMemberDialogOpen(false);
        setSelectedMember(null);
        fetchOrganizationData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update member",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!organization) return;
    
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organization.id}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Member removed successfully",
        });
        fetchOrganizationData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to remove member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OrgAdmin':
        return 'default';
      case 'Creator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0;
    return Math.min((current / max) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Organization Found</h2>
          <p className="text-muted-foreground">You are not associated with any organization. Please contact your administrator.</p>
        </Card>
      </div>
    );
  }

  const license = organization.license;
  const creatorCount = members.filter(m => m.role === 'Creator' || m.role === 'OrgAdmin').length;
  const learnerCount = members.filter(m => m.role === 'Learner').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-org-name">{organization.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">Organization Administration</p>
        </div>
        {license && (
          <Badge variant="secondary" className="text-sm">
            <CreditCard className="h-4 w-4 mr-1" />
            {license.planName} Plan
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Building2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="license" data-testid="tab-license">
            <CreditCard className="h-4 w-4 mr-2" />
            License
          </TabsTrigger>
          <TabsTrigger value="ai-usage" data-testid="tab-ai-usage" onClick={() => fetchAiUsage()}>
            <Cpu className="h-4 w-4 mr-2" />
            AI Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold" data-testid="text-total-members">{members.length}</span>
                  {license?.limits && license.limits.maxUsers > 0 && (
                    <span className="text-sm text-muted-foreground">/ {license.limits.maxUsers}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-chart-2" />
                  <span className="text-2xl font-bold" data-testid="text-creator-count">{creatorCount}</span>
                  {license?.limits && license.limits.maxCreators > 0 && (
                    <span className="text-sm text-muted-foreground">/ {license.limits.maxCreators}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Learners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-chart-3" />
                  <span className="text-2xl font-bold" data-testid="text-learner-count">{learnerCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-chart-4" />
                  <span className="text-2xl font-bold" data-testid="text-course-count">{license?.currentCourses || 0}</span>
                  {license?.limits && license.limits.maxCourses > 0 && (
                    <span className="text-sm text-muted-foreground">/ {license.limits.maxCourses}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button onClick={() => { setActiveTab("members"); setIsAddMemberDialogOpen(true); }} data-testid="button-add-member-quick">
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Member
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("members")} data-testid="button-manage-members-quick">
                <Users className="h-4 w-4 mr-2" />
                Manage Members
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("license")} data-testid="button-view-license-quick">
                <CreditCard className="h-4 w-4 mr-2" />
                View License
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Organization Members</CardTitle>
                <CardDescription>Manage users in your organization</CardDescription>
              </div>
              <Button onClick={() => setIsAddMemberDialogOpen(true)} data-testid="button-add-member">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No members yet. Add your first member to get started.</p>
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`member-row-${member.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-member-name-${member.id}`}>{member.user.name}</p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(member.role)} data-testid={`badge-member-role-${member.id}`}>
                          {member.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMember(member);
                            setIsEditMemberDialogOpen(true);
                          }}
                          data-testid={`button-edit-member-${member.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={member.user.id === currentUser.id}
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="license">
          {license ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        {license.planName} Plan
                      </CardTitle>
                      <CardDescription>
                        License Status: <Badge variant={license.status === 'active' ? 'default' : 'destructive'}>{license.status}</Badge>
                      </CardDescription>
                    </div>
                    {license.expiresAt && (
                      <div className="text-sm text-muted-foreground">
                        Expires: {new Date(license.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {license.limits && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Users</span>
                          <span>{license.currentUsers} / {license.limits.maxUsers === -1 ? 'Unlimited' : license.limits.maxUsers}</span>
                        </div>
                        {license.limits.maxUsers > 0 && (
                          <Progress value={getUsagePercentage(license.currentUsers, license.limits.maxUsers)} />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Creators</span>
                          <span>{license.currentCreators} / {license.limits.maxCreators === -1 ? 'Unlimited' : license.limits.maxCreators}</span>
                        </div>
                        {license.limits.maxCreators > 0 && (
                          <Progress value={getUsagePercentage(license.currentCreators, license.limits.maxCreators)} />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Courses</span>
                          <span>{license.currentCourses} / {license.limits.maxCourses === -1 ? 'Unlimited' : license.limits.maxCourses}</span>
                        </div>
                        {license.limits.maxCourses > 0 && (
                          <Progress value={getUsagePercentage(license.currentCourses, license.limits.maxCourses)} />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Storage</span>
                          <span>{license.currentStorageMb} MB / {license.limits.maxStorageMb === -1 ? 'Unlimited' : `${license.limits.maxStorageMb} MB`}</span>
                        </div>
                        {license.limits.maxStorageMb > 0 && (
                          <Progress value={getUsagePercentage(license.currentStorageMb, license.limits.maxStorageMb)} />
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Need more capacity?</CardTitle>
                  <CardDescription>Contact your platform administrator to upgrade your license.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    If you need more users, courses, or storage space, please reach out to your SkillShots account representative to discuss upgrading your plan.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">No Active License</h2>
              <p className="text-muted-foreground">Your organization does not have an active license. Please contact your administrator.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-usage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  AI Usage Summary
                </CardTitle>
                <CardDescription>Token consumption and API calls for your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {isAiUsageLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : aiUsage ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="text-sm text-muted-foreground">Total API Requests</p>
                        <p className="text-2xl font-bold" data-testid="text-ai-requests">{aiUsage.totalRequests.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="text-sm text-muted-foreground">Total Tokens Used</p>
                        <p className="text-2xl font-bold" data-testid="text-ai-tokens">{aiUsage.totalTokens.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="text-sm text-muted-foreground">Prompt Tokens</p>
                        <p className="text-xl font-semibold">{aiUsage.totalPromptTokens.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="text-sm text-muted-foreground">Completion Tokens</p>
                        <p className="text-xl font-semibold">{aiUsage.totalCompletionTokens.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-md bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Cost</p>
                          <p className="text-2xl font-bold text-primary" data-testid="text-ai-cost">
                            ₹{aiUsage.estimatedCost.toFixed(4)}
                          </p>
                        </div>
                        <Zap className="h-8 w-8 text-primary/50" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No AI usage data available yet.</p>
                    <p className="text-sm">AI usage will appear here once your organization starts using AI features.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Feature Breakdown
                </CardTitle>
                <CardDescription>Token usage by AI feature/endpoint</CardDescription>
              </CardHeader>
              <CardContent>
                {isAiUsageLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : aiUsage?.endpointBreakdown && aiUsage.endpointBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {aiUsage.endpointBreakdown.sort((a, b) => b.tokens - a.tokens).map((ep, idx) => {
                      const percentage = aiUsage.totalTokens > 0 
                        ? (ep.tokens / aiUsage.totalTokens) * 100 
                        : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{ep.endpoint.replace('/api/', '').replace('gemini/', '')}</span>
                            <span className="text-muted-foreground">
                              {ep.requests} calls / {ep.tokens.toLocaleString()} tokens
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No endpoint breakdown available.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>Create a new user account and add them to your organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                placeholder="Enter full name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                data-testid="input-member-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="Enter email address"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                data-testid="input-member-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-password">Password</Label>
              <Input
                id="member-password"
                type="password"
                placeholder="Enter password"
                value={newMember.password}
                onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                data-testid="input-member-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Role</Label>
              <Select
                value={newMember.role}
                onValueChange={(value) => setNewMember({ ...newMember, role: value })}
              >
                <SelectTrigger data-testid="select-member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Learner">Learner</SelectItem>
                  <SelectItem value="Creator">Creator</SelectItem>
                  <SelectItem value="OrgAdmin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-department">Department</Label>
              <Input
                id="member-department"
                placeholder="e.g., Engineering, Sales, HR"
                value={newMember.department}
                onChange={(e) => setNewMember({ ...newMember, department: e.target.value })}
                data-testid="input-member-department"
              />
              <p className="text-xs text-muted-foreground">Optional - Assign this user to a department</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} data-testid="button-confirm-add-member">
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditMemberDialogOpen} onOpenChange={setIsEditMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update role for {selectedMember?.user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={selectedMember?.role}
                onValueChange={(value) => {
                  if (selectedMember) {
                    handleUpdateMemberRole(selectedMember.id, value);
                  }
                }}
              >
                <SelectTrigger data-testid="select-edit-member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Learner">Learner</SelectItem>
                  <SelectItem value="Creator">Creator</SelectItem>
                  <SelectItem value="OrgAdmin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMemberDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
