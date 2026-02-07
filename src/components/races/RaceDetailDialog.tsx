import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, MapPin, Bus, ExternalLink, Calendar, ClipboardList, Trash2, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { RaceResultsForm } from './RaceResultsForm';
import { EditRaceDialog } from './EditRaceDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteRace } from '@/hooks/useRaces';
import { useDistances } from '@/hooks/useDistances';
import { toast } from 'sonner';
import type { RaceWithDistance } from '@/lib/types';

interface RaceDetailDialogProps {
  race: RaceWithDistance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RaceDetailDialog({ race, open, onOpenChange }: RaceDetailDialogProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { isCoach } = useAuth();
  const deleteRace = useDeleteRace();
  const { data: distances = [] } = useDistances();

  if (!race) return null;

  // Use race's own distance if set, otherwise fall back to first available
  const defaultDistanceId = race.distance_id || distances[0]?.id || '';

  const handleDelete = async () => {
    try {
      await deleteRace.mutateAsync({ id: race.id, team_id: race.team_id });
      toast.success('Race deleted');
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete race');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  {race.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(race.race_date), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {race.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{race.location}</p>
                  </div>
                </div>
              )}

              {race.transportation_info && (
                <div className="flex items-start gap-3">
                  <Bus className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Transportation</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{race.transportation_info}</p>
                  </div>
                </div>
              )}

              {race.details && (
                <div className="flex items-start gap-3">
                  <ClipboardList className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Details</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{race.details}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {race.map_link && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={race.map_link} target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-4 w-4 mr-1" />
                      Course Map
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
                {race.results_link && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={race.results_link} target="_blank" rel="noopener noreferrer">
                      <ClipboardList className="h-4 w-4 mr-1" />
                      Official Results
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>

              {isCoach && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Race
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Race
                  </Button>
                </div>
              )}

              <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Race</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{race.name}"? All results associated with this race will also be deleted. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Race
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>

            <TabsContent value="results" className="mt-4">
              <RaceResultsForm 
                raceId={race.id} 
                teamId={race.team_id}
                defaultDistanceId={defaultDistanceId}
                onSaved={() => {}}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EditRaceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        race={race}
      />
    </>
  );
}
