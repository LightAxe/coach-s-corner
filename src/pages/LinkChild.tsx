import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2, UserPlus, CheckCircle, Unlink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLinkedChildren, useRedeemParentCode, useUnlinkChild } from '@/hooks/useParentData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function LinkChild() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [code, setCode] = useState('');
  
  const { data: linkedChildren = [], isLoading } = useLinkedChildren();
  const redeemCode = useRedeemParentCode();
  const unlinkChild = useUnlinkChild();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: 'Code required',
        description: 'Please enter the parent link code.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await redeemCode.mutateAsync(code.trim().toUpperCase());
      toast({
        title: 'Success!',
        description: 'You are now linked to your child\'s account.',
      });
      setCode('');
      
      // If this is their first child, redirect to dashboard
      if (linkedChildren.length === 0) {
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: 'Invalid code',
        description: error.message || 'The code is invalid, expired, or already used.',
        variant: 'destructive',
      });
    }
  };

  const hasChildren = linkedChildren.length > 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Link2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-heading font-bold">
            {hasChildren ? 'Add Another Child' : 'Link to Your Child'}
          </h1>
          <p className="text-muted-foreground">
            Enter the code provided by your child's coach or athlete
          </p>
        </div>

        {/* Linked Children */}
        {hasChildren && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Linked Children
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {linkedChildren.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {child.team_athlete.first_name} {child.team_athlete.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {child.team_athlete.teams?.name || 'Team'}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unlink from {child.team_athlete.first_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will no longer be able to view {child.team_athlete.first_name}'s workouts and results.
                          You can re-link later with a new code.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            unlinkChild.mutate(child.id, {
                              onSuccess: () => {
                                toast({
                                  title: 'Unlinked',
                                  description: `You are no longer linked to ${child.team_athlete.first_name}.`,
                                });
                              },
                              onError: (error: any) => {
                                toast({
                                  title: 'Failed to unlink',
                                  description: error.message,
                                  variant: 'destructive',
                                });
                              },
                            });
                          }}
                        >
                          Unlink
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Enter Code Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {hasChildren ? 'Add Another Child' : 'Enter Link Code'}
            </CardTitle>
            <CardDescription>
              The 6-character code can be generated by the coach or your child (if they have an account).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Parent Link Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-character code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-widest uppercase"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={redeemCode.isPending || code.length < 6}
              >
                {redeemCode.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  'Link to Child'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Continue to Dashboard (only if they have children) */}
        {hasChildren && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/')}
          >
            Continue to Dashboard
          </Button>
        )}

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground">
          Don't have a code? Contact your child's coach to get one.
        </p>
      </div>
    </div>
  );
}
