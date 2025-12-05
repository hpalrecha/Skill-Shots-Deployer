import { useMemo } from 'react';
import { Topic, TopicStatus, Group } from '../types';
import { ClockIcon, CheckCircleIcon, UsersIcon, ClipboardListIcon } from './icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TopicCardProps {
  topic: Topic;
  onSelect: (topic: Topic) => void;
  groups: Group[];
}

export default function TopicCard({ topic, onSelect, groups }: TopicCardProps) {
  const isCompleted = topic.status === TopicStatus.Completed;

  const sharedWithGroupNames = useMemo(() => {
    return topic.sharedWith
      .map(groupId => groups.find(g => g.id === groupId)?.name)
      .filter(Boolean) as string[];
  }, [topic.sharedWith, groups]);

  return (
    <Card
      onClick={() => onSelect(topic)}
      className="overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 cursor-pointer group flex flex-col relative hover-elevate"
      data-testid={`card-topic-${topic.id}`}
    >
      <div className="relative">
        <img src={topic.imageUrl} alt={topic.title} className="w-full h-40 object-cover" />
        <Badge 
          className={`absolute top-2 right-2 ${isCompleted ? 'bg-chart-2 text-white' : 'bg-primary text-primary-foreground'}`}
        >
          {topic.category}
        </Badge>

        {topic.isSop && (
          <Badge className="absolute top-2 left-2 bg-chart-3 text-white flex items-center">
            <ClipboardListIcon className="h-3 w-3 mr-1" />
            SOP
          </Badge>
        )}

        {isCompleted && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <CheckCircleIcon className="h-12 w-12 text-white opacity-90" />
          </div>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-semibold text-foreground mb-2 truncate group-hover:text-primary transition-colors" data-testid={`text-topic-title-${topic.id}`}>
          {topic.title}
        </h3>
        <div className="flex-grow"></div>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mt-2 flex-wrap">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1.5" />
            <span>{topic.readTime} min read</span>
          </div>
          {sharedWithGroupNames.length > 0 && (
            <div className="flex items-center" title={`Shared with: ${sharedWithGroupNames.join(', ')}`}>
              <UsersIcon className="h-4 w-4 mr-1.5" />
              <span className="truncate max-w-[100px]">{sharedWithGroupNames[0]}</span>
              {sharedWithGroupNames.length > 1 && <span className="ml-1">+{sharedWithGroupNames.length - 1}</span>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
