import { useLocation } from 'wouter';
import { User } from '../types';
import { SkillShotsLogo, ClipboardListIcon, EditIcon, LogOutIcon, UserCircleIcon } from './icons';
import { Home, BookOpen, Crown, Building2, Settings, Users } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

interface AppSidebarProps {
  user: User;
  onLogout: () => void;
}

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const role = user.role as string;
  const isSuperAdmin = role === 'SuperAdmin';
  const isOrgAdmin = role === 'OrgAdmin';
  const isAdmin = role === 'Admin' || isOrgAdmin;
  const isCreator = role === 'Creator';
  const canAccessCreator = isCreator || isAdmin || isOrgAdmin;

  const mainNavItems = [
    {
      title: 'Home',
      url: '/',
      icon: Home,
    },
    {
      title: 'Courses',
      url: '/courses',
      icon: BookOpen,
    },
    {
      title: 'SOPs',
      url: '/sops',
      icon: ClipboardListIcon,
    },
  ];

  const adminNavItems = [];

  if (isSuperAdmin) {
    adminNavItems.push({
      title: 'Platform Admin',
      url: '/superadmin',
      icon: Crown,
    });
  }

  if (isOrgAdmin) {
    adminNavItems.push({
      title: 'Organization Admin',
      url: '/orgadmin',
      icon: Building2,
    });
  }

  if (canAccessCreator && !isSuperAdmin) {
    adminNavItems.push({
      title: isAdmin ? 'Admin Portal' : 'Creator Studio',
      url: isAdmin ? '/admin' : '/creatorstudio',
      icon: isAdmin ? Settings : EditIcon,
    });
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => setLocation('/')}
          data-testid="sidebar-logo"
        >
          <SkillShotsLogo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-foreground">SkillShots</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <a onClick={() => setLocation(item.url)} className="cursor-pointer">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminNavItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <a onClick={() => setLocation(item.url)} className="cursor-pointer">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <UserCircleIcon className="h-9 w-9 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="sidebar-user-name">
              {user.name}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="sidebar-user-role">
              {user.role}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            aria-label="Logout"
            className="text-muted-foreground flex-shrink-0"
            data-testid="button-logout"
          >
            <LogOutIcon className="h-5 w-5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
