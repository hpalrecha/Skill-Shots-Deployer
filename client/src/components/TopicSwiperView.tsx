import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Topic, Group } from '../types';
import TopicView from './TopicView';
import { ArrowLeftIcon, SkillShotsLogo } from './icons';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopicSwiperViewProps {
  topics: Topic[];
  initialTopicIndex: number;
  onClose: () => void;
  onMarkComplete: (topicId: string) => void;
  groups: Group[];
}

export default function TopicSwiperView({
  topics,
  initialTopicIndex,
  onClose,
  onMarkComplete,
  groups,
}: TopicSwiperViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialTopicIndex);
  const [, setLocation] = useLocation();
  
  const currentTopic = topics[currentIndex];
  
  useEffect(() => {
    if (currentTopic) {
      setLocation(`/topic/${currentTopic.id}`, { replace: true });
    }
  }, [currentIndex, currentTopic, setLocation]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < topics.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!currentTopic) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <p className="text-muted-foreground">Topic not found</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 animate-in fade-in duration-300 flex flex-col" data-testid="container-topic-swiper">
      <header className="sticky top-0 z-[60] bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Back to dashboard"
            data-testid="button-close-swiper"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <SkillShotsLogo className="h-6 w-6 text-primary" />
            <span className="font-semibold text-foreground">SkillShots</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            aria-label="Previous course"
            data-testid="button-prev-topic"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <span className="text-sm text-muted-foreground min-w-[80px] text-center">
            {currentIndex + 1} of {topics.length}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === topics.length - 1}
            aria-label="Next course"
            data-testid="button-next-topic"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-4 pt-6">
          <div className="w-full max-w-4xl mx-auto">
            <TopicView
              key={currentTopic.id}
              topic={currentTopic}
              onMarkComplete={onMarkComplete}
              groups={groups}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
