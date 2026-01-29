import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { verifyOtp, sendOtp, pendingSignupData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get email from location state (passed from login or signup)
  const email = location.state?.email as string;
  const isSignup = location.state?.isSignup as boolean;

  useEffect(() => {
    // Redirect if no email in state
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;

    setIsLoading(true);
    const { error, isNewUser } = await verifyOtp(email, otp);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
      setOtp('');
    } else {
      toast({
        title: isSignup ? 'Account created!' : 'Welcome back!',
        description: isSignup ? 'Your account has been created successfully.' : 'You have been signed in.',
      });

      // Redirect based on context
      if (isSignup && pendingSignupData) {
        // New signup - redirect based on role
        if (pendingSignupData.role === 'coach') {
          navigate('/create-team');
        } else {
          navigate('/join-team');
        }
      } else {
        // Returning user - go to dashboard
        navigate('/');
      }
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    const { error } = await sendOtp(email);
    setIsResending(false);

    if (error) {
      toast({
        title: 'Failed to resend code',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Code sent!',
        description: 'A new verification code has been sent to your email.',
      });
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6) {
      handleVerify();
    }
  }, [otp]);

  if (!email) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-heading">Check your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to<br />
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              disabled={isLoading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button 
            onClick={handleVerify} 
            className="w-full" 
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Code
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Didn't receive the code?
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resend code
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Link 
            to={isSignup ? "/signup" : "/login"} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {isSignup ? 'signup' : 'login'}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
