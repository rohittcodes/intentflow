"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Zap, Shield, CreditCard, ArrowRight, Activity, HelpCircle, Star, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function BillingPage() {
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useUser();

  const workspaces = useQuery(api.workspaces.getWorkspaces);
  const activeWorkspace = workspaces?.find(w => w._id === activeWorkspaceId);
  const usage = useQuery(api.usage.checkUsageLimit, { userId: user?.id || "" });

  const updateTier = useMutation(api.workspaces.updatePricingTier);

  const handleUpgrade = async (tier: "pro" | "enterprise") => {
    if (!activeWorkspaceId) return;
    try {
      await updateTier({ workspaceId: activeWorkspaceId, tier });
      toast.success(`Success! Your workspace is now on the ${tier} plan.`);
    } catch (error) {
      toast.error("Failed to upgrade tier. Please try again.");
    }
  };

  const plans = [
    {
      name: "Starter",
      tier: "free",
      price: "$0",
      description: "Perfect for hobbyists and exploration.",
      features: ["3 Projects", "5 Workflows per project", "2 Knowledge Bases", "50 AI Executions / mo"],
      icon: Zap,
      color: "from-blue-500/10 to-blue-500/20",
      borderColor: "border-blue-500/20",
    },
    {
      name: "Professional",
      tier: "pro",
      price: "$29",
      description: "For professionals needing more power.",
      features: ["20 Projects", "50 Workflows per project", "10 Knowledge Bases", "1,000 AI Executions / mo", "Priority Support"],
      icon: Shield,
      color: "from-primary/10 to-primary/20",
      borderColor: "border-primary/30",
      popular: true,
      glow: "shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)]",
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      price: "Custom",
      description: "Scale with confidence and infinite resources.",
      features: ["999 Projects", "999 Workflows", "999 Knowledge Bases", "Unlimited Executions", "Dedicated Support"],
      icon: CreditCard,
      color: "from-amber-500/10 to-amber-500/20",
      borderColor: "border-amber-500/20",
    },
  ];

  const comparisonFeatures = [
    { name: "Total Projects", free: "3", pro: "20", enterprise: "Unlimited" },
    { name: "Workflows / Project", free: "5", pro: "50", enterprise: "999+" },
    { name: "Knowledge Bases", free: "2", pro: "10", enterprise: "Unlimited" },
    { name: "AI Executions", free: "50 / mo", pro: "1,000 / mo", enterprise: "Unlimited" },
    { name: "Team Members", free: "1", pro: "5", enterprise: "Unlimited" },
    { name: "API Access", free: false, pro: true, enterprise: true },
    { name: "Custom Domain", free: false, pro: true, enterprise: true },
    { name: "Support", free: "Community", pro: "Priority", enterprise: "24/7 Dedicated" },
  ];

  const faqs = [
    { q: "Can I cancel my subscription at any time?", a: "Yes, you can cancel your subscription at any time from your settings. You'll retain access to your plan features until the end of your billing cycle." },
    { q: "What happens if I exceed my execution limit?", a: "On the Free plan, executions will be paused until the next cycle. Pro users can purchase additional execution credits or upgrade to Enterprise for unlimited usage." },
    { q: "Do you offer discounts for non-profits?", a: "Absolutely! Contact our support team with your non-profit documentation, and we'll provide a custom discount code for your workspace." },
  ];

  const currentTier = activeWorkspace?.pricingTier || "free";

  return (
    <div className="w-full pb-20 space-y-16">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-tighter text-[10px]">
          Pricing & Plans
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">
          Manage your <span className="text-primary">Plan</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto font-medium">
          Choose the plan that's right for your workspace. Scale your agentic workflows with ease.
        </p>
      </motion.div>

      {/* Usage Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 bg-muted/5 overflow-hidden">
          <CardHeader className="pb-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/10">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Workspace Usage</CardTitle>
                  <CardDescription className="text-xs font-medium">Monitoring your current billing cycle</CardDescription>
                </div>
              </div>
              <Badge className="px-3 py-1 rounded-lg font-bold text-[10px] tracking-tight bg-primary hover:bg-primary shadow-sm">
                {currentTier.toUpperCase()} ACTIVE
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Zap className="h-3 w-3 text-orange-400" /> AI Executions
                  </span>
                  <span className="font-mono font-black text-sm">
                    {usage?.current || 0} <span className="text-muted-foreground font-medium opacity-50">/</span> {usage?.limit || 50}
                  </span>
                </div>
                <Progress value={((usage?.current || 0) / (usage?.limit || 1)) * 100} className="h-3 bg-muted/50 rounded-full" />
                <p className="text-[10px] text-muted-foreground font-medium italic opacity-70">
                  * Usage resets on April 10, 2026. You're currently at {Math.round(((usage?.current || 0) / (usage?.limit || 1)) * 100)}% capacity.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 justify-end">
                <div className="px-4 py-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold tracking-tight text-muted-foreground">All-time Runs</span>
                  <span className="text-lg font-bold tracking-tight">{usage?.totalExecutions?.toLocaleString() || "0"}</span>
                </div>
                <div className="px-4 py-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold tracking-tight text-muted-foreground">Est. Value</span>
                  <span className="text-lg font-bold tracking-tight text-primary">Managed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.tier}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
          >
            <Card className={cn(
              "relative h-full flex flex-col border transition-all duration-300 overflow-hidden group hover:shadow-md",
              plan.popular ? "border-primary bg-primary/[0.01]" : "border-border/60",
            )}>
              {plan.popular && (
                <div className="absolute top-0 right-0 p-3">
                  <Badge className="bg-primary text-primary-foreground font-bold text-[9px] tracking-widest rounded-lg px-2 shadow-sm">
                    POPULAR
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-8 pb-4 relative">
                <div className={cn(
                  "w-6 h-6 rounded-2xl flex items-center justify-center mb-6 shadow-sm border ring-8 ring-muted/5",
                  plan.popular ? "bg-primary text-primary-foreground border-primary/20" : "bg-muted text-muted-foreground border-border/50"
                )}>
                  <plan.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.tier !== 'enterprise' && <span className="text-muted-foreground text-xs font-semibold tracking-tight ml-1">/ mo</span>}
                </div>
                <CardDescription className="text-xs font-medium mt-3 leading-relaxed min-h-[40px]">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-grow pt-4 pb-8 relative">
                <div className="h-px bg-border/40 w-full mb-8" />
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-[11px] font-bold">
                      <div className="h-5 w-5 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pb-8 pt-0 relative">
                <Button
                  onClick={() => plan.tier !== 'free' && handleUpgrade(plan.tier as any)}
                  disabled={currentTier === plan.tier}
                  className={cn(
                    "w-full h-11 rounded-xl text-xs font-bold tracking-tight transition-all duration-300",
                    currentTier === plan.tier ? "bg-muted text-muted-foreground" : "group"
                  )}
                  variant={currentTier === plan.tier ? "outline" : plan.popular ? "default" : "outline"}
                >
                  {currentTier === plan.tier ? "Current Plan" : "Upgrade Plan"}
                  {currentTier !== plan.tier && <ArrowRight className="h-3.5 w-3.5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Feature Comparison Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-8"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Compare plans</h2>
        </div>

        <div className="border border-border/50 rounded-2xl overflow-hidden bg-muted/5 shadow-sm">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[200px] font-bold text-[10px] uppercase tracking-wider py-4">Feature</TableHead>
                  <TableHead className="font-black text-center text-xs tracking-tighter">Starter</TableHead>
                  <TableHead className="font-black text-center text-xs tracking-tighter text-primary">Pro</TableHead>
                  <TableHead className="font-black text-center text-xs tracking-tighter text-amber-500">Enterprise</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonFeatures.map((f, i) => (
                  <TableRow key={f.name} className="hover:bg-muted/20 transition-colors border-border/50">
                    <TableCell className="font-bold text-xs py-5 pl-8">{f.name}</TableCell>
                    <TableCell className="text-center font-mono text-[11px] font-bold text-muted-foreground">
                      {typeof f.free === 'boolean' ? (f.free ? <Check className="h-4 w-4 mx-auto text-primary" /> : "—") : f.free}
                    </TableCell>
                    <TableCell className="text-center font-mono text-[11px] font-black">
                      {typeof f.pro === 'boolean' ? (f.pro ? <Sparkles className="h-4 w-4 mx-auto text-primary" /> : "—") : f.pro}
                    </TableCell>
                    <TableCell className="text-center font-mono text-[11px] font-black text-amber-500">
                      {typeof f.enterprise === 'boolean' ? (f.enterprise ? <Star className="h-4 w-4 mx-auto" /> : "—") : f.enterprise}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      {/* FAQ Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-border/40">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
          <p className="text-muted-foreground text-sm font-medium">
            Everything you need to know about pricing and billing.
          </p>
          <Button variant="link" className="p-0 h-auto font-bold text-primary group">
            Contact support <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
        <div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
                <AccordionTrigger className="text-sm font-bold tracking-tight hover:no-underline hover:text-primary transition-colors py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-xs leading-loose font-medium">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Payment Security */}
      <div className="flex flex-col items-center justify-center p-10 bg-muted/20 rounded-3xl border border-border/50 text-center relative overflow-hidden">
        <Shield className="h-8 w-8 text-muted-foreground mb-4 opacity-50" />
        <h3 className="font-bold text-sm uppercase tracking-tight">Secure Billing</h3>
        <p className="max-w-md text-[11px] text-muted-foreground font-medium mt-3 leading-relaxed">
          We use industry-standard encryption. In this demo environment,
          all upgrades are simulated for testing purposes.
        </p>
      </div>
    </div>
  );
}
