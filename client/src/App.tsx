import { useState, useEffect, useCallback } from "react";
import { Route, Switch, useLocation, useRoute, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { User, Topic, Group, LeaderboardEntry, TopicStatus } from "./types";

import Login from "./components/Login";
import Header from "./components/Header";
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
    setIsLoadingData(true);
    try {
      const [topicsRes, groupsRes, categoriesRes, leaderboardRes, usersRes] = await Promise.all([
        fetch('/api/topics', { credentials: 'include' }),
        fetch('/api/groups', { credentials: 'include' }),
        fetch('/api/categories', { credentials: 'include' }),
        fetch('/api/leaderboard', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' }),
      ]);

      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData.map((t: any) => ({
          ...t,
          status: TopicStatus.Pending,
          sharedWith: t.sharedWith || [],
          sharedWithUsers: t.sharedWithUsers || [],
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
  }, []);

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
    
    if (currentUser.role === 'Creator' || currentUser.role === 'Admin') {
      return topics;
    }
    
    return topics.filter(topic => {
      if (topic.sharedWithUsers && topic.sharedWithUsers.includes(currentUser.id)) {
        return true;
      }
      if (topic.sharedWith && topic.sharedWith.some(groupId => currentUser.groupIds.includes(groupId))) {
        return true;
      }
      const allEmployeesGroup = groups.find(g => g.name === 'All Employees');
      if (allEmployeesGroup && topic.sharedWith && topic.sharedWith.includes(allEmployeesGroup.id)) {
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
          <Login onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const accessibleTopics = getAccessibleTopics();

  // Determine current route context
  const isAdminRoute = location === '/admin';
  const isCreatorRoute = location === '/creatorstudio';
  const isSuperAdminRoute = location === '/superadmin';
  const isAdminOrCreatorRoute = isAdminRoute || isCreatorRoute;

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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Header 
            user={currentUser} 
            onLogout={handleLogout}
            currentRoute={location}
          />

          <Switch>
            {/* Topic Swiper View - Full screen overlay */}
            <Route path="/topic/:id">
              <TopicViewRoute />
            </Route>

            {/* SuperAdmin Dashboard - SuperAdmin only */}
            <Route path="/superadmin">
              {canAccessSuperAdmin ? (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <SuperAdminDashboard currentUser={currentUser} />
                </main>
              ) : (
                <Redirect to="/" />
              )}
            </Route>

            {/* Organization Admin Dashboard - OrgAdmin only */}
            <Route path="/orgadmin">
              {canAccessOrgAdmin ? (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <OrgAdminDashboard currentUser={currentUser} />
                </main>
              ) : (
                <Redirect to="/" />
              )}
            </Route>

            {/* Admin Portal - Admin only */}
            <Route path="/admin">
              {canAccessAdmin ? (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
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
                </main>
              ) : (
                <Redirect to="/" />
              )}
            </Route>

            {/* Creator Studio - Creator and Admin */}
            <Route path="/creatorstudio">
              {canAccessCreator ? (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
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
                </main>
              ) : (
                <Redirect to="/" />
              )}
            </Route>

            {/* Courses - Only courses (non-SOPs) */}
            <Route path="/courses">
              <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
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
              </main>
            </Route>

            {/* SOPs - Only SOPs */}
            <Route path="/sops">
              <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
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
              </main>
            </Route>

            {/* Home - Default route for all users */}
            <Route path="/">
              <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
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
              </main>
            </Route>
          </Switch>
        </div>

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
