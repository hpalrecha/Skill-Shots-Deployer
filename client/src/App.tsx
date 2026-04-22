import { useState, useEffect, useCallback } from "react";
import { Route, Switch, useLocation, useRoute, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { User, Topic, Group, LeaderboardEntry, TopicStatus } from "./types";

import Login from "./components/Login";
import LandingPage from "./pages/LandingPage";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import { AppSidebar } from "./components/AppSidebar";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard";
import TopicSwiperView from "./components/TopicSwiperView";
import Chatbot from "./components/Chatbot";
import CreatorDashboard from "./components/CreatorDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import OrgAdminDashboard from "./components/OrgAdminDashboard";
import { MessageSquareIcon } from "./components/icons";
import { Button } from "@/components/ui/button";

function App() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingData(true);
    try {
      const [topicsRes, groupsRes, categoriesRes, leaderboardRes, usersRes, progressRes, completionsRes] = await Promise.all([
        fetch('/api/topics', { credentials: 'include' }),
        fetch('/api/groups', { credentials: 'include' }),
        fetch('/api/categories', { credentials: 'include' }),
        fetch('/api/leaderboard', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' }),
        fetch(`/api/progress/${currentUser.id}`, { credentials: 'include' }),
        fetch('/api/course-completions/user', { credentials: 'include' }),
      ]);

      const progressMap: Record<string, string> = {};
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        if (Array.isArray(progressData)) {
          progressData.forEach((p: any) => {
            if (p.topicId && p.status) {
              progressMap[p.topicId] = p.status;
            }
          });
        }
      }
      if (completionsRes.ok) {
        const completionsData = await completionsRes.json();
        if (Array.isArray(completionsData)) {
          completionsData.forEach((c: any) => {
            if (c.topicId) {
              progressMap[c.topicId] = 'Completed';
            }
          });
        }
      }

      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData.map((t: any) => ({
          ...t,
          status: progressMap[t.id] === 'Completed' ? TopicStatus.Completed : TopicStatus.Pending,
          sharedWith: t.sharedWith || [],
          sharedWithUsers: t.sharedWithUsers || [],
          sharedWithDepartments: t.sharedWithDepartments || [],
        })));
      }
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
      }
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            groupIds: userData.groupIds || [],
            department: userData.department || undefined,
            organizationId: userData.organizationId || undefined,
          });
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    
    // Role-based redirect after login
    switch (user.role) {
      case 'SuperAdmin':
        setLocation('/superadmin/organizations');
        break;
      case 'OrgAdmin':
        setLocation('/orgadmin');
        break;
      case 'Creator':
        setLocation('/creatorstudio');
        break;
      case 'Learner':
      default:
        setLocation('/');
        break;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setTopics([]);
    setGroups([]);
    setCategories([]);
    setLeaderboard([]);
    setUsers([]);
    setLocation('/');
  };

  const handleSelectTopic = (topic: Topic) => {
    setLocation(`/topic/${topic.id}`);
  };

  const handleMarkComplete = async (topicId: string) => {
    if (!currentUser) return;
    
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          topicId,
          status: 'Completed',
          quizScore: 10,
          quizTotal: 10,
        }),
      });

      await fetch('/api/analytics/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: currentUser.id }),
      });

      setTopics(prev => prev.map(t => 
        t.id === topicId ? { ...t, status: TopicStatus.Completed } : t
      ));

      const leaderboardRes = await fetch('/api/leaderboard', { credentials: 'include' });
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData);
      }
    } catch (err) {
      console.error('Error marking complete:', err);
    }
    
    setLocation('/');
  };

  const handleAddTopic = async (topic: Topic) => {
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: topic.title,
          category: topic.category,
          authorId: topic.authorId,
          readTime: topic.readTime,
          content: topic.content,
          modules: topic.modules || [],
          imageUrl: topic.imageUrl,
          sharedWith: topic.sharedWith,
          sharedWithUsers: topic.sharedWithUsers,
          sharedWithDepartments: topic.sharedWithDepartments,
          isSop: topic.isSop,
        }),
      });
      
      if (response.ok) {
        const newTopic = await response.json();
        setTopics(prev => [...prev, { ...newTopic, status: TopicStatus.Pending }]);
      }
    } catch (err) {
      console.error('Error adding topic:', err);
    }
  };

  const handleUpdateTopic = async (topic: Topic) => {
    try {
      const response = await fetch(`/api/topics/${topic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: topic.title,
          category: topic.category,
          readTime: topic.readTime,
          content: topic.content,
          modules: topic.modules || [],
          imageUrl: topic.imageUrl,
          sharedWith: topic.sharedWith,
          sharedWithUsers: topic.sharedWithUsers,
          sharedWithDepartments: topic.sharedWithDepartments,
          isSop: topic.isSop,
        }),
      });
      
      if (response.ok) {
        const updatedTopic = await response.json();
        setTopics(prev => prev.map(t => t.id === topic.id ? { ...updatedTopic, status: t.status } : t));
      }
    } catch (err) {
      console.error('Error updating topic:', err);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;
    
    try {
      const response = await fetch(`/api/topics/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        setTopics(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting topic:', err);
    }
  };

  const handleAddUser = async (user: User) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password || 'password123',
          role: user.role,
          groupIds: user.groupIds,
        }),
      });
      
      if (response.ok) {
        const newUser = await response.json();
        setUsers(prev => [...prev, newUser]);
      }
    } catch (err) {
      console.error('Error adding user:', err);
    }
  };

  const handleUpdateUser = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          groupIds: user.groupIds,
        }),
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      }
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handleAddGroup = async (group: Group) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: group.name }),
      });
      
      if (response.ok) {
        const newGroup = await response.json();
        setGroups(prev => [...prev, newGroup]);
      }
    } catch (err) {
      console.error('Error adding group:', err);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        setGroups(prev => prev.filter(g => g.id !== id));
      }
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  const handleAddCategory = async (cat: string) => {
    if (categories.includes(cat)) return;
    
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: cat }),
      });
      
      if (response.ok) {
        setCategories(prev => [...prev, cat]);
      }
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    try {
      const response = await fetch(`/api/categories/${encodeURIComponent(cat)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        setCategories(prev => prev.filter(c => c !== cat));
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const getAccessibleTopics = (): Topic[] => {
    if (!currentUser) return [];
    
    // SuperAdmin, OrgAdmin, Admin, and Creator can see all topics
    if (currentUser.role === 'SuperAdmin' || currentUser.role === 'OrgAdmin' || currentUser.role === 'Creator' || currentUser.role === 'Admin') {
      return topics;
    }
    
    return topics.filter(topic => {
      // Always show completed topics
      if (topic.status === TopicStatus.Completed) {
        return true;
      }
      // Shared directly with this user
      if (topic.sharedWithUsers && topic.sharedWithUsers.includes(currentUser.id)) {
        return true;
      }
      // Shared with user's department
      if (topic.sharedWithDepartments && topic.sharedWithDepartments.length > 0 && currentUser.department) {
        if (topic.sharedWithDepartments.includes(currentUser.department)) {
          return true;
        }
      }
      // Shared with a group the user belongs to
      if (topic.sharedWith && topic.sharedWith.length > 0) {
        if (topic.sharedWith.some(groupId => currentUser.groupIds.includes(groupId))) {
          return true;
        }
        // "All Employees" group — visible regardless of individual membership
        const allEmployeesGroup = groups.find(g => g.name === 'All Employees');
        if (allEmployeesGroup && topic.sharedWith.includes(allEmployeesGroup.id)) {
          return true;
        }
        // Has explicit group restrictions but user doesn't match — hide
        return false;
      }
      // No sharing restrictions set at all = visible to all org members
      if (
        (!topic.sharedWith || topic.sharedWith.length === 0) &&
        (!topic.sharedWithUsers || topic.sharedWithUsers.length === 0) &&
        (!topic.sharedWithDepartments || topic.sharedWithDepartments.length === 0)
      ) {
        return true;
      }
      return false;
    });
  };

  if (isCheckingAuth) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (!currentUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/login">
              <Login onLogin={handleLogin} />
            </Route>
            <Route path="/forgot-password">
              <ForgotPassword />
            </Route>
            <Route path="/reset-password">
              <ResetPassword />
            </Route>
            <Route path="/">
              <LandingPage />
            </Route>
            <Route>
              <Redirect to="/" />
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const accessibleTopics = getAccessibleTopics();

  // Role-based route access
  const canAccessSuperAdmin = currentUser.role === 'SuperAdmin';
  const canAccessOrgAdmin = currentUser.role === 'OrgAdmin';
  const canAccessAdmin = currentUser.role === 'Admin' || currentUser.role === 'OrgAdmin';
  const canAccessCreator = currentUser.role === 'Creator' || currentUser.role === 'Admin' || currentUser.role === 'OrgAdmin';

  // Topic view wrapper component
  const TopicViewRoute = () => {
    const [, params] = useRoute('/topic/:id');
    const topicId = params?.id;
    
    if (!topicId) {
      return <Redirect to="/" />;
    }
    
    const topicIndex = accessibleTopics.findIndex(t => t.id === topicId);
    
    if (topicIndex === -1) {
      return <Redirect to="/" />;
    }
    
    return (
      <TopicSwiperView
        topics={accessibleTopics}
        initialTopicIndex={topicIndex}
        onClose={() => setLocation('/')}
        onMarkComplete={handleMarkComplete}
        groups={groups}
      />
    );
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full bg-background">
            <AppSidebar user={currentUser} onLogout={handleLogout} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center gap-2 p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
              </header>
              <main className="flex-1 overflow-auto">

          <Switch>
            {/* Topic Swiper View - Full screen overlay */}
            <Route path="/topic/:id">
              <TopicViewRoute />
            </Route>

            {/* SuperAdmin Dashboard - SuperAdmin only */}
            <Route path="/superadmin/approvals">
              {canAccessSuperAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <SuperAdminDashboard currentUser={currentUser} section="approvals" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/superadmin/organizations">
              {canAccessSuperAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <SuperAdminDashboard currentUser={currentUser} section="organizations" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/superadmin/plans">
              {canAccessSuperAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <SuperAdminDashboard currentUser={currentUser} section="plans" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/superadmin/ai-usage">
              {canAccessSuperAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <SuperAdminDashboard currentUser={currentUser} section="ai-usage" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/superadmin/ai-settings">
              {canAccessSuperAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <SuperAdminDashboard currentUser={currentUser} section="ai-settings" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/superadmin">
              {canAccessSuperAdmin ? (
                <Redirect to="/superadmin/organizations" />
              ) : (
                <Redirect to="/" />
              )}
            </Route>

            {/* Organization Admin Dashboard - OrgAdmin only */}
            <Route path="/orgadmin/overview">
              {canAccessOrgAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <OrgAdminDashboard currentUser={currentUser} section="overview" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/orgadmin/members">
              {canAccessOrgAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <OrgAdminDashboard currentUser={currentUser} section="members" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/orgadmin/license">
              {canAccessOrgAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <OrgAdminDashboard currentUser={currentUser} section="license" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/orgadmin/ai-usage">
              {canAccessOrgAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <OrgAdminDashboard currentUser={currentUser} section="ai-usage" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/orgadmin/ai-settings">
              {canAccessOrgAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <OrgAdminDashboard currentUser={currentUser} section="ai-settings" />
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/orgadmin">
              {canAccessOrgAdmin ? (
                <Redirect to="/orgadmin/overview" />
              ) : (
                <Redirect to="/" />
              )}
            </Route>

            {/* Admin Portal - Admin only */}
            <Route path="/admin/courses">
              {canAccessAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading content...</p>
                      </div>
                    </div>
                  ) : (
                    <CreatorDashboard
                      topics={topics}
                      users={users}
                      groups={groups}
                      categories={categories}
                      currentUser={currentUser}
                      section="courses"
                      onAddTopic={handleAddTopic}
                      onUpdateTopic={handleUpdateTopic}
                      onDeleteTopic={handleDeleteTopic}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                      onAddGroup={handleAddGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  )}
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/admin/users">
              {canAccessAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading content...</p>
                      </div>
                    </div>
                  ) : (
                    <CreatorDashboard
                      topics={topics}
                      users={users}
                      groups={groups}
                      categories={categories}
                      currentUser={currentUser}
                      section="users"
                      onAddTopic={handleAddTopic}
                      onUpdateTopic={handleUpdateTopic}
                      onDeleteTopic={handleDeleteTopic}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                      onAddGroup={handleAddGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  )}
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/admin/settings">
              {canAccessAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading content...</p>
                      </div>
                    </div>
                  ) : (
                    <CreatorDashboard
                      topics={topics}
                      users={users}
                      groups={groups}
                      categories={categories}
                      currentUser={currentUser}
                      section="settings"
                      onAddTopic={handleAddTopic}
                      onUpdateTopic={handleUpdateTopic}
                      onDeleteTopic={handleDeleteTopic}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                      onAddGroup={handleAddGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  )}
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/admin/analytics">
              {canAccessAdmin ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading content...</p>
                      </div>
                    </div>
                  ) : (
                    <CreatorDashboard
                      topics={topics}
                      users={users}
                      groups={groups}
                      categories={categories}
                      currentUser={currentUser}
                      section="analytics"
                      onAddTopic={handleAddTopic}
                      onUpdateTopic={handleUpdateTopic}
                      onDeleteTopic={handleDeleteTopic}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                      onAddGroup={handleAddGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  )}
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/admin">
              {canAccessAdmin ? (
                <Redirect to="/admin/courses" />
              ) : (
                <Redirect to="/" />
              )}
            </Route>

            {/* Creator Studio - Creator and Admin */}
            <Route path="/creatorstudio">
              {canAccessCreator ? (
                <Redirect to="/creatorstudio/courses" />
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/creatorstudio/courses">
              {canAccessCreator ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading content...</p>
                      </div>
                    </div>
                  ) : (
                    <CreatorDashboard
                      topics={topics}
                      users={users}
                      groups={groups}
                      categories={categories}
                      currentUser={currentUser}
                      section="courses"
                      onAddTopic={handleAddTopic}
                      onUpdateTopic={handleUpdateTopic}
                      onDeleteTopic={handleDeleteTopic}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                      onAddGroup={handleAddGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  )}
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/creatorstudio/users">
              {canAccessCreator ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading content...</p>
                      </div>
                    </div>
                  ) : (
                    <CreatorDashboard
                      topics={topics}
                      users={users}
                      groups={groups}
                      categories={categories}
                      currentUser={currentUser}
                      section="users"
                      onAddTopic={handleAddTopic}
                      onUpdateTopic={handleUpdateTopic}
                      onDeleteTopic={handleDeleteTopic}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                      onAddGroup={handleAddGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  )}
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/creatorstudio/settings">
              {canAccessCreator ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading content...</p>
                      </div>
                    </div>
                  ) : (
                    <CreatorDashboard
                      topics={topics}
                      users={users}
                      groups={groups}
                      categories={categories}
                      currentUser={currentUser}
                      section="settings"
                      onAddTopic={handleAddTopic}
                      onUpdateTopic={handleUpdateTopic}
                      onDeleteTopic={handleDeleteTopic}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                      onAddGroup={handleAddGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  )}
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>
            <Route path="/creatorstudio/analytics">
              {canAccessCreator ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading content...</p>
                      </div>
                    </div>
                  ) : (
                    <CreatorDashboard
                      topics={topics}
                      users={users}
                      groups={groups}
                      categories={categories}
                      currentUser={currentUser}
                      section="analytics"
                      onAddTopic={handleAddTopic}
                      onUpdateTopic={handleUpdateTopic}
                      onDeleteTopic={handleDeleteTopic}
                      onAddUser={handleAddUser}
                      onUpdateUser={handleUpdateUser}
                      onDeleteUser={handleDeleteUser}
                      onAddGroup={handleAddGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  )}
                </div>
              ) : (
                <Redirect to="/" />
              )}
            </Route>

            {/* Courses - Only courses (non-SOPs) */}
            <Route path="/courses">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading content...</p>
                    </div>
                  </div>
                ) : (
                  <Dashboard
                    topics={accessibleTopics}
                    categories={categories}
                    onSelectTopic={handleSelectTopic}
                    groups={groups}
                    leaderboard={leaderboard}
                    currentUser={currentUser}
                    initialMode="learning"
                    lockMode={true}
                  />
                )}
              </div>
            </Route>

            {/* SOPs - Only SOPs */}
            <Route path="/sops">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading content...</p>
                    </div>
                  </div>
                ) : (
                  <Dashboard
                    topics={accessibleTopics}
                    categories={categories}
                    onSelectTopic={handleSelectTopic}
                    groups={groups}
                    leaderboard={leaderboard}
                    currentUser={currentUser}
                    initialMode="sop"
                    lockMode={true}
                  />
                )}
              </div>
            </Route>

            {/* Home - Default route for all users */}
            <Route path="/">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading content...</p>
                    </div>
                  </div>
                ) : (
                  <Home
                    topics={accessibleTopics}
                    currentUser={currentUser}
                    leaderboard={leaderboard}
                  />
                )}
              </div>
            </Route>
                </Switch>
              </main>
            </div>
          </div>
        </SidebarProvider>

        <Chatbot
          isOpen={isChatbotOpen}
          onClose={() => setIsChatbotOpen(false)}
          topics={accessibleTopics}
        />

        <Button
          onClick={() => setIsChatbotOpen(!isChatbotOpen)}
          style={{ position: 'fixed', bottom: '24px', right: '24px' }}
          className="rounded-full shadow-lg z-[9999]"
          size="lg"
          data-testid="button-chatbot-toggle"
        >
          <MessageSquareIcon className="h-6 w-6 mr-2" />
          AI Assistant
        </Button>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
