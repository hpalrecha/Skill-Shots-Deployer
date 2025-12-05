import { LeaderboardEntry } from '../types';
import { TrophyIcon, MedalIcon, UserCircleIcon } from './icons';
import { Card } from '@/components/ui/card';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export default function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  return (
    <Card className="overflow-hidden" data-testid="card-leaderboard">
      <div className="p-6 bg-gradient-to-r from-primary to-chart-3">
        <div className="flex items-center text-primary-foreground gap-3">
          <TrophyIcon className="h-8 w-8 text-chart-4" />
          <h3 className="text-xl font-bold">Top Learners</h3>
        </div>
        <p className="text-primary-foreground/70 text-sm mt-1">Earn points by completing courses and quizzes!</p>
      </div>
      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-3">Rank</th>
                <th className="px-6 py-3">Learner</th>
                <th className="px-6 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId;
                let rankIcon;
                let rankClass = "font-medium text-foreground";

                if (entry.rank === 1) {
                  rankIcon = <MedalIcon className="h-6 w-6 text-chart-4" />;
                  rankClass = "font-bold text-chart-4";
                } else if (entry.rank === 2) {
                  rankIcon = <MedalIcon className="h-6 w-6 text-muted-foreground" />;
                  rankClass = "font-bold text-muted-foreground";
                } else if (entry.rank === 3) {
                  rankIcon = <MedalIcon className="h-6 w-6 text-chart-4/70" />;
                  rankClass = "font-bold text-chart-4/70";
                } else {
                  rankIcon = <span className="w-6 h-6 flex items-center justify-center font-semibold text-muted-foreground">{entry.rank}</span>;
                }

                return (
                  <tr key={entry.userId} className={`${isCurrentUser ? 'bg-primary/5' : 'hover:bg-muted/30'} transition-colors`} data-testid={`row-leaderboard-${entry.userId}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center w-8">
                        {rankIcon}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 text-muted-foreground">
                          <UserCircleIcon className={`h-8 w-8 ${isCurrentUser ? 'text-primary' : ''}`} />
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm ${isCurrentUser ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
                            {entry.name} {isCurrentUser && '(You)'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-foreground">
                      {entry.points.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
