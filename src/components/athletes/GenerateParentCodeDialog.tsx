import { useState } from 'react';
import { Copy, Check, Loader2, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useGenerateParentCode, useParentCodes, useDeleteParentCode } from '@/hooks/useParentData';

interface GenerateParentCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamAthleteId: string;
  athleteName: string;
}

export function GenerateParentCodeDialog({
  open,
  onOpenChange,
  teamAthleteId,
  athleteName,
}: GenerateParentCodeDialogProps) {
  const { toast } = useToast();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: existingCodes = [], isLoading: codesLoading } = useParentCodes(teamAthleteId);
  const generateCode = useGenerateParentCode();
  const deleteCode = useDeleteParentCode();

  const handleGenerate = async () => {
    try {
      const code = await generateCode.mutateAsync(teamAthleteId);
      setGeneratedCode(code);
      toast({
        title: 'Code generated',
        description: 'Share this code with the parent to give them access.',
      });
    } catch (error: any) {
      toast({
        title: 'Error generating code',
        description: error.message || 'Failed to generate parent code',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Code copied to clipboard.',
    });
  };

  const handleDelete = async (codeId: string) => {
    try {
      await deleteCode.mutateAsync({ codeId, teamAthleteId });
      toast({
        title: 'Code deleted',
        description: 'The parent link code has been removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete code',
        variant: 'destructive',
      });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setGeneratedCode(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Parent Access Code
          </DialogTitle>
          <DialogDescription>
            Generate a code for {athleteName}'s parent to link their account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Newly Generated Code */}
          {generatedCode && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">New code generated:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-2xl font-mono font-bold tracking-wider text-primary">
                  {generatedCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(generatedCode)}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This code expires in 30 days and can only be used once.
              </p>
            </div>
          )}

          {/* Existing Unused Codes */}
          {existingCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active codes:</p>
              {existingCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                >
                  <div>
                    <code className="font-mono font-bold tracking-wider">
                      {code.code}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      Expires {format(new Date(code.expires_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(code.code)}
                      className="h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(code.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generateCode.isPending}
            className="w-full"
          >
            {generateCode.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate New Code'
            )}
          </Button>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
            <p className="font-medium">How it works:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Share this code with the athlete's parent</li>
              <li>Parent creates an account and selects "Parent" role</li>
              <li>Parent enters the code to link to their child</li>
              <li>Parent can view (read-only) their child's workouts and results</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
