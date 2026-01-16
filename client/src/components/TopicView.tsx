import { useState, useMemo } from 'react';
import { Topic, QuizData, ContentType, ContentBlock, Group } from '../types';
import { generateQuiz, analyzeVideoContent } from '../services/geminiService';
import Quiz from './Quiz';
import ModuleLearnerView from './ModuleLearnerView';
import TopicChat from './TopicChat';
import { SparklesIcon, LoaderIcon, FileTextIcon, VideoIcon, UsersIcon, ClipboardListIcon, CheckIcon, ImageIcon } from './icons';
import { Eye, Download, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TopicViewProps {
  topic: Topic;
  onMarkComplete: (topicId: string) => void;
  groups: Group[];
}

export default function TopicView({ topic, onMarkComplete, groups }: TopicViewProps) {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});

  const sharedWithGroupNames = useMemo(() => {
    return topic.sharedWith
      .map(groupId => groups.find(g => g.id === groupId)?.name)
      .filter(Boolean) as string[];
  }, [topic.sharedWith, groups]);

  const handleGenerateQuiz = async () => {
    setIsLoadingQuiz(true);
    setQuizError(null);
    setQuizData(null);
    try {
      const data = await generateQuiz(topic.content);
      setQuizData(data);
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleQuizComplete = (score: number) => {
    if (score > 0) {
      setQuizCompleted(true);
    } else {
      setQuizCompleted(false);
    }
  };

  const handleRetryQuiz = () => {
    setQuizData(null);
    setQuizCompleted(false);
    const contentElement = document.getElementById('topic-content');
    if (contentElement) {
      contentElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAnalyzeVideo = async (block: ContentBlock) => {
    const videoId = block.content;
    setIsAnalyzing(prev => ({ ...prev, [videoId]: true }));
    try {
      const result = await analyzeVideoContent(block.title || 'this video');
      setAnalysis(prev => ({ ...prev, [videoId]: result }));
    } catch (error) {
      setAnalysis(prev => ({ ...prev, [videoId]: 'Error: Could not analyze the video.' }));
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [videoId]: false }));
    }
  };

  return (
    <div className="bg-card p-6 sm:p-8 rounded-xl shadow-lg h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto" id="topic-content">
        <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-primary border-primary">{topic.category}</Badge>
              {topic.isSop && (
                <Badge className="bg-chart-3 text-white flex items-center gap-1">
                  <ClipboardListIcon className="h-3 w-3" />
                  SOP Reference
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2" data-testid="text-topic-title">{topic.title}</h1>
            {sharedWithGroupNames.length > 0 && (
              <div className="mt-3 flex items-center text-sm text-muted-foreground gap-2">
                <UsersIcon className="h-4 w-4" />
                Shared with: <span className="font-medium text-foreground">{sharedWithGroupNames.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-muted-foreground mb-6">{topic.readTime} min read</p>

        {topic.imageUrl && (
          <div className="mb-8">
            <img src={topic.imageUrl} alt={topic.title} className="w-full h-64 md:h-80 object-cover rounded-lg shadow-sm"/>
          </div>
        )}

        {/* Always show topic content blocks first if they exist */}
        {topic.content && topic.content.length > 0 && topic.content.some(b => b.content) && (
          <div className="prose prose-lg max-w-none text-foreground space-y-6 mb-8">
            <p className="text-sm text-muted-foreground">Course Materials ({topic.content.filter(b => b.content).length} items)</p>
            {topic.content.map((block, index) => {
              if (!block.content) return null;
              console.log('TopicView rendering block:', block.type, 'ContentType.Document:', ContentType.Document, 'match:', block.type === ContentType.Document);

              switch (block.type) {
                case ContentType.Paragraph:
                  return <p key={index} className="whitespace-pre-line leading-relaxed text-foreground">{block.content}</p>;
                case ContentType.Image:
                  const hasImgDataUrl = block.content?.startsWith('data:');
                  return (
                    <Card key={index} className="my-8 p-4">
                      <div className="relative">
                        <img src={block.content} alt={block.title || 'Topic Image'} className="w-full rounded-lg" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const newWindow = window.open();
                              if (newWindow) {
                                newWindow.document.write(`
                                  <html>
                                    <head><title>${block.title || 'Image'}</title></head>
                                    <body style="margin:0;padding:20px;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                                      <img src="${block.content}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                                    </body>
                                  </html>
                                `);
                              }
                            }}
                            data-testid={`button-view-topimg-${index}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Full
                          </Button>
                          {hasImgDataUrl && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = block.content;
                                link.download = block.title || 'image.png';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              data-testid={`button-download-topimg-${index}`}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                      {block.title && <p className="text-center text-sm text-muted-foreground mt-3">{block.title}</p>}
                    </Card>
                  );
                case ContentType.Video:
                  const vidIsYouTube = block.content.includes('youtube.com') || block.content.includes('youtu.be');
                  const vidHasDataUrl = block.content?.startsWith('data:');
                  return (
                    <Card key={index} className="my-8 p-4 bg-muted/50">
                      <h4 className="flex items-center gap-2 font-bold text-foreground mb-3">
                        <VideoIcon className="h-5 w-5 text-primary" /> 
                        {block.title || 'Instructional Video'}
                      </h4>
                      <div className="aspect-video mb-4">
                        {vidIsYouTube ? (
                          <iframe 
                            src={block.content} 
                            title={block.title || 'Video'} 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen 
                            className="rounded-lg shadow-md w-full h-full"
                          ></iframe>
                        ) : vidHasDataUrl ? (
                          <video src={block.content} controls className="rounded-lg w-full h-full">
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full bg-muted rounded-lg p-4 gap-3">
                            <VideoIcon className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground text-sm text-center">{block.title || 'Video file'}</p>
                            <Button variant="outline" size="sm" onClick={() => window.open(block.content, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open Video
                            </Button>
                          </div>
                        )}
                      </div>
                      {vidHasDataUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = block.content;
                            link.download = block.title || 'video.mp4';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download Video
                        </Button>
                      )}
                    </Card>
                  );
                case ContentType.Document:
                  const docIsPdf = block.content?.startsWith('data:application/pdf') || block.title?.toLowerCase().endsWith('.pdf');
                  const docHasDataUrl = block.content?.startsWith('data:');
                  return (
                    <Card key={index} className="my-6 p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileTextIcon className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <span className="block font-bold text-foreground">{block.title || 'Document'}</span>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">Reference Document</Badge>
                            {docHasDataUrl && (
                              <Badge variant="secondary" className="text-xs">Uploaded File</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {docHasDataUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (docIsPdf) {
                                  // Convert base64 to Blob for better PDF viewing
                                  try {
                                    const base64Data = block.content.split(',')[1];
                                    const byteCharacters = atob(base64Data);
                                    const byteNumbers = new Array(byteCharacters.length);
                                    for (let i = 0; i < byteCharacters.length; i++) {
                                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                                    }
                                    const byteArray = new Uint8Array(byteNumbers);
                                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                                    const blobUrl = URL.createObjectURL(blob);
                                    window.open(blobUrl, '_blank');
                                  } catch (e) {
                                    // Fallback: open data URL directly
                                    window.open(block.content, '_blank');
                                  }
                                } else {
                                  // For images, use the original approach
                                  const newWindow = window.open();
                                  if (newWindow) {
                                    newWindow.document.write(`
                                      <html>
                                        <head><title>${block.title || 'Document'}</title></head>
                                        <body style="margin:0;padding:0;">
                                          <img src="${block.content}" style="max-width:100%;height:auto;" />
                                        </body>
                                      </html>
                                    `);
                                  }
                                }
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          )}
                          {docHasDataUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = block.content;
                                link.download = block.title || (docIsPdf ? 'document.pdf' : 'document');
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                default:
                  return null;
              }
            })}
          </div>
        )}

        {/* Show modules if they exist */}
        {topic.modules && topic.modules.length > 0 && (
          <div className="mb-8">
            <ModuleLearnerView
              modules={topic.modules}
              topicId={topic.id}
              onAllModulesComplete={() => onMarkComplete(topic.id)}
            />
          </div>
        )}

        {/* Show topic content only when no modules exist (fallback for old topics) */}
        {(!topic.modules || topic.modules.length === 0) && topic.content && topic.content.length > 0 && (
        <div className="prose prose-lg max-w-none text-foreground space-y-6">
          {topic.content.map((block, index) => {
            if (!block.content) return null;

            switch (block.type) {
              case ContentType.Paragraph:
                return <p key={index} className="whitespace-pre-line leading-relaxed text-foreground">{block.content}</p>;
              case ContentType.Image:
                const hasImageDataUrl = block.content?.startsWith('data:');
                return (
                  <Card key={index} className="my-8 p-4">
                    <div className="relative">
                      <img src={block.content} alt={block.title || 'Topic Image'} className="w-full rounded-lg" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(`
                                <html>
                                  <head><title>${block.title || 'Image'}</title></head>
                                  <body style="margin:0;padding:20px;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                                    <img src="${block.content}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                                  </body>
                                </html>
                              `);
                            }
                          }}
                          data-testid={`button-view-image-${index}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Full
                        </Button>
                        {hasImageDataUrl && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = block.content;
                              link.download = block.title || 'image.png';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            data-testid={`button-download-image-${index}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                    {block.title && <p className="text-center text-sm text-muted-foreground mt-3">{block.title}</p>}
                  </Card>
                );
              case ContentType.Video:
                const videoId = block.content;
                const isYouTube = block.content.includes('youtube.com') || block.content.includes('youtu.be');
                const hasVideoDataUrl = block.content?.startsWith('data:');
                return (
                  <Card key={index} className="my-8 p-4 bg-muted/50">
                    <h4 className="flex items-center gap-2 font-bold text-foreground mb-3">
                      <VideoIcon className="h-5 w-5 text-primary" /> 
                      {block.title || 'Instructional Video'}
                    </h4>
                    <div className="aspect-video mb-4">
                      {isYouTube ? (
                        <iframe 
                          src={block.content} 
                          title={block.title || 'Video'} 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen 
                          className="rounded-lg shadow-md w-full h-full"
                        ></iframe>
                      ) : hasVideoDataUrl ? (
                        <video 
                          src={block.content} 
                          controls 
                          className="rounded-lg w-full h-full"
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-muted rounded-lg p-4 gap-3">
                          <VideoIcon className="h-12 w-12 text-muted-foreground" />
                          <p className="text-muted-foreground text-sm text-center">{block.title || 'Video file'}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(block.content, '_blank')}
                            data-testid={`button-open-video-${index}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open Video
                          </Button>
                        </div>
                      )}
                    </div>
                    {hasVideoDataUrl && (
                      <div className="flex gap-2 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = block.content;
                            link.download = block.title || 'video.mp4';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          data-testid={`button-download-video-${index}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download Video
                        </Button>
                      </div>
                    )}
                    <div>
                      <Button
                        onClick={() => handleAnalyzeVideo(block)}
                        disabled={isAnalyzing[videoId]}
                        className="bg-gradient-to-r from-chart-4 to-chart-3 text-white"
                        data-testid={`button-analyze-video-${index}`}
                      >
                        {isAnalyzing[videoId] ? <LoaderIcon className="animate-spin h-4 w-4 mr-2" /> : <SparklesIcon className="h-4 w-4 mr-2" />}
                        {isAnalyzing[videoId] ? 'Analyzing...' : 'Analyze Key Points with AI'}
                      </Button>
                      {analysis[videoId] && (
                        <Card className="mt-4 p-5 bg-primary/5 border-primary/10">
                          <h5 className="font-bold text-foreground flex items-center gap-2 mb-2">
                            <SparklesIcon className="h-4 w-4 text-primary"/>
                            AI Summary
                          </h5>
                          <div className="text-sm whitespace-pre-wrap text-muted-foreground">{analysis[videoId]}</div>
                        </Card>
                      )}
                    </div>
                  </Card>
                );
              case ContentType.Document:
                const isPdf = block.content?.startsWith('data:application/pdf') || block.title?.toLowerCase().endsWith('.pdf');
                const hasDataUrl = block.content?.startsWith('data:');
                return (
                  <Card key={index} className="my-6 p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FileTextIcon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="block font-bold text-foreground">{block.title || 'Document'}</span>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">Reference Document</Badge>
                          {hasDataUrl && (
                            <Badge variant="secondary" className="text-xs">Uploaded File</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasDataUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (isPdf) {
                                // Convert base64 to Blob for better PDF viewing
                                try {
                                  const base64Data = block.content.split(',')[1];
                                  const byteCharacters = atob(base64Data);
                                  const byteNumbers = new Array(byteCharacters.length);
                                  for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                  }
                                  const byteArray = new Uint8Array(byteNumbers);
                                  const blob = new Blob([byteArray], { type: 'application/pdf' });
                                  const blobUrl = URL.createObjectURL(blob);
                                  window.open(blobUrl, '_blank');
                                } catch (e) {
                                  // Fallback: open data URL directly
                                  window.open(block.content, '_blank');
                                }
                              } else {
                                // For images, use the original approach
                                const newWindow = window.open();
                                if (newWindow) {
                                  newWindow.document.write(`
                                    <html>
                                      <head><title>${block.title || 'Document'}</title></head>
                                      <body style="margin:0;padding:0;">
                                        <img src="${block.content}" style="max-width:100%;height:auto;" />
                                      </body>
                                    </html>
                                  `);
                                }
                              }
                            }}
                            data-testid={`button-view-doc-${index}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        {hasDataUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = block.content;
                              link.download = block.title || 'document';
                              link.click();
                            }}
                            data-testid={`button-download-doc-${index}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        {!hasDataUrl && block.content && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={block.content} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              default:
                return null;
            }
          })}
        </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto mt-12 mb-8">
        <TopicChat topicTitle={topic.title} contentBlocks={topic.content} />
      </div>

      <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-border">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-primary" />
            Test Your Knowledge
          </h3>
          {!quizData && !quizCompleted && (
            <Button
              onClick={handleGenerateQuiz}
              disabled={isLoadingQuiz}
              className="bg-gradient-to-r from-primary to-chart-3 text-white"
              data-testid="button-generate-quiz"
            >
              {isLoadingQuiz ? <LoaderIcon className="animate-spin h-4 w-4 mr-2" /> : <SparklesIcon className="h-4 w-4 mr-2" />}
              {isLoadingQuiz ? 'Generating Quiz...' : 'Generate AI Quiz'}
            </Button>
          )}
        </div>

        {quizError && (
          <Card className="p-4 bg-destructive/10 border-destructive/20 text-destructive text-center">
            {quizError}
          </Card>
        )}

        {quizData && !quizCompleted && (
          <Quiz quizData={quizData} onComplete={handleQuizComplete} onRetry={handleRetryQuiz} />
        )}

        {quizCompleted && (
          <Card className="p-8 text-center bg-chart-2/5 border-chart-2/20">
            <div className="flex flex-col items-center">
              <div className="bg-chart-2 text-white p-3 rounded-full mb-4 shadow-lg">
                <CheckIcon className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Topic Mastered!</h3>
              <p className="text-muted-foreground mt-2">You've successfully completed this topic.</p>
              <Button
                onClick={() => onMarkComplete(topic.id)}
                className="mt-6"
                data-testid="button-mark-complete"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Mark as Complete
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
