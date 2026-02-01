import { useState } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GenerateParentCodeDialog } from '@/components/athletes/GenerateParentCodeDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentAthlete } from '@/hooks/useCurrentAthlete';

export function ParentAccessCard() {
  const { currentTeam, profile } = useAuth();
  const { data: currentAthlete, isLoading } = useCurrentAthlete(currentTeam?.id);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading || !currentAthlete) {
    return null;
  }

  const athleteName = `${profile?.first_name} ${profile?.last_name}`;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Parent Access
          </CardTitle>
          <CardDescription>
            Give your parent or guardian view-only access to your workouts and results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setDialogOpen(true)} variant="outline" className="w-full">
            Generate Parent Code
          </Button>
        </CardContent>
      </Card>

      <GenerateParentCodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teamAthleteId={currentAthlete.id}
        athleteName={athleteName}
      />
    </>
  );
}
