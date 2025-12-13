import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  BookOpen, 
  MessageSquare, 
  Trophy, 
  Users, 
  Building2, 
  Zap, 
  Target, 
  Shield, 
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface LicensePlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  maxUsers: number;
  maxCreators: number;
  maxCourses: number;
  maxStorageMb: number;
  maxTokensPerMonth: number;
  features: Record<string, boolean>;
  isActive: boolean;
}

export default function LandingPage() {
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/license-plans');
        if (response.ok) {
          const data = await response.json();
          const activePlans = data.filter((p: LicensePlan) => p.isActive);
          const uniquePlans = activePlans.reduce((acc: LicensePlan[], plan: LicensePlan) => {
            const existing = acc.find(p => p.name === plan.name);
            if (!existing || parseFloat(plan.priceMonthly) < parseFloat(existing.priceMonthly)) {
              return [...acc.filter(p => p.name !== plan.name), plan];
            }
            return acc;
          }, []);
          setPlans(uniquePlans.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Quiz Generation",
      description: "Automatically generate quizzes from your content using advanced AI. Save hours of manual work."
    },
    {
      icon: BookOpen,
      title: "Interactive Course Builder",
      description: "Create engaging micro-learning courses with text, videos, images, and documents."
    },
    {
      icon: MessageSquare,
      title: "AI Learning Assistant",
      description: "Built-in chatbot helps learners with questions and provides contextual assistance."
    },
    {
      icon: Trophy,
      title: "Gamified Leaderboards",
      description: "Boost engagement with points, rankings, and friendly competition among learners."
    },
    {
      icon: Users,
      title: "Team & Group Management",
      description: "Organize learners into groups and share content with specific teams."
    },
    {
      icon: Building2,
      title: "Multi-Tenant Architecture",
      description: "Complete data isolation between organizations with dedicated admin controls."
    }
  ];

  const useCases = [
    {
      icon: GraduationCap,
      title: "Employee Onboarding",
      description: "Get new hires up to speed quickly with structured learning paths and automatic progress tracking."
    },
    {
      icon: Shield,
      title: "Compliance Training",
      description: "Ensure regulatory compliance with trackable courses, certifications, and audit trails."
    },
    {
      icon: Target,
      title: "Skills Development",
      description: "Upskill your workforce with bite-sized learning modules they can complete on the go."
    },
    {
      icon: Zap,
      title: "Product Training",
      description: "Keep sales and support teams updated on product features with interactive courses."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SkillShots</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#use-cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Use Cases</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/login">
              <Button data-testid="button-signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              AI-Powered Learning Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Transform Your Corporate Training with{" "}
              <span className="text-primary">AI-Powered Learning</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              SkillShots is a modern micro-learning platform that helps organizations create, deliver, and track engaging training content with AI-generated quizzes and intelligent assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-hero-signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-hero-features">
                  Explore Features
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Modern Learning</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, manage, and deliver effective corporate training programs.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-sm hover-elevate" data-testid={`card-feature-${index}`}>
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Enterprise Use Cases</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From onboarding to compliance, SkillShots adapts to your training needs.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border shadow-sm" data-testid={`card-usecase-${index}`}>
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <useCase.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg mb-2">{useCase.title}</CardTitle>
                    <CardDescription>{useCase.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your organization. All plans include AI-powered features.
            </p>
          </div>
          {isLoadingPlans ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : plans.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <Card 
                  key={plan.id} 
                  className={`relative ${index === 1 ? 'border-primary shadow-lg scale-105' : 'border shadow-sm'}`}
                  data-testid={`card-pricing-${plan.id}`}
                >
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <span className="text-4xl font-bold">₹{plan.priceMonthly}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <ul className="space-y-3 text-sm text-left mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Up to {plan.maxUsers.toLocaleString()} users</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Up to {plan.maxCreators} creators</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Up to {plan.maxCourses} courses</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{plan.maxStorageMb >= 50000 ? 'Unlimited' : `${plan.maxStorageMb}MB`} storage</span>
                      </li>
                      {plan.features?.aiQuizGeneration && (
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span>AI Quiz Generation</span>
                        </li>
                      )}
                      {plan.features?.analytics && (
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span>Analytics Dashboard</span>
                        </li>
                      )}
                      {plan.features?.certificates && (
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span>Certificates</span>
                        </li>
                      )}
                    </ul>
                    <Link href="/login">
                      <Button className="w-full" variant={index === 1 ? "default" : "outline"} data-testid={`button-choose-${plan.id}`}>
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Contact us for custom pricing</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Training?</h2>
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Join organizations that are already using SkillShots to deliver engaging, AI-powered learning experiences.
              </p>
              <Link href="/login">
                <Button size="lg" variant="secondary" data-testid="button-cta-signup">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">SkillShots</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-Powered Corporate Learning Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
