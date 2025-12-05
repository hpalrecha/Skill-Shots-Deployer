import { useRef, useEffect } from 'react';
import { Topic, Group } from '../types';
import TopicView from './TopicView';
import { XIcon } from './icons';
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
    <div className="fixed inset-0 bg-background z-50 animate-in fade-in duration-300" data-testid="container-topic-swiper">
      <Button
        variant="secondary"
        size="icon"
        onClick={onClose}
        aria-label="Close topics view"
        className="fixed top-4 right-4 z-[60] bg-card/70 backdrop-blur-sm shadow-lg"
        data-testid="button-close-swiper"
      >
        <XIcon className="h-6 w-6" />
      </Button>

      <div
        ref={swiperRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory"
      >
        {topics.map(topic => (
          <div
            key={topic.id}
            className="h-screen w-screen snap-start flex items-center justify-center p-4"
          >
            <div className="h-full w-full max-w-5xl mx-auto">
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
