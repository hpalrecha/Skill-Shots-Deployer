import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface CourseCompletion {
  id: string;
  userId: string;
  topicId: string;
  completedAt: string;
  averageScore: number;
  totalModules: number;
  topicTitle: string;
  topicCategory: string;
  topicImageUrl: string | null;
}

export default function CompletedCoursesBadges() {
  const [completions, setCompletions] = useState<CourseCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompletions();
  }, []);

  const fetchCompletions = async () => {
    try {
      const response = await fetch('/api/course-completions/user', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCompletions(data);
      }
    } catch (error) {
      console.error('Failed to fetch completions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">My Badges</CardTitle>
          <Award className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (completions.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">My Badges</CardTitle>
          <Award className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Complete courses to earn badges!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          My Badges
        </h2>
        <Badge variant="secondary">{completions.length} earned</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {completions.map((completion) => (
          <Card 
            key={completion.id} 
            className="text-center"
            data-testid={`badge-course-${completion.topicId}`}
          >
            <CardContent className="pt-4 pb-3 px-3">
              <div className="relative mx-auto mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                </div>
              </div>
              <p className="font-medium text-foreground text-sm line-clamp-2 mb-1">
                {completion.topicTitle}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {completion.topicCategory}
              </p>
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="text-xs justify-center">
                  {completion.averageScore}% score
                </Badge>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(completion.completedAt), 'MMM d, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
