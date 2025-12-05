import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { User, Topic, Group, LeaderboardEntry, TopicStatus } from "./types";
import { INITIAL_USERS, INITIAL_TOPICS, INITIAL_GROUPS, INITIAL_CATEGORIES, MOCK_LEADERBOARD } from "./services/dataService";

import Login from "./components/Login";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import TopicSwiperView from "./components/TopicSwiperView";
import Chatbot from "./components/Chatbot";
import CreatorDashboard from "./components/CreatorDashboard";
import { MessageSquareIcon } from "./components/icons";
import { Button } from "@/components/ui/button";

const STORAGE_KEYS = {
  users: 'skillshots_users',
  topics: 'skillshots_topics',
  groups: 'skillshots_groups',
  categories: 'skillshots_categories',
  currentUser: 'skillshots_current_user',
  leaderboard: 'skillshots_leaderboard'
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function App() {
  const [users, setUsers] = useState<User[]>(() => loadFromStorage(STORAGE_KEYS.users, INITIAL_USERS));
  const [topics, setTopics] = useState<Topic[]>(() => loadFromStorage(STORAGE_KEYS.topics, INITIAL_TOPICS));
  const [groups, setGroups] = useState<Group[]>(() => loadFromStorage(STORAGE_KEYS.groups, INITIAL_GROUPS));
  const [categories, setCategories] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.categories, INITIAL_CATEGORIES));
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadFromStorage(STORAGE_KEYS.leaderboard, MOCK_LEADERBOARD));

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const userId = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (userId) {
      const storedUsers = loadFromStorage<User[]>(STORAGE_KEYS.users, INITIAL_USERS);
      return storedUsers.find(u => u.id === userId) || null;
    }
    return null;
  });

  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showCreatorDashboard, setShowCreatorDashboard] = useState(false);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.users, users);
  }, [users]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.topics, topics);
  }, [topics]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.groups, groups);
  }, [groups]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.categories, categories);
  }, [categories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.leaderboard, leaderboard);
  }, [leaderboard]);

  const handleLogin = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(STORAGE_KEYS.currentUser, userId);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    setShowCreatorDashboard(false);
  };

  const handleSelectTopic = (topic: Topic) => {
    const index = topics.findIndex(t => t.id === topic.id);
    setSelectedTopicIndex(index);
  };

  const handleMarkComplete = (topicId: string) => {
    setTopics(prev => prev.map(t => 
      t.id === topicId ? { ...t, status: TopicStatus.Completed } : t
    ));
    
    if (currentUser) {
      setLeaderboard(prev => {
        const existing = prev.find(e => e.userId === currentUser.id);
        if (existing) {
          return prev.map(e => 
            e.userId === currentUser.id 
              ? { ...e, points: e.points + 100 } 
              : e
          ).sort((a, b) => b.points - a.points).map((e, i) => ({ ...e, rank: i + 1 }));
        } else {
          const newEntry: LeaderboardEntry = {
            userId: currentUser.id,
            name: currentUser.name,
            points: 100,
            rank: prev.length + 1
          };
          return [...prev, newEntry].sort((a, b) => b.points - a.points).map((e, i) => ({ ...e, rank: i + 1 }));
        }
      });
    }
    
    setSelectedTopicIndex(null);
  };

  const handleAddTopic = (topic: Topic) => {
    setTopics(prev => [...prev, topic]);
  };

  const handleUpdateTopic = (topic: Topic) => {
    setTopics(prev => prev.map(t => t.id === topic.id ? topic : t));
  };

  const handleDeleteTopic = (id: string) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      setTopics(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleAddUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const handleUpdateUser = (user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleAddGroup = (group: Group) => {
    setGroups(prev => [...prev, group]);
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const handleAddCategory = (cat: string) => {
    if (!categories.includes(cat)) {
      setCategories(prev => [...prev, cat]);
    }
  };

  const handleDeleteCategory = (cat: string) => {
    setCategories(prev => prev.filter(c => c !== cat));
  };

  const getAccessibleTopics = (): Topic[] => {
    if (!currentUser) return [];
    return topics.filter(topic => {
      if (topic.sharedWithUsers && topic.sharedWithUsers.includes(currentUser.id)) {
        return true;
      }
      if (topic.sharedWith.some(groupId => currentUser.groupIds.includes(groupId))) {
        return true;
      }
      const allEmployeesGroup = groups.find(g => g.name === 'All Employees');
      if (allEmployeesGroup && topic.sharedWith.includes(allEmployeesGroup.id)) {
        return true;
      }
      return false;
    });
  };

  if (!currentUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Login onLogin={handleLogin} users={users} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const accessibleTopics = getAccessibleTopics();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Header 
            user={currentUser} 
            onLogout={handleLogout}
            onAdminClick={() => setShowCreatorDashboard(!showCreatorDashboard)}
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
            {showCreatorDashboard ? (
              <CreatorDashboard
                topics={topics}
                users={users}
                groups={groups}
                categories={categories}
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
            ) : (
              <Dashboard
                topics={accessibleTopics}
                categories={categories}
                onSelectTopic={handleSelectTopic}
                groups={groups}
                leaderboard={leaderboard}
                currentUser={currentUser}
              />
            )}
          </main>

          {selectedTopicIndex !== null && (
            <TopicSwiperView
              topics={accessibleTopics}
              initialTopicIndex={selectedTopicIndex}
              onClose={() => setSelectedTopicIndex(null)}
              onMarkComplete={handleMarkComplete}
              groups={groups}
            />
          )}

          <Chatbot
            isOpen={isChatbotOpen}
            onClose={() => setIsChatbotOpen(false)}
            topics={accessibleTopics}
          />

          <Button
            onClick={() => setIsChatbotOpen(!isChatbotOpen)}
            className="fixed bottom-6 right-6 rounded-full shadow-lg z-40"
            size="lg"
            data-testid="button-chatbot-toggle"
          >
            <MessageSquareIcon className="h-6 w-6 mr-2" />
            AI Assistant
          </Button>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
