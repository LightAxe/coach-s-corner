import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Shield, Users, LogOut, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExportDataDialog } from './ExportDataDialog';

const roleIcons = {
  coach: Shield,
  athlete: User,
  parent: Users,
};

export function RoleSwitcher() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  if (!profile) return null;

  const Icon = roleIcons[profile.role] || User;
  const displayName = `${profile.first_name} ${profile.last_name}`;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline truncate max-w-[120px]">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {profile.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Download Your Data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ExportDataDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
    </DropdownMenu>
  );
}
