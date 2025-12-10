import { useState, useEffect } from 'react';
import { CourseModule, ModuleProgress, ContentType, ContentBlock } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  LoaderIcon, 
  VideoIcon,
  CheckCircleIcon,
  SparklesIcon
} from './icons';
import { Lock, CheckCircle2, Play, Target, BookOpen } from 'lucide-react';
import ModuleQuiz from './ModuleQuiz';

interface ModuleLearnerViewProps {
  modules: CourseModule[];
  topicId: string;
  onAllModulesComplete?: () => void;
}

interface LocalModuleProgress {
  [moduleId: string]: {
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
    quizScore?: number;
    quizTotal?: number;
  };
}

export default function ModuleLearnerView({ 
  modules, 
  topicId,
  onAllModulesComplete 
}: ModuleLearnerViewProps) {
  const [moduleProgress, setModuleProgress] = useState<LocalModuleProgress>({});
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizModule, setQuizModule] = useState<CourseModule | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [topicId]);

  const loadProgress = async () => {
    setIsLoadingProgress(true);
    try {
      const response = await fetch(`/api/module-progress/${topicId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data: ModuleProgress[] = await response.json();
        const progressMap: LocalModuleProgress = {};
        
        data.forEach(p => {
          progressMap[p.moduleId] = {
            status: p.status as any,
            quizScore: p.quizScore,
            quizTotal: p.quizTotal
          };
        });

        // First module is always unlocked
        if (modules.length > 0 && !progressMap[modules[0].id]) {
          progressMap[modules[0].id] = { status: 'unlocked' };
        }
        
        setModuleProgress(progressMap);
        setActiveModule(modules[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to load module progress:', error);
      // Default: unlock first module
      if (modules.length > 0) {
        setModuleProgress({ [modules[0].id]: { status: 'unlocked' } });
        setActiveModule(modules[0].id);
      }
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const saveProgress = async (moduleId: string, status: string, quizScore?: number, quizTotal?: number) => {
    try {
      await fetch('/api/module-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topicId,
          moduleId,
          status,
          quizScore,
          quizTotal
        })
      });
    } catch (error) {
      console.error('Failed to save module progress:', error);
    }
  };

  const handleStartQuiz = (module: CourseModule) => {
    setQuizModule(module);
    setShowQuiz(true);
  };

  const handleQuizComplete = async (score: number, total: number, passed: boolean) => {
    if (!quizModule) return;

    const moduleIndex = modules.findIndex(m => m.id === quizModule.id);
    const newProgress = { ...moduleProgress };

    if (passed) {
      // Mark current module as completed
      newProgress[quizModule.id] = { 
        status: 'completed', 
        quizScore: score, 
        quizTotal: total 
      };
      await saveProgress(quizModule.id, 'completed', score, total);

      // Unlock next module if exists
      if (moduleIndex < modules.length - 1) {
        const nextModule = modules[moduleIndex + 1];
        if (!newProgress[nextModule.id] || newProgress[nextModule.id].status === 'locked') {
          newProgress[nextModule.id] = { status: 'unlocked' };
          await saveProgress(nextModule.id, 'unlocked');
        }
      }

      // Check if all modules are completed
      const allCompleted = modules.every(m => newProgress[m.id]?.status === 'completed');
      if (allCompleted && onAllModulesComplete) {
        onAllModulesComplete();
      }
    } else {
      // Update progress with failed attempt
      newProgress[quizModule.id] = { 
        status: 'unlocked', 
        quizScore: score, 
        quizTotal: total 
      };
      await saveProgress(quizModule.id, 'unlocked', score, total);
    }

    setModuleProgress(newProgress);
    
    setTimeout(() => {
      setShowQuiz(false);
      setQuizModule(null);
    }, 100);
  };

  const getModuleStatus = (moduleId: string, index: number) => {
    const progress = moduleProgress[moduleId];
    if (progress) return progress.status;
    return index === 0 ? 'unlocked' : 'locked';
  };

  const isModuleLocked = (moduleId: string, index: number) => {
    return getModuleStatus(moduleId, index) === 'locked';
  };

  const getCompletedCount = () => {
    return modules.filter(m => moduleProgress[m.id]?.status === 'completed').length;
  };

  const overallProgress = modules.length > 0 
    ? (getCompletedCount() / modules.length) * 100 
    : 0;

  if (showQuiz && quizModule) {
    return (
      <ModuleQuiz
        module={quizModule}
        onComplete={handleQuizComplete}
        onCancel={() => {
          setShowQuiz(false);
          setQuizModule(null);
        }}
      />
    );
  }

  if (isLoadingProgress) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderContentBlock = (block: ContentBlock, index: number) => {
    if (!block.content) return null;

    switch (block.type) {
      case ContentType.Paragraph:
        return (
          <p key={index} className="text-foreground leading-relaxed whitespace-pre-line">
            {block.content}
          </p>
        );
      case ContentType.Image:
        return (
          <div key={index} className="my-4">
            <img 
              src={block.content} 
              alt={block.title || 'Module image'} 
              className="w-full rounded-lg"
            />
            {block.title && (
              <p className="text-sm text-muted-foreground text-center mt-2">{block.title}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Modules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete each module's quiz to unlock the next
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {getCompletedCount()} of {modules.length} completed
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Overall Progress</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} />
      </div>

      <Accordion 
        type="single" 
        collapsible 
        value={activeModule || undefined}
        onValueChange={(val) => setActiveModule(val || null)}
        className="space-y-3"
      >
        {modules
          .sort((a, b) => a.order - b.order)
          .map((module, idx) => {
            const status = getModuleStatus(module.id, idx);
            const locked = isModuleLocked(module.id, idx);
            const progress = moduleProgress[module.id];

            return (
              <AccordionItem 
                key={module.id} 
                value={module.id}
                className={`border rounded-lg overflow-hidden ${locked ? 'opacity-60' : ''}`}
                disabled={locked}
              >
                <AccordionTrigger 
                  className={`px-4 py-3 ${locked ? 'cursor-not-allowed' : ''}`}
                  disabled={locked}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                      status === 'locked' ? 'bg-muted' : 'bg-primary/10'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : status === 'locked' ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="font-mono text-sm font-medium text-primary">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium text-foreground">{module.title}</span>
                      {progress?.quizScore !== undefined && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          (Quiz: {progress.quizScore}/{progress.quizTotal})
                        </span>
                      )}
                    </div>
                    {locked && (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                
                {!locked && (
                  <AccordionContent className="px-4 py-4 space-y-4">
                    {module.summary && (
                      <p className="text-muted-foreground">{module.summary}</p>
                    )}

                    {module.learningObjectives && module.learningObjectives.length > 0 && (
                      <Card className="p-4 bg-primary/5">
                        <h4 className="font-medium text-foreground flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4" />
                          Learning Objectives
                        </h4>
                        <ul className="space-y-1">
                          {module.learningObjectives.map((obj, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircleIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {module.contentBlocks && module.contentBlocks.length > 0 && (
                      <div className="space-y-4">
                        {module.contentBlocks.map((block, i) => renderContentBlock(block, i))}
                      </div>
                    )}

                    {module.videos && module.videos.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-foreground flex items-center gap-2">
                          <VideoIcon className="h-4 w-4" />
                          Videos
                        </h4>
                        {module.videos.map(video => (
                          <Card key={video.id} className="p-3 bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                                <Play className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{video.title || 'Video'}</p>
                                {video.description && (
                                  <p className="text-sm text-muted-foreground">{video.description}</p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(video.url, '_blank')}
                              >
                                Watch
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      {status === 'completed' ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">Module Completed</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartQuiz(module)}
                            className="ml-auto"
                          >
                            Retake Quiz
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleStartQuiz(module)}
                          className="w-full sm:w-auto"
                          data-testid={`button-take-quiz-${module.id}`}
                        >
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          Take Module Quiz
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                )}
              </AccordionItem>
            );
          })}
      </Accordion>

      {getCompletedCount() === modules.length && modules.length > 0 && (
        <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">Course Complete!</h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                You've successfully completed all modules in this course.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
