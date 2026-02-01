import { useState } from 'react';
import { Download, Loader2, FileJson, FileArchive } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useExportData, ExportFormat } from '@/hooks/useExportData';
import { useAuth } from '@/contexts/AuthContext';

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDataDialog({ open, onOpenChange }: ExportDataDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [format, setFormat] = useState<ExportFormat>('json');
  const exportData = useExportData();

  const handleExport = async () => {
    try {
      await exportData.mutateAsync({ format });
      toast({
        title: 'Export complete',
        description: 'Your data has been downloaded.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: 'destructive',
      });
    }
  };

  const getDataDescription = () => {
    switch (profile?.role) {
      case 'coach':
        return 'Your profile, teams, athletes, workouts, race results, announcements, and audit logs.';
      case 'parent':
        return 'Your profile and your linked children\'s workout logs and race results.';
      default:
        return 'Your profile, team memberships, workout logs, and race results.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Your Data
          </DialogTitle>
          <DialogDescription>
            Export a copy of your Training Hub data. This includes: {getDataDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="json" id="json" className="mt-0.5" />
                <Label htmlFor="json" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">JSON</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Single file with all your data in a structured format. Best for developers or data processing.
                  </p>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="csv" id="csv" className="mt-0.5" />
                <Label htmlFor="csv" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">CSV (Zip)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Multiple CSV files in a ZIP archive. Best for viewing in spreadsheet apps like Excel.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={exportData.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportData.isPending}
              className="flex-1"
            >
              {exportData.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
