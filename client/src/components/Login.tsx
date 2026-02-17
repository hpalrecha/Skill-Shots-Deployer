import { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { SkillShotsLogo, LoaderIcon, ArrowLeftIcon } from './icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

interface LicensePlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: string;
  maxUsers: number;
  maxCreators: number;
  maxCourses: number;
  isActive: boolean;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register-org' | 'forgot' | 'register-success'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  
  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  useEffect(() => {
    if (mode === 'register-org') {
      fetchPlans();
    }
  }, [mode]);

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const response = await fetch('/api/license-plans');
      if (response.ok) {
        const data = await response.json();
        const activePlans = data.filter((p: LicensePlan) => p.isActive);
        setPlans(activePlans);
        if (activePlans.length > 0 && !selectedPlanId) {
          setSelectedPlanId(activePlans[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setIsLoadingPlans(false);
    }
  };

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
        department: data.department || undefined,
        organizationId: data.organizationId || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          adminName: adminName,
          adminEmail: adminEmail,
          password: adminPassword,
          planId: selectedPlanId,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setMode('register-success');
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

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setForgotSuccess(data.message || `If an account exists for ${forgotEmail}, a password reset link has been sent.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setError('');
    setForgotSuccess('');
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

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
              {mode === 'register-org' && 'Register Your Organization'}
              {mode === 'register-success' && 'Registration Submitted'}
              {mode === 'forgot' && 'Reset Password'}
            </CardTitle>
            {mode === 'register-org' && (
              <CardDescription>Set up your organization to start training your team</CardDescription>
            )}
            {mode === 'forgot' && (
              <CardDescription>Enter your email and we'll send you instructions.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {mode === 'register-success' ? (
              <div className="text-center py-4">
                <div className="mx-auto w-16 h-16 bg-chart-2/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-chart-2" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Thank You for Registering!</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Your organization registration has been submitted for review. Our team will review your application and activate your account shortly. You'll receive an email once your account is ready.
                </p>
                <Button
                  onClick={() => { setMode('login'); resetForm(); }}
                  className="w-full"
                  data-testid="button-back-to-login-success"
                >
                  Back to Login
                </Button>
              </div>
            ) : mode === 'forgot' ? (
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
            ) : mode === 'register-org' ? (
              <>
                <form onSubmit={handleRegisterOrganization} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="org-name"
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Corporation"
                        className="pl-10"
                        data-testid="input-org-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Administrator Name</Label>
                    <Input
                      id="admin-name"
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="John Smith"
                      data-testid="input-admin-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Administrator Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@yourcompany.com"
                      data-testid="input-admin-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      required
                      minLength={6}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      data-testid="input-admin-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan">Select a Plan</Label>
                    {isLoadingPlans ? (
                      <div className="flex items-center justify-center py-4">
                        <LoaderIcon className="animate-spin h-5 w-5 text-muted-foreground" />
                      </div>
                    ) : plans.length > 0 ? (
                      <>
                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                          <SelectTrigger data-testid="select-plan">
                            <SelectValue placeholder="Choose a plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name} - ₹{plan.priceMonthly}/month
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedPlan && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Up to {selectedPlan.maxUsers} users, {selectedPlan.maxCreators} creators, {selectedPlan.maxCourses} courses
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No plans available. Contact support.</p>
                    )}
                  </div>

                  {error && <p className="text-sm text-center text-destructive" data-testid="text-register-error">{error}</p>}

                  <Button type="submit" disabled={isLoading || !selectedPlanId} className="w-full" data-testid="button-register-org">
                    {isLoading ? <LoaderIcon className="animate-spin h-5 w-5" /> : 'Register Organization'}
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
                  <span className="text-muted-foreground text-sm">Want to register your organization? </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setMode('register-org'); resetForm(); }}
                    className="text-sm p-0 h-auto text-primary"
                    data-testid="button-goto-register"
                  >
                    Get Started
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
