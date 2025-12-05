import { useMemo, useState } from 'react';
import { Topic, TopicStatus, Group, LeaderboardEntry, User, ContentType } from '../types';
import TopicCard from './TopicCard';
import ProgressChart from './ProgressChart';
import Leaderboard from './Leaderboard';
import { SearchIcon, FilterIcon, ClipboardListIcon, BrainIcon } from './icons';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  topics: Topic[];
  categories: string[];
  onSelectTopic: (topic: Topic) => void;
  groups: Group[];
  leaderboard: LeaderboardEntry[];
  currentUser: User;
}

export default function Dashboard({ topics, categories, onSelectTopic, groups, leaderboard, currentUser }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'learning' | 'sop'>('learning');

  const { pendingTopics, completedTopics, filteredTotal } = useMemo(() => {
    const filtered = topics.filter(topic => {
      if (viewMode === 'sop' && !topic.isSop) return false;

      const lowerSearch = searchTerm.toLowerCase();
      const titleMatch = topic.title.toLowerCase().includes(lowerSearch);
      const contentMatch = topic.content.some(block =>
        block.type === ContentType.Paragraph && block.content.toLowerCase().includes(lowerSearch)
      );
      const matchesSearch = titleMatch || contentMatch;

      const matchesCategory = selectedCategory === 'All' || topic.category === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus === 'Pending') matchesStatus = topic.status === TopicStatus.Pending;
      if (selectedStatus === 'Completed') matchesStatus = topic.status === TopicStatus.Completed;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return filtered.reduce(
      (acc, topic) => {
        if (topic.status === TopicStatus.Pending) {
          acc.pendingTopics.push(topic);
        } else {
          acc.completedTopics.push(topic);
        }
        return acc;
      },
      { pendingTopics: [] as Topic[], completedTopics: [] as Topic[], filteredTotal: filtered.length }
    );
  }, [topics, searchTerm, selectedCategory, selectedStatus, viewMode]);

  const showPendingSection = selectedStatus === 'All' || selectedStatus === 'Pending';
  const showCompletedSection = selectedStatus === 'All' || selectedStatus === 'Completed';

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground" data-testid="text-dashboard-title">
              {viewMode === 'learning' ? 'Your Learning Dashboard' : 'SOP Library'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {viewMode === 'learning'
                ? 'Track your progress and climb the leaderboard!'
                : 'Access Standard Operating Procedures and Reference Guides.'}
            </p>
          </div>

          <div className="flex p-1 bg-muted rounded-lg self-start md:self-auto">
            <Button
              variant={viewMode === 'learning' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('learning')}
              className="flex items-center"
              data-testid="button-my-learning"
            >
              <BrainIcon className="h-4 w-4 mr-2" />
              My Learning
            </Button>
            <Button
              variant={viewMode === 'sop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('sop')}
              className="flex items-center"
              data-testid="button-sop-library"
            >
              <ClipboardListIcon className="h-4 w-4 mr-2" />
              SOP Library
            </Button>
          </div>
        </div>

        <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder={viewMode === 'learning' ? "Search courses & content..." : "Search SOPs & procedures..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <div className="flex w-full md:w-auto gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="border-none bg-transparent h-auto p-0 min-w-[120px]" data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
              <div className={`h-2 w-2 rounded-full ${selectedStatus === 'All' ? 'bg-muted-foreground' : selectedStatus === 'Completed' ? 'bg-chart-2' : 'bg-chart-4'}`}></div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="border-none bg-transparent h-auto p-0 min-w-[100px]" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          {showPendingSection && (
            <Card className={`p-6 border-l-4 ${viewMode === 'sop' ? 'border-l-chart-3' : 'border-l-primary'}`}>
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                <span className={`${viewMode === 'sop' ? 'bg-chart-3/10 text-chart-3' : 'bg-primary/10 text-primary'} py-1 px-3 rounded-full text-sm font-extrabold`} data-testid="text-pending-count">{pendingTopics.length}</span>
                {viewMode === 'sop' ? 'Available SOPs' : 'Pending Courses'}
              </h3>
              {pendingTopics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingTopics.map(topic => (
                    <TopicCard key={topic.id} topic={topic} onSelect={onSelectTopic} groups={groups} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No items found matching your criteria.</p>
              )}
            </Card>
          )}

          {showCompletedSection && (
            <Card className="p-6 border-l-4 border-l-chart-2">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                <span className="bg-chart-2/10 text-chart-2 py-1 px-3 rounded-full text-sm font-extrabold" data-testid="text-completed-count">{completedTopics.length}</span>
                {viewMode === 'sop' ? 'Read SOPs' : 'Completed Courses'}
              </h3>
              {completedTopics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {completedTopics.map(topic => (
                    <TopicCard key={topic.id} topic={topic} onSelect={onSelectTopic} groups={groups} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No items found matching your criteria.</p>
              )}
            </Card>
          )}

          {filteredTotal === 0 && (
            <Card className="text-center py-12 border-dashed">
              <SearchIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-lg">No content matches your search.</p>
              <Button
                variant="link"
                onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedStatus('All'); }}
                className="mt-4"
                data-testid="button-clear-filters"
              >
                Clear all filters
              </Button>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Progress Overview</h3>
            <ProgressChart completed={completedTopics.length} pending={pendingTopics.length} />
          </Card>

          {viewMode === 'learning' && (
            <Leaderboard entries={leaderboard} currentUserId={currentUser.id} />
          )}

          {viewMode === 'sop' && (
            <Card className="p-6 bg-chart-3/5 border-chart-3/20">
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <ClipboardListIcon className="h-5 w-5" />
                SOP Quick Access
              </h3>
              <p className="text-sm text-muted-foreground">Standard Operating Procedures are critical for compliance and safety. Ensure you have read all SOPs relevant to your department.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
