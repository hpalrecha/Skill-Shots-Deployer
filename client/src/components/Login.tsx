import { useState } from 'react';
import { User } from '../types';
import { SkillShotsLogo, LoaderIcon, ArrowLeftIcon } from './icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginProps {
  onLogin: (userId: string) => void;
  users: User[];
}

export default function Login({ onLogin, users }: LoginProps) {
  const [email, setEmail] = useState('alex@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (user) {
        if (user.password && user.password === password) {
          onLogin(user.id);
        } else if (!user.password && password === 'password123') {
          onLogin(user.id);
        } else {
          throw new Error('Invalid password.');
        }
      } else {
        throw new Error('User not found.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSuccess('');
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = users.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase());

    setIsLoading(false);

    if (user) {
      setForgotSuccess(`A password reset link has been sent to ${forgotEmail}. Please check your inbox.`);
    } else {
      setError('We could not find an account with that email address.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full mx-auto">
        <div className="flex flex-col justify-center items-center mb-8">
          <SkillShotsLogo className="h-16 w-16 text-primary mb-3" />
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">SkillShots</h1>
          <p className="text-muted-foreground mt-2 font-medium">Quick Learning for Growth</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{isForgotPassword ? 'Reset Password' : 'Welcome Back'}</CardTitle>
            {isForgotPassword && (
              <CardDescription>Enter your email and we'll send you instructions.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isForgotPassword ? (
              <>
                {forgotSuccess ? (
                  <div className="bg-chart-2/10 border border-chart-2/30 text-chart-2 p-4 rounded-lg mb-6 text-center text-sm" data-testid="text-forgot-success">
                    {forgotSuccess}
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@example.com"
                        data-testid="input-forgot-email"
                      />
                    </div>

                    {error && <p className="text-sm text-center text-destructive" data-testid="text-error">{error}</p>}

                    <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-send-reset">
                      {isLoading ? <LoaderIcon className="animate-spin h-5 w-5" /> : 'Send Reset Link'}
                    </Button>
                  </form>
                )}

                <Button
                  variant="ghost"
                  onClick={() => { setIsForgotPassword(false); setForgotSuccess(''); setError(''); }}
                  className="w-full mt-4"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-1"/> Back to Login
                </Button>
              </>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="input-password"
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm p-0 h-auto"
                      data-testid="button-forgot-password"
                    >
                      Forgot your password?
                    </Button>
                  </div>

                  {error && <p className="text-sm text-center text-destructive" data-testid="text-login-error">{error}</p>}

                  <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-login">
                    {isLoading ? <LoaderIcon className="animate-spin h-5 w-5" /> : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground space-y-1">
                  <p>Default Admin: <code className="bg-muted px-1 rounded text-foreground">alex@example.com</code></p>
                  <p>Default Learner: <code className="bg-muted px-1 rounded text-foreground">sam@example.com</code></p>
                  <p>Default Password: <code className="bg-muted px-1 rounded text-foreground">password123</code></p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
