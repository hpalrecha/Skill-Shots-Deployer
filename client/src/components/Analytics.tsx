import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Flame, Trophy, Target, TrendingUp, BookOpen, Clock } from 'lucide-react';

interface AnalyticsData {
  currentStreak: number;
  longestStreak: number;
  totalTopicsCompleted: number;
  totalQuizzesPassed: number;
  averageQuizScore: number;
  weeklyProgress: { day: string; completed: number }[];
  categoryProgress: { category: string; completed: number; total: number }[];
  recentQuizzes: { score: number; total: number; percentage: number; date: string | null }[];
}

interface AnalyticsProps {
  userId: string;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function Analytics({ userId }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/analytics/${userId}`);
        if (response.ok) {
          const analyticsData = await response.json();
          setData(analyticsData);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalytics();
  }, [userId]);

  useEffect(() => {
    async function recordActivity() {
      try {
        await fetch('/api/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } catch (error) {
        console.error('Failed to record activity:', error);
      }
    }
    
    recordActivity();
  }, [userId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Unable to load analytics data.</p>
      </Card>
    );
  }

  const categoryChartData = data.categoryProgress.map((cat) => ({
    name: cat.category.length > 12 ? cat.category.substring(0, 12) + '...' : cat.category,
    completed: cat.completed,
    remaining: cat.total - cat.completed,
    total: cat.total,
  }));

  return (
    <div className="space-y-6" data-testid="analytics-container">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg flex-shrink-0">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground truncate">Current Streak</p>
              <p className="text-xl md:text-2xl font-bold" data-testid="text-current-streak">{data.currentStreak} days</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-950 rounded-lg flex-shrink-0">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground truncate">Longest Streak</p>
              <p className="text-xl md:text-2xl font-bold" data-testid="text-longest-streak">{data.longestStreak} days</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg flex-shrink-0">
              <BookOpen className="h-5 w-5 text-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground truncate">Topics Completed</p>
              <p className="text-xl md:text-2xl font-bold" data-testid="text-topics-completed">{data.totalTopicsCompleted}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg flex-shrink-0">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground truncate">Avg Quiz Score</p>
              <p className="text-xl md:text-2xl font-bold" data-testid="text-avg-score">{data.averageQuizScore}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Weekly Activity</span>
          </h3>
          <div className="w-full h-48 md:h-52">
            <ResponsiveContainer>
              <BarChart data={data.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Progress by Category</span>
          </h3>
          {categoryChartData.length > 0 ? (
            <div className="w-full h-48 md:h-52">
              <ResponsiveContainer>
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value, name) => [value, name === 'completed' ? 'Completed' : 'Remaining']}
                  />
                  <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="remaining" stackId="a" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No category data available</p>
          )}
        </Card>
      </div>

      {data.recentQuizzes.length > 0 && (
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Recent Quiz Performance</span>
          </h3>
          <div className="w-full h-48 md:h-52">
            <ResponsiveContainer>
              <LineChart data={data.recentQuizzes}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  tick={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value}%`, 'Score']}
                />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
