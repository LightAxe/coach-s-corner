import { useState } from 'react';
import { Copy, Check, ExternalLink, CalendarSync } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCalendarFeedToken,
  getCalendarFeedUrl,
  getWebcalUrl,
  getGoogleCalendarSubscribeUrl,
} from '@/hooks/useCalendarFeed';

interface CalendarSubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarSubscribeDialog({ open, onOpenChange }: CalendarSubscribeDialogProps) {
  const { currentTeam } = useAuth();
  const { data: token, isLoading } = useCalendarFeedToken(currentTeam?.id);
  const [include, setInclude] = useState<'races' | 'workouts' | 'all'>('races');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!token) return;
    const url = getCalendarFeedUrl(token, include);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const feedUrl = token ? getCalendarFeedUrl(token, include) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to Calendar</DialogTitle>
          <DialogDescription>
            Add your team's schedule to Google Calendar, Apple Calendar, or any calendar app.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : !token ? (
          <div className="py-6 space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              Calendar sync needs to be set up for this team. The team's calendar feed token
              hasn't been generated yet.
            </p>
            <p className="text-xs text-muted-foreground">
              This will be configured automatically in a future update.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">What to include</Label>
              <RadioGroup
                value={include}
                onValueChange={(val) => setInclude(val as 'races' | 'workouts' | 'all')}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="races" id="races" />
                  <Label htmlFor="races" className="font-normal cursor-pointer">Races only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="workouts" id="workouts" />
                  <Label htmlFor="workouts" className="font-normal cursor-pointer">Workouts only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">Everything</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Feed URL with copy */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Feed URL</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md truncate block">
                  {feedUrl}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Quick-add buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick add</Label>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  asChild
                >
                  <a
                    href={getGoogleCalendarSubscribeUrl(token, include)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Add to Google Calendar
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  asChild
                >
                  <a href={getWebcalUrl(token, include)}>
                    <CalendarSync className="h-4 w-4" />
                    Add to Apple Calendar
                  </a>
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Your calendar app will periodically refresh this feed. Google Calendar updates
              roughly every 24 hours; Apple Calendar refreshes more frequently.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
