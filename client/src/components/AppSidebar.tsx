import { useLocation } from 'wouter';
import { User } from '../types';
import { SkillShotsLogo, ClipboardListIcon, EditIcon, LogOutIcon, UserCircleIcon } from './icons';
import { Home, BookOpen, Crown, Building2, Settings, Users, CheckCircle, CreditCard, Cpu, Key, LayoutDashboard, BarChart3 } from 'lucide-react';
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

  const superAdminSubItems = isSuperAdmin ? [
    {
      title: 'Pending Approvals',
      url: '/superadmin/approvals',
      icon: CheckCircle,
    },
    {
      title: 'Organizations',
      url: '/superadmin/organizations',
      icon: Building2,
    },
    {
      title: 'License Plans',
      url: '/superadmin/plans',
      icon: CreditCard,
    },
    {
      title: 'AI Usage',
      url: '/superadmin/ai-usage',
      icon: Cpu,
    },
    {
      title: 'AI Settings',
      url: '/superadmin/ai-settings',
      icon: Key,
    },
  ] : [];

  const orgAdminSubItems = isOrgAdmin ? [
    {
      title: 'Overview',
      url: '/orgadmin/overview',
      icon: LayoutDashboard,
    },
    {
      title: 'Members',
      url: '/orgadmin/members',
      icon: Users,
    },
    {
      title: 'License',
      url: '/orgadmin/license',
      icon: CreditCard,
    },
    {
      title: 'AI Usage',
      url: '/orgadmin/ai-usage',
      icon: Cpu,
    },
    {
      title: 'AI Settings',
      url: '/orgadmin/ai-settings',
      icon: Key,
    },
  ] : [];

  const creatorSubItems = canAccessCreator && !isSuperAdmin ? [
    {
      title: 'Courses',
      url: isAdmin ? '/admin/courses' : '/creatorstudio/courses',
      icon: BookOpen,
    },
    {
      title: 'Users',
      url: isAdmin ? '/admin/users' : '/creatorstudio/users',
      icon: Users,
    },
    {
      title: 'Settings',
      url: isAdmin ? '/admin/settings' : '/creatorstudio/settings',
      icon: Settings,
    },
    {
      title: 'Analytics',
      url: isAdmin ? '/admin/analytics' : '/creatorstudio/analytics',
      icon: BarChart3,
    },
  ] : [];

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

        {superAdminSubItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Platform Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {superAdminSubItems.map((item) => (
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

        {orgAdminSubItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Organization Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {orgAdminSubItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url}
                        data-testid={`nav-orgadmin-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
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

        {creatorSubItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{isAdmin ? 'Admin Portal' : 'Creator Studio'}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {creatorSubItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url}
                        data-testid={`nav-creator-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
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
