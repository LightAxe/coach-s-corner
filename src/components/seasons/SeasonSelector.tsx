import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSeasons, useActiveSeason, useSetActiveSeason, useCreateSeason } from '@/hooks/useSeasons';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SeasonSelector() {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  
  const { currentTeam, user, isCoach } = useAuth();
  const { data: seasons = [] } = useSeasons(currentTeam?.id);
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  const setActiveSeason = useSetActiveSeason();
  const createSeason = useCreateSeason();

  const handleSelectSeason = async (seasonId: string) => {
    if (!currentTeam) return;
    
    try {
      await setActiveSeason.mutateAsync({ 
        seasonId, 
        teamId: currentTeam.id 
      });
      setOpen(false);
      toast.success('Season changed');
    } catch (error) {
      toast.error('Failed to change season');
    }
  };

  const handleCreateSeason = async () => {
    if (!currentTeam || !user || !newSeasonName.trim()) return;
    
    try {
      await createSeason.mutateAsync({
        team_id: currentTeam.id,
        name: newSeasonName.trim(),
        created_by: user.id,
        is_active: seasons.length === 0, // Make active if first season
      });
      setNewSeasonName('');
      setCreateDialogOpen(false);
      toast.success('Season created');
    } catch (error) {
      toast.error('Failed to create season');
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full"
          >
            <span className="truncate">
              {activeSeason?.name || 'Select season...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search seasons..." />
            <CommandList>
              <CommandEmpty>No seasons found.</CommandEmpty>
              <CommandGroup>
                {seasons.map((season) => (
                  <CommandItem
                    key={season.id}
                    value={season.name}
                    onSelect={() => handleSelectSeason(season.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        activeSeason?.id === season.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {season.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              {isCoach && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create new season
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="season-name">Season Name</Label>
              <Input
                id="season-name"
                placeholder="e.g., Fall 2024, Spring 2025"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSeason}
              disabled={!newSeasonName.trim() || createSeason.isPending}
            >
              Create Season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
