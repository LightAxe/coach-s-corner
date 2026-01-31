import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, MapPin, Bus, ExternalLink, Calendar, Ruler, ClipboardList, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { RaceResultsForm } from './RaceResultsForm';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteRace } from '@/hooks/useRaces';
import { toast } from 'sonner';
import type { RaceWithDistance } from '@/lib/types';

interface RaceDetailDialogProps {
  race: RaceWithDistance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RaceDetailDialog({ race, open, onOpenChange }: RaceDetailDialogProps) {
  const { isCoach } = useAuth();
  const deleteRace = useDeleteRace();

  if (!race) return null;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this race? All results will also be deleted.')) {
      return;
    }

    try {
      await deleteRace.mutateAsync({ id: race.id, team_id: race.team_id });
      toast.success('Race deleted');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete race');
    }
  };

  return (
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
            <Badge variant="secondary" className="shrink-0">
              <Ruler className="h-3 w-3 mr-1" />
              {race.distances.name}
            </Badge>
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
              <div className="pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Race
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-4">
            <RaceResultsForm 
              raceId={race.id} 
              teamId={race.team_id}
              defaultDistanceId={race.distance_id}
              onSaved={() => {}}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
