import { useState, useEffect } from 'react';
import { User, Mail, Phone, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';

export default function AccountSettings() {
  const { profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form values when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Track if there are unsaved changes
  useEffect(() => {
    if (!profile) return;
    const changed =
      firstName !== profile.first_name ||
      lastName !== profile.last_name ||
      email !== (profile.email || '') ||
      phone !== (profile.phone || '');
    setHasChanges(changed);
  }, [firstName, lastName, email, phone, profile]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'First name and last name are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateProfile.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to update profile',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-heading font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal information and account preferences.
          </p>
        </div>

        {authLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your name and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is for display purposes. Login uses a separate email verification.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    maxLength={20}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || updateProfile.isPending}
                  >
                    {updateProfile.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                  {hasChanges && (
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={updateProfile.isPending}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Info (read-only) */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>
                  Information about your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <Badge variant="secondary" className="capitalize">
                    {profile.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Member since</span>
                  <span className="text-sm">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  To change your role or delete your account, please contact support.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              Unable to load profile information.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
