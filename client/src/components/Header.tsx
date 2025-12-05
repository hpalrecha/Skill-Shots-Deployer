import { User, UserRole } from '../types';
import { SkillShotsLogo, UserCircleIcon, LogOutIcon, EditIcon } from './icons';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onAdminClick: () => void;
}

export default function Header({ user, onLogout, onAdminClick }: HeaderProps) {
  const isCreator = user.role === UserRole.Creator;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.location.reload()} data-testid="link-home">
          <SkillShotsLogo className="h-9 w-9 text-primary" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">SkillShots</h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {isCreator && (
            <Button
              variant="secondary"
              onClick={onAdminClick}
              className="hidden sm:flex items-center"
              data-testid="button-creator-studio"
            >
              <EditIcon className="h-4 w-4 mr-1.5" />
              Creator Studio
            </Button>
          )}
          <div className="text-right hidden sm:block">
            <span className="text-foreground font-medium" data-testid="text-user-name">{user.name}</span>
            <span className="block text-xs text-muted-foreground" data-testid="text-user-role">{user.role}</span>
          </div>
          <UserCircleIcon className="h-9 w-9 text-muted-foreground" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            aria-label="Logout"
            className="text-muted-foreground hover:text-destructive"
            data-testid="button-logout"
          >
            <LogOutIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
