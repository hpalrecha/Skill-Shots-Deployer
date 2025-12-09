import { useState, useMemo } from 'react';
import { Topic, QuizData, ContentType, ContentBlock, Group } from '../types';
import { generateQuiz, analyzeVideoContent, askQuestionAboutTopic } from '../services/geminiService';
import Quiz from './Quiz';
import { SparklesIcon, LoaderIcon, FileTextIcon, VideoIcon, UsersIcon, MessageSquareIcon, SendIcon, ClipboardListIcon, CheckIcon } from './icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

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

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;

    setIsAsking(true);
    setAskAnswer(null);

    try {
      const answer = await askQuestionAboutTopic(topic.content, askQuestion);
      setAskAnswer(answer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "I'm having trouble connecting right now. Please try again.";
      setAskAnswer(errorMessage);
    } finally {
      setIsAsking(false);
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

        <div className="prose prose-lg max-w-none text-foreground space-y-6">
          {topic.content.map((block, index) => {
            if (!block.content) return null;

            switch (block.type) {
              case ContentType.Paragraph:
                return <p key={index} className="whitespace-pre-line leading-relaxed text-foreground">{block.content}</p>;
              case ContentType.Image:
                return (
                  <figure key={index} className="my-8">
                    <img src={block.content} alt={block.title || 'Topic Image'} className="w-full rounded-xl shadow-lg" />
                    {block.title && <figcaption className="text-center text-sm text-muted-foreground mt-3 italic">{block.title}</figcaption>}
                  </figure>
                );
              case ContentType.Video:
                const videoId = block.content;
                const isYouTube = block.content.includes('youtube.com') || block.content.includes('youtu.be');
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
                      ) : (
                        <div className="p-4 text-muted-foreground border border-border rounded bg-card">Video preview not available for raw file uploads in this demo view.</div>
                      )}
                    </div>
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
                return (
                  <div key={index} className="my-6">
                    <a href={block.content} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all no-underline group gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <FileTextIcon className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <span className="block font-bold text-foreground group-hover:text-primary transition-colors">Reference Document</span>
                        <span className="block text-sm text-muted-foreground mt-0.5">{block.title || 'Download PDF'}</span>
                        {block.content.startsWith('data:') && (
                          <Badge variant="secondary" className="mt-1 text-xs">Uploaded File (AI Readable)</Badge>
                        )}
                      </div>
                    </a>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>

      <Card className="max-w-4xl mx-auto mt-12 mb-8 p-6 bg-primary/5 border-primary/10">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <MessageSquareIcon className="h-5 w-5 text-primary" />
          Have a question about this topic?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Ask our AI tutor anything related to the content above (including PDFs and Images).</p>

        <form onSubmit={handleAskQuestion} className="flex gap-2">
          <Input
            type="text"
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            placeholder="E.g., What is the main safety protocol mentioned?"
            disabled={isAsking}
            data-testid="input-ask-question"
          />
          <Button
            type="submit"
            disabled={isAsking || !askQuestion.trim()}
            data-testid="button-ask-question"
          >
            {isAsking ? <LoaderIcon className="animate-spin h-5 w-5" /> : <SendIcon className="h-5 w-5" />}
          </Button>
        </form>

        {askAnswer && (
          <Card className="mt-4 p-4 bg-card">
            <h5 className="font-bold text-foreground flex items-center gap-2 mb-2">
              <SparklesIcon className="h-4 w-4 text-primary"/>
              AI Answer
            </h5>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-ai-answer">{askAnswer}</p>
          </Card>
        )}
      </Card>

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
