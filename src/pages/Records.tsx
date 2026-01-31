import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function Records() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Records</h1>
          <p className="text-muted-foreground">Personal and season records for your team</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Records will be populated from race results. Add races to the calendar and enter results to see personal records (PRs) and season records (SRs) here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
