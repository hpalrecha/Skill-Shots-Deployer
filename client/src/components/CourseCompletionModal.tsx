import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, PartyPopper, Star, Trophy } from 'lucide-react';

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  averageScore: number;
  onViewBadges?: () => void;
}

function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);
  
  useEffect(() => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function CourseCompletionModal({
  isOpen,
  onClose,
  courseTitle,
  averageScore,
  onViewBadges,
}: CourseCompletionModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <>
      {showConfetti && <Confetti />}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" data-testid="modal-course-completion">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Course Completed!
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6 space-y-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Award className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Congratulations!
              </p>
              <p className="text-muted-foreground">
                You've completed
              </p>
              <p className="text-lg font-medium text-primary">
                {courseTitle}
              </p>
            </div>
            
            <div className="bg-muted rounded-lg p-4 w-full text-center">
              <p className="text-sm text-muted-foreground mb-1">Average Quiz Score</p>
              <p className="text-3xl font-bold text-primary">{averageScore}%</p>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PartyPopper className="h-4 w-4" />
              <span>You earned a completion badge!</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="button-close-completion"
            >
              Continue Learning
            </Button>
            {onViewBadges && (
              <Button
                className="flex-1"
                onClick={() => {
                  onViewBadges();
                  onClose();
                }}
                data-testid="button-view-badges"
              >
                View My Badges
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
