import { useRef, useEffect } from 'react';
import { Topic, Group } from '../types';
import TopicView from './TopicView';
import { ArrowLeftIcon, SkillShotsLogo } from './icons';
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
  const swiperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (swiperRef.current) {
      const initialTopicElement = swiperRef.current.children[initialTopicIndex] as HTMLElement;
      if (initialTopicElement) {
        initialTopicElement.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [initialTopicIndex, topics]);

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
        <div className="text-sm text-muted-foreground">
          Course {initialTopicIndex + 1} of {topics.length}
        </div>
      </header>

      <div
        ref={swiperRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory"
      >
        {topics.map(topic => (
          <div
            key={topic.id}
            className="min-h-[calc(100vh-60px)] snap-start flex items-start justify-center p-4 pt-6"
          >
            <div className="w-full max-w-4xl mx-auto">
              <TopicView
                topic={topic}
                onMarkComplete={onMarkComplete}
                groups={groups}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
