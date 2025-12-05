import { useState, useRef, useEffect } from 'react';
import { QuizData } from '../types';
import { CheckIcon, XIcon, ArrowLeftIcon } from './icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface QuizProps {
  quizData: QuizData;
  onComplete: (score: number) => void;
  onRetry: () => void;
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export default function Quiz({ quizData, onComplete, onRetry }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(quizData.length).fill(-1));
  const [answerStates, setAnswerStates] = useState<AnswerState[]>(Array(quizData.length).fill('unanswered'));
  const [showResults, setShowResults] = useState(false);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (answerStates[currentQuestionIndex] !== 'unanswered' && nextButtonRef.current) {
      nextButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [answerStates, currentQuestionIndex]);

  const handleAnswerSelect = (optionIndex: number) => {
    if (answerStates[currentQuestionIndex] !== 'unanswered') return;

    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);

    const newAnswerStates = [...answerStates];
    if (optionIndex === quizData[currentQuestionIndex].correctAnswerIndex) {
      newAnswerStates[currentQuestionIndex] = 'correct';
    } else {
      newAnswerStates[currentQuestionIndex] = 'incorrect';
    }
    setAnswerStates(newAnswerStates);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResults(true);
      const finalScore = answerStates.filter(s => s === 'correct').length;
      onComplete(finalScore);
    }
  };

  const score = answerStates.filter(s => s === 'correct').length;
  const passed = score > 0;

  if (showResults) {
    return (
      <Card className={`p-8 text-center ${passed ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`} data-testid="card-quiz-results">
        {passed ? (
          <div className="flex flex-col items-center">
            <div className="bg-chart-2 text-white p-3 rounded-full mb-4 shadow-lg">
              <CheckIcon className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Quiz Complete!</h3>
            <p className="text-lg text-muted-foreground mt-2">You scored <span className="font-bold text-primary text-xl">{score}</span> out of {quizData.length}</p>
            <div className="mt-6">
              <Button variant="outline" onClick={onRetry} data-testid="button-try-again">
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-destructive text-destructive-foreground p-3 rounded-full mb-4 shadow-lg">
              <XIcon className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Quiz Failed</h3>
            <p className="text-lg text-muted-foreground mt-2">You scored {score} out of {quizData.length}.</p>
            <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">
              To complete this topic, you must get at least one answer correct. Please review the article content and generate a new quiz.
            </p>
            <Button onClick={onRetry} variant="outline" className="mt-6" data-testid="button-review-retry">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Review & Generate New Quiz
            </Button>
          </div>
        )}
      </Card>
    );
  }

  const currentQuestion = quizData[currentQuestionIndex];
  const currentAnswerState = answerStates[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestionIndex];

  return (
    <div className="space-y-6" data-testid="container-quiz">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Question {currentQuestionIndex + 1} of {quizData.length}</p>
        <h3 className="text-xl font-semibold text-foreground mt-1" data-testid="text-question">{currentQuestion.question}</h3>
      </div>
      <div className="space-y-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = currentQuestion.correctAnswerIndex === index;

          let buttonClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex justify-between items-center ";
          if (currentAnswerState === 'unanswered') {
            buttonClass += "bg-card border-border hover:bg-muted hover:border-primary cursor-pointer";
          } else {
            if (isSelected && isCorrect) buttonClass += "bg-chart-2/10 border-chart-2 text-chart-2";
            else if (isSelected && !isCorrect) buttonClass += "bg-destructive/10 border-destructive text-destructive";
            else if (isCorrect) buttonClass += "bg-chart-2/10 border-chart-2 text-chart-2";
            else buttonClass += "bg-card border-border cursor-not-allowed opacity-60";
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={currentAnswerState !== 'unanswered'}
              className={buttonClass}
              data-testid={`button-option-${index}`}
            >
              <span className="text-foreground">{option}</span>
              {currentAnswerState !== 'unanswered' && isSelected && isCorrect && <CheckIcon className="h-6 w-6 text-chart-2"/>}
              {currentAnswerState !== 'unanswered' && isSelected && !isCorrect && <XIcon className="h-6 w-6 text-destructive"/>}
              {currentAnswerState !== 'unanswered' && !isSelected && isCorrect && <CheckIcon className="h-6 w-6 text-chart-2"/>}
            </button>
          );
        })}
      </div>
      {currentAnswerState !== 'unanswered' && (
        <div className="text-right pt-2">
          <Button ref={nextButtonRef} onClick={handleNext} data-testid="button-next">
            {currentQuestionIndex < quizData.length - 1 ? 'Next Question' : 'View Results'}
          </Button>
        </div>
      )}
    </div>
  );
}
