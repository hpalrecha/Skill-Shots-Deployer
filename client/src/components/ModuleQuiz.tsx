import { useState, useEffect } from 'react';
import { CourseModule, QuizQuestion } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LoaderIcon, CheckCircleIcon, XIcon } from './icons';
import { CheckCircle2, XCircle, Trophy, ArrowRight } from 'lucide-react';

interface ModuleQuizProps {
  module: CourseModule;
  onComplete: (score: number, total: number, passed: boolean) => void;
  onCancel: () => void;
}

export default function ModuleQuiz({ module, onComplete, onCancel }: ModuleQuizProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const PASS_THRESHOLD = 0.9;

  useEffect(() => {
    generateQuiz();
  }, [module.id]);

  const generateQuiz = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const moduleContent = module.contentBlocks
        ?.map(b => b.content)
        .filter(Boolean)
        .join('\n\n') || '';

      const response = await fetch('/api/gemini/generate-module-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleContent,
          moduleTitle: module.title
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setQuestions(data);
        setAnswers(new Array(data.length).fill(null));
      } else {
        throw new Error('No quiz questions generated');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults();
    }
  };

  const calculateResults = () => {
    let correctCount = 0;
    answers.forEach((answer, idx) => {
      if (answer === questions[idx]?.correctAnswerIndex) {
        correctCount++;
      }
    });

    setShowResult(true);
    
    const score = correctCount;
    const total = questions.length;
    const passed = total > 0 && correctCount / total >= PASS_THRESHOLD;
    
    setTimeout(() => {
      onComplete(score, total, passed);
    }, 3000);
  };

  const getScorePercentage = () => {
    let correctCount = 0;
    answers.forEach((answer, idx) => {
      if (answer === questions[idx]?.correctAnswerIndex) {
        correctCount++;
      }
    });
    if (questions.length === 0) return 0;
    return Math.round((correctCount / questions.length) * 100);
  };

  const isPassed = () => getScorePercentage() >= PASS_THRESHOLD * 100;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Generating quiz for {module.title}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button onClick={generateQuiz}>Try Again</Button>
      </div>
    );
  }

  if (showResult) {
    const percentage = getScorePercentage();
    const passed = isPassed();

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        {passed ? (
          <>
            <Trophy className="h-16 w-16 text-yellow-500" />
            <h2 className="text-2xl font-bold text-foreground">Congratulations!</h2>
          </>
        ) : (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <h2 className="text-2xl font-bold text-foreground">Not Quite</h2>
          </>
        )}
        
        <div className="text-center">
          <p className="text-4xl font-bold text-foreground">{percentage}%</p>
          <p className="text-muted-foreground mt-2">
            You got {answers.filter((a, i) => a === questions[i]?.correctAnswerIndex).length} of {questions.length} correct
          </p>
        </div>

        {passed ? (
          <p className="text-green-600 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            You passed! The next module is now unlocked.
          </p>
        ) : (
          <p className="text-muted-foreground text-center">
            You need 90% to unlock the next module. Review the content and try again.
          </p>
        )}
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question?.correctAnswerIndex;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{module.title} Quiz</h2>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <XIcon className="h-5 w-5" />
        </Button>
      </div>

      <Progress value={((currentQuestion + 1) / questions.length) * 100} />

      <Card className="p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">
          {question?.question}
        </h3>

        <div className="space-y-3">
          {question?.options.map((option, idx) => {
            let bgClass = 'bg-muted/50';
            let borderClass = 'border-transparent';
            
            if (showFeedback) {
              if (idx === question.correctAnswerIndex) {
                bgClass = 'bg-green-100 dark:bg-green-900/30';
                borderClass = 'border-green-500';
              } else if (idx === selectedAnswer && !isCorrect) {
                bgClass = 'bg-red-100 dark:bg-red-900/30';
                borderClass = 'border-red-500';
              }
            } else if (selectedAnswer === idx) {
              bgClass = 'bg-primary/10';
              borderClass = 'border-primary';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                disabled={showFeedback}
                className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${bgClass} ${borderClass} hover-elevate`}
                data-testid={`quiz-option-${idx}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-sm">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 text-foreground">{option}</span>
                  {showFeedback && idx === question.correctAnswerIndex && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {showFeedback && idx === selectedAnswer && !isCorrect && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className={`mt-4 p-4 rounded-lg ${isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <p className={`font-medium ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${question.options[question.correctAnswerIndex]}`}
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        {!showFeedback ? (
          <Button 
            onClick={handleSubmitAnswer} 
            disabled={selectedAnswer === null}
            data-testid="button-submit-answer"
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNextQuestion} data-testid="button-next-question">
            {currentQuestion < questions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              'See Results'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
