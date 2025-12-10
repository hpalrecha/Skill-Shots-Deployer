import { useLocation } from 'wouter';
import { User, UserRole } from '../types';
import { SkillShotsLogo, UserCircleIcon, LogOutIcon, EditIcon, ClipboardListIcon, BrainIcon } from './icons';
import { Button } from '@/components/ui/button';
import { BookOpen, Crown, Building2 } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  currentRoute: string;
}

export default function Header({ user, onLogout, currentRoute }: HeaderProps) {
  const [, setLocation] = useLocation();
  const role = user.role as string;
  const isSuperAdmin = role === 'SuperAdmin';
  const isOrgAdmin = role === 'OrgAdmin';
  const isAdmin = role === 'Admin' || isOrgAdmin;
  const isCreator = role === 'Creator';
  const canAccessAdmin = isAdmin || isCreator;

  const isOnAdminRoute = currentRoute === '/admin';
  const isOnCreatorRoute = currentRoute === '/creatorstudio';
  const isOnSuperAdminRoute = currentRoute === '/superadmin';
  const isOnCoursesRoute = currentRoute === '/courses';
  const isOnSopsRoute = currentRoute === '/sops';
  const isOnManagementRoute = isOnAdminRoute || isOnCreatorRoute || isOnSuperAdminRoute;

  const getAdminButtonLabel = () => {
    if (isAdmin) {
      return isOnManagementRoute ? "Back to Home" : "Admin Portal";
    }
    return isOnManagementRoute ? "Back to Home" : "Creator Studio";
  };

  const handleAdminClick = () => {
    if (isOnManagementRoute) {
      setLocation('/');
    } else {
      setLocation(isAdmin ? '/admin' : '/creatorstudio');
    }
  };

  const handleLogoClick = () => {
    setLocation('/');
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={handleLogoClick} data-testid="link-home">
            <SkillShotsLogo className="h-9 w-9 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight hidden sm:block">SkillShots</h1>
          </div>
          
          <nav className="flex items-center gap-1">
            <Button
              variant={currentRoute === '/' ? "default" : "ghost"}
              size="sm"
              onClick={() => setLocation('/')}
              data-testid="nav-home"
            >
              Home
            </Button>
            <Button
              variant={isOnCoursesRoute ? "default" : "ghost"}
              size="sm"
              onClick={() => setLocation('/courses')}
              data-testid="nav-courses"
            >
              <BookOpen className="h-4 w-4 mr-1.5 hidden sm:block" />
              Courses
            </Button>
            <Button
              variant={isOnSopsRoute ? "default" : "ghost"}
              size="sm"
              onClick={() => setLocation('/sops')}
              data-testid="nav-sops"
            >
              <ClipboardListIcon className="h-4 w-4 mr-1.5 hidden sm:block" />
              SOPs
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {isSuperAdmin && (
            <Button
              variant={isOnSuperAdminRoute ? "default" : "secondary"}
              onClick={() => setLocation(isOnSuperAdminRoute ? '/' : '/superadmin')}
              className="hidden sm:flex items-center"
              data-testid="button-superadmin-portal"
            >
              <Crown className="h-4 w-4 mr-1.5" />
              {isOnSuperAdminRoute ? "Back to Home" : "Platform Admin"}
            </Button>
          )}
          {isOrgAdmin && (
            <Button
              variant={currentRoute === '/orgadmin' ? "default" : "secondary"}
              onClick={() => setLocation(currentRoute === '/orgadmin' ? '/' : '/orgadmin')}
              className="hidden sm:flex items-center"
              data-testid="button-orgadmin-portal"
            >
              <Building2 className="h-4 w-4 mr-1.5" />
              {currentRoute === '/orgadmin' ? "Back to Home" : "Org Admin"}
            </Button>
          )}
          {canAccessAdmin && !isSuperAdmin && !isOrgAdmin && (
            <Button
              variant={isOnManagementRoute ? "default" : "secondary"}
              onClick={handleAdminClick}
              className="hidden sm:flex items-center"
              data-testid="button-admin-portal"
            >
              {isAdmin ? (
                <>
                  <ClipboardListIcon className="h-4 w-4 mr-1.5" />
                  {getAdminButtonLabel()}
                </>
              ) : (
                <>
                  <EditIcon className="h-4 w-4 mr-1.5" />
                  {getAdminButtonLabel()}
                </>
              )}
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
