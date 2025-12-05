import { useState } from 'react';
import { User, UserRole } from '../types';
import { SkillShotsLogo, LoaderIcon, ArrowLeftIcon } from './icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'Learner' | 'Creator'>('Learner');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
        groupIds: data.groupIds || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          role: registerRole,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onLogin({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
        groupIds: data.groupIds || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
    setIsLoading(false);
    setForgotSuccess(`If an account exists for ${forgotEmail}, a password reset link has been sent.`);
  };

  const resetForm = () => {
    setError('');
    setForgotSuccess('');
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
            <CardTitle>
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </CardTitle>
            {mode === 'register' && (
              <CardDescription>Join SkillShots to start learning</CardDescription>
            )}
            {mode === 'forgot' && (
              <CardDescription>Enter your email and we'll send you instructions.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {mode === 'forgot' ? (
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
                  onClick={() => { setMode('login'); resetForm(); }}
                  className="w-full mt-4"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-1"/> Back to Login
                </Button>
              </>
            ) : mode === 'register' ? (
              <>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      required
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="John Smith"
                      data-testid="input-register-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email Address</Label>
                    <Input
                      id="register-email"
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="you@example.com"
                      data-testid="input-register-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      required
                      minLength={6}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      data-testid="input-register-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-role">I am a</Label>
                    <Select value={registerRole} onValueChange={(value) => setRegisterRole(value as 'Learner' | 'Creator')}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Learner">Learner - I want to learn new skills</SelectItem>
                        <SelectItem value="Creator">Creator - I want to create courses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {error && <p className="text-sm text-center text-destructive" data-testid="text-register-error">{error}</p>}

                  <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-register">
                    {isLoading ? <LoaderIcon className="animate-spin h-5 w-5" /> : 'Create Account'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <span className="text-muted-foreground text-sm">Already have an account? </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setMode('login'); resetForm(); }}
                    className="text-sm p-0 h-auto text-primary"
                    data-testid="button-goto-login"
                  >
                    Sign in
                  </Button>
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleLogin} className="space-y-6">
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
                      placeholder="you@example.com"
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
                      placeholder="Your password"
                      data-testid="input-password"
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setMode('forgot'); resetForm(); }}
                      className="text-sm p-0 h-auto text-primary"
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

                <div className="mt-6 text-center">
                  <span className="text-muted-foreground text-sm">Don't have an account? </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setMode('register'); resetForm(); }}
                    className="text-sm p-0 h-auto text-primary"
                    data-testid="button-goto-register"
                  >
                    Sign up
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
