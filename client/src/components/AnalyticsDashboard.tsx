import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Award, 
  Activity,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { LoaderIcon } from './icons';

interface AnalyticsOverview {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  averageCompletionRate: number;
  averageQuizScore: number;
  activeUsersLast7Days: number;
}

interface CourseAnalytics {
  topicId: string;
  topicTitle: string;
  enrolledUsers: number;
  completedUsers: number;
  inProgressUsers: number;
  completionRate: number;
  averageQuizScore: number;
  moduleCount: number;
}

interface UserAnalytics {
  userId: string;
  userName: string;
  userEmail: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  averageQuizScore: number;
  lastActiveDate: string | null;
}

interface CourseUserProgress {
  userId: string;
  userName: string;
  userEmail: string;
  modulesCompleted: number;
  totalModules: number;
  lastQuizScore: number | null;
  status: string;
  lastActivityDate: string | null;
}

interface UserCourseProgress {
  topicId: string;
  topicTitle: string;
  modulesCompleted: number;
  totalModules: number;
  averageQuizScore: number;
  status: string;
  lastActivityDate: string | null;
}

interface BadgeAnalytics {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  topicId: string;
  topicTitle: string;
  averageScore: number;
  totalModules: number;
  completedAt: string;
}

export default function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([]);
  const [badgeAnalytics, setBadgeAnalytics] = useState<BadgeAnalytics[]>([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'users' | 'badges'>('courses');
  
  const [selectedCourse, setSelectedCourse] = useState<CourseAnalytics | null>(null);
  const [courseUsers, setCourseUsers] = useState<CourseUserProgress[]>([]);
  const [isLoadingCourseUsers, setIsLoadingCourseUsers] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null);
  const [userCourses, setUserCourses] = useState<UserCourseProgress[]>([]);
  const [isLoadingUserCourses, setIsLoadingUserCourses] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [overviewRes, coursesRes, usersRes, badgesRes] = await Promise.all([
        fetch('/api/admin/analytics/overview'),
        fetch('/api/admin/analytics/courses'),
        fetch('/api/admin/analytics/users'),
        fetch('/api/admin/analytics/badges'),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (coursesRes.ok) setCourseAnalytics(await coursesRes.json());
      if (usersRes.ok) setUserAnalytics(await usersRes.json());
      if (badgesRes.ok) setBadgeAnalytics(await badgesRes.json());
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseUsers = async (course: CourseAnalytics) => {
    setSelectedCourse(course);
    setIsLoadingCourseUsers(true);
    try {
      const res = await fetch(`/api/admin/analytics/courses/${course.topicId}/users`);
      if (res.ok) {
        setCourseUsers(await res.json());
      }
    } catch (error) {
      console.error('Failed to load course users:', error);
    } finally {
      setIsLoadingCourseUsers(false);
    }
  };

  const loadUserCourses = async (user: UserAnalytics) => {
    setSelectedUser(user);
    setIsLoadingUserCourses(true);
    try {
      const res = await fetch(`/api/admin/analytics/users/${user.userId}/courses`);
      if (res.ok) {
        setUserCourses(await res.json());
      }
    } catch (error) {
      console.error('Failed to load user courses:', error);
    } finally {
      setIsLoadingUserCourses(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case 'In Progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4" data-testid="stat-total-users">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overview?.totalUsers || 0}</p>
              <p className="text-xs text-muted-foreground">Total Learners</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4" data-testid="stat-total-courses">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overview?.totalCourses || 0}</p>
              <p className="text-xs text-muted-foreground">Total Courses</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4" data-testid="stat-enrollments">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overview?.totalEnrollments || 0}</p>
              <p className="text-xs text-muted-foreground">Enrollments</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4" data-testid="stat-completion-rate">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overview?.averageCompletionRate || 0}%</p>
              <p className="text-xs text-muted-foreground">Avg Completion</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4" data-testid="stat-quiz-score">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900">
              <Award className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overview?.averageQuizScore || 0}%</p>
              <p className="text-xs text-muted-foreground">Avg Quiz Score</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4" data-testid="stat-active-users">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900">
              <Activity className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overview?.activeUsersLast7Days || 0}</p>
              <p className="text-xs text-muted-foreground">Active (7 days)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant="ghost"
          className={`rounded-none border-b-2 ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent'}`}
          onClick={() => setActiveTab('courses')}
          data-testid="tab-courses"
        >
          Course Analytics
        </Button>
        <Button
          variant="ghost"
          className={`rounded-none border-b-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent'}`}
          onClick={() => setActiveTab('users')}
          data-testid="tab-users"
        >
          User Analytics
        </Button>
        <Button
          variant="ghost"
          className={`rounded-none border-b-2 ${activeTab === 'badges' ? 'border-primary text-primary' : 'border-transparent'}`}
          onClick={() => setActiveTab('badges')}
          data-testid="tab-badges"
        >
          Badges Earned ({badgeAnalytics.length})
        </Button>
      </div>

      {/* Course Analytics Table */}
      {activeTab === 'courses' && (
        <Card className="p-0 overflow-hidden" data-testid="courses-analytics-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-center">Modules</TableHead>
                <TableHead className="text-center">Enrolled</TableHead>
                <TableHead className="text-center">Completed</TableHead>
                <TableHead className="text-center">In Progress</TableHead>
                <TableHead className="text-center">Completion Rate</TableHead>
                <TableHead className="text-center">Avg Quiz Score</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseAnalytics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No course data available yet
                  </TableCell>
                </TableRow>
              ) : (
                courseAnalytics.map((course) => (
                  <TableRow key={course.topicId} data-testid={`course-row-${course.topicId}`}>
                    <TableCell className="font-medium">{course.topicTitle}</TableCell>
                    <TableCell className="text-center">{course.moduleCount}</TableCell>
                    <TableCell className="text-center">{course.enrolledUsers}</TableCell>
                    <TableCell className="text-center text-green-600">{course.completedUsers}</TableCell>
                    <TableCell className="text-center text-blue-600">{course.inProgressUsers}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={course.completionRate} className="w-16 h-2" />
                        <span className="text-sm">{course.completionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{course.averageQuizScore}%</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => loadCourseUsers(course)}
                        data-testid={`view-course-users-${course.topicId}`}
                      >
                        View Users <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* User Analytics Table */}
      {activeTab === 'users' && (
        <Card className="p-0 overflow-hidden" data-testid="users-analytics-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Courses Enrolled</TableHead>
                <TableHead className="text-center">Courses Completed</TableHead>
                <TableHead className="text-center">Avg Quiz Score</TableHead>
                <TableHead className="text-center">Last Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userAnalytics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No user data available yet
                  </TableCell>
                </TableRow>
              ) : (
                userAnalytics.map((user) => (
                  <TableRow key={user.userId} data-testid={`user-row-${user.userId}`}>
                    <TableCell className="font-medium">{user.userName}</TableCell>
                    <TableCell className="text-muted-foreground">{user.userEmail}</TableCell>
                    <TableCell className="text-center">{user.coursesEnrolled}</TableCell>
                    <TableCell className="text-center text-green-600">{user.coursesCompleted}</TableCell>
                    <TableCell className="text-center">{user.averageQuizScore}%</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(user.lastActiveDate)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => loadUserCourses(user)}
                        data-testid={`view-user-courses-${user.userId}`}
                      >
                        View Courses <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Badges Analytics Table */}
      {activeTab === 'badges' && (
        <Card className="p-0 overflow-hidden" data-testid="badges-analytics-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Course Completed</TableHead>
                <TableHead className="text-center">Modules</TableHead>
                <TableHead className="text-center">Average Score</TableHead>
                <TableHead className="text-center">Earned On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {badgeAnalytics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No badges earned yet
                  </TableCell>
                </TableRow>
              ) : (
                badgeAnalytics.map((badge) => (
                  <TableRow key={badge.id} data-testid={`badge-row-${badge.id}`}>
                    <TableCell className="font-medium">{badge.userName}</TableCell>
                    <TableCell className="text-muted-foreground">{badge.userEmail}</TableCell>
                    <TableCell className="font-medium">{badge.topicTitle}</TableCell>
                    <TableCell className="text-center">{badge.totalModules}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {badge.averageScore}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(badge.completedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Course Users Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSelectedCourse(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Users enrolled in: {selectedCourse?.topicTitle}
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingCourseUsers ? (
            <div className="flex items-center justify-center py-8">
              <LoaderIcon className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Last Quiz Score</TableHead>
                  <TableHead className="text-center">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users have started this course yet
                    </TableCell>
                  </TableRow>
                ) : (
                  courseUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.userName}</TableCell>
                      <TableCell className="text-muted-foreground">{user.userEmail}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress 
                            value={user.totalModules > 0 ? (user.modulesCompleted / user.totalModules) * 100 : 0} 
                            className="w-16 h-2" 
                          />
                          <span className="text-sm">{user.modulesCompleted}/{user.totalModules}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(user.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.lastQuizScore !== null ? `${user.lastQuizScore}` : '-'}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {formatDate(user.lastActivityDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* User Courses Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Course progress for: {selectedUser?.userName}
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingUserCourses ? (
            <div className="flex items-center justify-center py-8">
              <LoaderIcon className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Avg Quiz Score</TableHead>
                  <TableHead className="text-center">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      This user hasn't started any courses yet
                    </TableCell>
                  </TableRow>
                ) : (
                  userCourses.map((course) => (
                    <TableRow key={course.topicId}>
                      <TableCell className="font-medium">{course.topicTitle}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress 
                            value={course.totalModules > 0 ? (course.modulesCompleted / course.totalModules) * 100 : 0} 
                            className="w-16 h-2" 
                          />
                          <span className="text-sm">{course.modulesCompleted}/{course.totalModules}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(course.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {course.averageQuizScore > 0 ? `${course.averageQuizScore}%` : '-'}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {formatDate(course.lastActivityDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
