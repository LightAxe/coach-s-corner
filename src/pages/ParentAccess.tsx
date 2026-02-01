import { useState } from 'react';
import { format } from 'date-fns';
import { Users, Copy, Check, Loader2, Trash2, UserCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentAthlete } from '@/hooks/useCurrentAthlete';
import { 
  useGenerateParentCode, 
  useParentCodes, 
  useDeleteParentCode,
  useLinkedParents 
} from '@/hooks/useParentData';

export default function ParentAccess() {
  const { currentTeam, profile } = useAuth();
  const { toast } = useToast();
  const { data: currentAthlete, isLoading: athleteLoading } = useCurrentAthlete(currentTeam?.id);
  
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const teamAthleteId = currentAthlete?.id;
  const { data: existingCodes = [], isLoading: codesLoading } = useParentCodes(teamAthleteId);
  const { data: linkedParents = [], isLoading: parentsLoading } = useLinkedParents(teamAthleteId);
  const generateCode = useGenerateParentCode();
  const deleteCode = useDeleteParentCode();

  const handleGenerate = async () => {
    if (!teamAthleteId) return;
    
    try {
      const code = await generateCode.mutateAsync(teamAthleteId);
      setGeneratedCode(code);
      toast({
        title: 'Code generated',
        description: 'Share this code with your parent to give them access.',
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
    if (!teamAthleteId) return;
    
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

  if (athleteLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!currentAthlete) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Parent Access</h1>
            <p className="text-muted-foreground">
              Your athlete profile is not yet linked to this team.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Parent Access</h1>
          <p className="text-muted-foreground">
            Give your parent or guardian view-only access to your workouts and results.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Generate Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Generate Access Code
              </CardTitle>
              <CardDescription>
                Create a code for your parent to link their account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <li>Share this code with your parent</li>
                  <li>They create an account and select "Parent" role</li>
                  <li>They enter the code to link to your profile</li>
                  <li>They can view (read-only) your workouts and results</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Linked Parents Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Linked Parents
              </CardTitle>
              <CardDescription>
                Parents who have access to view your training data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : linkedParents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No parents linked yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate a code and share it with your parent to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedParents.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {link.parent?.first_name} {link.parent?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Linked {format(new Date(link.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span>Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

