import { useState } from 'react';
import { CourseModule, ContentBlock, ModuleVideo, ContentType } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  SparklesIcon, 
  LoaderIcon, 
  TrashIcon, 
  PlusIcon, 
  VideoIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  BookOpenIcon,
  TargetIcon
} from './icons';
import { CheckCircle2, Lock, AlertCircle } from 'lucide-react';

interface ModuleEditorProps {
  modules: CourseModule[];
  contentBlocks: ContentBlock[];
  topicTitle: string;
  onModulesChange: (modules: CourseModule[]) => void;
}

export default function ModuleEditor({ 
  modules, 
  contentBlocks, 
  topicTitle,
  onModulesChange 
}: ModuleEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const hasValidContent = contentBlocks.some(
    block => block.content && block.content.trim().length > 0
  );

  const generateModules = async () => {
    if (!hasValidContent) {
      setError('Add content blocks before generating modules');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/generate-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentBlocks,
          title: topicTitle
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate modules');
      }

      const data = await response.json();
      
      if (data.modules && Array.isArray(data.modules)) {
        onModulesChange(data.modules);
        setExpandedModules([data.modules[0]?.id || 'module-1']);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate modules');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateModule = (moduleId: string, updates: Partial<CourseModule>) => {
    onModulesChange(
      modules.map(m => m.id === moduleId ? { ...m, ...updates } : m)
    );
  };

  const removeModule = (moduleId: string) => {
    const filtered = modules.filter(m => m.id !== moduleId);
    const reordered = filtered.map((m, idx) => ({ ...m, order: idx + 1 }));
    onModulesChange(reordered);
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    const idx = modules.findIndex(m => m.id === moduleId);
    if (direction === 'up' && idx > 0) {
      const newModules = [...modules];
      [newModules[idx - 1], newModules[idx]] = [newModules[idx], newModules[idx - 1]];
      onModulesChange(newModules.map((m, i) => ({ ...m, order: i + 1 })));
    } else if (direction === 'down' && idx < modules.length - 1) {
      const newModules = [...modules];
      [newModules[idx], newModules[idx + 1]] = [newModules[idx + 1], newModules[idx]];
      onModulesChange(newModules.map((m, i) => ({ ...m, order: i + 1 })));
    }
  };

  const addVideoToModule = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const newVideo: ModuleVideo = {
      id: `video-${Date.now()}`,
      title: '',
      url: '',
      description: ''
    };

    updateModule(moduleId, {
      videos: [...(module.videos || []), newVideo]
    });
  };

  const updateModuleVideo = (moduleId: string, videoId: string, updates: Partial<ModuleVideo>) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      videos: module.videos.map(v => v.id === videoId ? { ...v, ...updates } : v)
    });
  };

  const removeModuleVideo = (moduleId: string, videoId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      videos: module.videos.filter(v => v.id !== videoId)
    });
  };

  const addContentBlock = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const newBlock: ContentBlock = {
      type: ContentType.Paragraph,
      content: '',
      order: (module.contentBlocks?.length || 0) + 1
    };

    updateModule(moduleId, {
      contentBlocks: [...(module.contentBlocks || []), newBlock]
    });
  };

  const updateModuleContentBlock = (moduleId: string, blockIndex: number, content: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const newBlocks = [...module.contentBlocks];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], content };
    updateModule(moduleId, { contentBlocks: newBlocks });
  };

  const removeModuleContentBlock = (moduleId: string, blockIndex: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const newBlocks = module.contentBlocks.filter((_, idx) => idx !== blockIndex);
    updateModule(moduleId, { 
      contentBlocks: newBlocks.map((b, i) => ({ ...b, order: i + 1 })) 
    });
  };

  const addObjective = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      learningObjectives: [...(module.learningObjectives || []), '']
    });
  };

  const updateObjective = (moduleId: string, idx: number, value: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const objectives = [...module.learningObjectives];
    objectives[idx] = value;
    updateModule(moduleId, { learningObjectives: objectives });
  };

  const removeObjective = (moduleId: string, idx: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      learningObjectives: module.learningObjectives.filter((_, i) => i !== idx)
    });
  };

  const addNewModule = () => {
    const newModule: CourseModule = {
      id: `module-${Date.now()}`,
      title: 'New Module',
      summary: '',
      learningObjectives: [''],
      contentBlocks: [{ type: ContentType.Paragraph, content: '', order: 1 }],
      videos: [],
      order: modules.length + 1
    };
    onModulesChange([...modules, newModule]);
    setExpandedModules([...expandedModules, newModule.id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <Label className="text-lg font-semibold flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5" />
            Learning Modules
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Organize content into structured learning modules with gated progression
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={addNewModule}
            data-testid="button-add-module"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Module
          </Button>
          <Button
            type="button"
            onClick={generateModules}
            disabled={isGenerating || !hasValidContent}
            className="bg-gradient-to-r from-chart-3 to-primary"
            data-testid="button-generate-modules"
          >
            {isGenerating ? (
              <>
                <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4 mr-2" />
                AI Generate Modules
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!hasValidContent && modules.length === 0 && (
        <Card className="p-6 text-center bg-muted/50">
          <p className="text-muted-foreground">
            Add content blocks above, then use AI to automatically generate structured learning modules
          </p>
        </Card>
      )}

      {modules.length > 0 && (
        <Accordion 
          type="multiple" 
          value={expandedModules}
          onValueChange={setExpandedModules}
          className="space-y-3"
        >
          {modules
            .sort((a, b) => a.order - b.order)
            .map((module, idx) => (
              <AccordionItem 
                key={module.id} 
                value={module.id}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="outline" className="font-mono">
                      {idx + 1}
                    </Badge>
                    <span className="font-medium text-left flex-1">
                      {module.title || 'Untitled Module'}
                    </span>
                    <div className="flex items-center gap-2 mr-2" onClick={e => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => moveModule(module.id, 'up')}
                        data-testid={`button-move-up-${module.id}`}
                      >
                        <ChevronUpIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idx === modules.length - 1}
                        onClick={() => moveModule(module.id, 'down')}
                        data-testid={`button-move-down-${module.id}`}
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeModule(module.id)}
                        className="text-destructive"
                        data-testid={`button-remove-module-${module.id}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Module Title</Label>
                      <Input
                        value={module.title}
                        onChange={e => updateModule(module.id, { title: e.target.value })}
                        placeholder="Enter module title"
                        data-testid={`input-module-title-${module.id}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Summary</Label>
                      <Textarea
                        value={module.summary}
                        onChange={e => updateModule(module.id, { summary: e.target.value })}
                        placeholder="Brief summary of what this module covers..."
                        className="min-h-[60px]"
                        data-testid={`input-module-summary-${module.id}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="flex items-center gap-2">
                        <TargetIcon className="h-4 w-4" />
                        Learning Objectives
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addObjective(module.id)}
                        data-testid={`button-add-objective-${module.id}`}
                      >
                        <PlusIcon className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {module.learningObjectives?.map((obj, objIdx) => (
                        <div key={objIdx} className="flex gap-2">
                          <Input
                            value={obj}
                            onChange={e => updateObjective(module.id, objIdx, e.target.value)}
                            placeholder={`Objective ${objIdx + 1}`}
                            className="flex-1"
                            data-testid={`input-objective-${module.id}-${objIdx}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeObjective(module.id, objIdx)}
                            className="text-destructive shrink-0"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Content Blocks</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addContentBlock(module.id)}
                        data-testid={`button-add-content-${module.id}`}
                      >
                        <PlusIcon className="h-3 w-3 mr-1" />
                        Add Block
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {module.contentBlocks?.map((block, blockIdx) => (
                        <div key={blockIdx} className="flex gap-2">
                          <Textarea
                            value={block.content}
                            onChange={e => updateModuleContentBlock(module.id, blockIdx, e.target.value)}
                            placeholder="Enter content..."
                            className="flex-1 min-h-[80px]"
                            data-testid={`input-content-${module.id}-${blockIdx}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeModuleContentBlock(module.id, blockIdx)}
                            className="text-destructive shrink-0"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="flex items-center gap-2">
                        <VideoIcon className="h-4 w-4" />
                        Videos
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addVideoToModule(module.id)}
                        data-testid={`button-add-video-${module.id}`}
                      >
                        <PlusIcon className="h-3 w-3 mr-1" />
                        Add Video
                      </Button>
                    </div>
                    {module.videos?.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No videos added. Click "Add Video" to attach supplementary video content.
                      </p>
                    )}
                    <div className="space-y-3">
                      {module.videos?.map(video => (
                        <Card key={video.id} className="p-3 bg-muted/30">
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={video.title}
                                onChange={e => updateModuleVideo(module.id, video.id, { title: e.target.value })}
                                placeholder="Video title"
                                className="flex-1"
                                data-testid={`input-video-title-${video.id}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeModuleVideo(module.id, video.id)}
                                className="text-destructive shrink-0"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              value={video.url}
                              onChange={e => updateModuleVideo(module.id, video.id, { url: e.target.value })}
                              placeholder="Video URL (YouTube, Vimeo, etc.)"
                              data-testid={`input-video-url-${video.id}`}
                            />
                            <Input
                              value={video.description || ''}
                              onChange={e => updateModuleVideo(module.id, video.id, { description: e.target.value })}
                              placeholder="Brief description (optional)"
                              data-testid={`input-video-description-${video.id}`}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {idx === 0 ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          First module - always unlocked for learners
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Unlocks after learner scores 90%+ on Module {idx} quiz
                        </>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      )}

      {modules.length > 0 && (
        <Card className="p-4 bg-muted/30">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Gated Progression</p>
              <p className="text-sm text-muted-foreground">
                Learners must score 90% or higher on each module's quiz to unlock the next module.
                Module 1 is always unlocked as the starting point.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
