import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Shield, Users } from 'lucide-react';

const roleConfig: Record<UserRole, { label: string; icon: typeof User }> = {
  coach: { label: 'Coach', icon: Shield },
  athlete: { label: 'Athlete', icon: User },
  parent: { label: 'Parent', icon: Users },
};

export function RoleSwitcher() {
  const { user, setMockRole } = useAuth();
  const currentRole = user?.role || 'coach';
  const CurrentIcon = roleConfig[currentRole].icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{roleConfig[currentRole].label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Demo: Switch Role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(roleConfig) as UserRole[]).map((role) => {
          const Icon = roleConfig[role].icon;
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => setMockRole(role)}
              className={currentRole === role ? 'bg-muted' : ''}
            >
              <Icon className="h-4 w-4 mr-2" />
              {roleConfig[role].label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
