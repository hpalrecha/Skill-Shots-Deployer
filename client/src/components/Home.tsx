import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Topic, User, LeaderboardEntry, TopicStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ClipboardList, Trophy, TrendingUp, ChevronRight, Target, Award } from 'lucide-react';
import Leaderboard from './Leaderboard';
import CompletedCoursesBadges from './CompletedCoursesBadges';

interface HomeProps {
  topics: Topic[];
  currentUser: User;
  leaderboard: LeaderboardEntry[];
}

export default function Home({ topics, currentUser, leaderboard }: HomeProps) {
  const [, setLocation] = useLocation();
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await fetch('/api/my-organization', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.currentOrganization?.name) {
            setOrganizationName(data.currentOrganization.name);
          }
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
      }
    };
    fetchOrganization();
  }, []);

  const courses = topics.filter(t => !t.isSop);
  const sops = topics.filter(t => t.isSop);
  
  const completedCourses = courses.filter(t => t.status === TopicStatus.Completed).length;
  const completedSops = sops.filter(t => t.status === TopicStatus.Completed).length;
  
  const totalProgress = topics.length > 0 
    ? Math.round((topics.filter(t => t.status === TopicStatus.Completed).length / topics.length) * 100) 
    : 0;

  const userRank = leaderboard.find(l => l.name === currentUser.name)?.rank || '-';
  const userPoints = leaderboard.find(l => l.name === currentUser.name)?.points || 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-1 sm:gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-welcome">
          Welcome back, {currentUser.name}!
        </h1>
        {organizationName && (
          <p className="text-sm font-medium text-primary" data-testid="text-org-name">
            {organizationName}
          </p>
        )}
        <p className="text-sm sm:text-base text-muted-foreground">
          Continue your learning journey and stay ahead of the curve.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Courses Available</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-courses">{courses.length}</div>
            <p className="text-xs text-muted-foreground">{completedCourses} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SOPs Available</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-sops">{sops.length}</div>
            <p className="text-xs text-muted-foreground">{completedSops} reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Your Rank</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-rank">#{userRank}</div>
            <p className="text-xs text-muted-foreground">{userPoints} points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-progress">{totalProgress}%</div>
            <Progress value={totalProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Quick Access</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card className="hover-elevate cursor-pointer" onClick={() => setLocation('/courses')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Training Courses</CardTitle>
                <CardDescription>
                  Browse and complete your assigned training courses to build new skills.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>{courses.length - completedCourses} courses remaining</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => setLocation('/sops')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">SOP Library</CardTitle>
                <CardDescription>
                  Access Standard Operating Procedures and reference guides.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="h-4 w-4" />
                  <span>{sops.length} procedures available</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {courses.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">Continue Learning</h2>
                <Button variant="ghost" size="sm" onClick={() => setLocation('/courses')}>
                  View all
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {courses.filter(c => c.status !== TopicStatus.Completed).slice(0, 3).map(course => (
                  <Card 
                    key={course.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/topic/${course.id}`)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                        <img 
                          src={course.imageUrl} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.category} - {course.readTime} min</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <CompletedCoursesBadges />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Leaderboard</h2>
          <Leaderboard entries={leaderboard} currentUserId={currentUser.id} />
        </div>
      </div>
    </div>
  );
}
