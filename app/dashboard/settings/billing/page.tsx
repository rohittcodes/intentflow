"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Progress } from "@/components/ui/shadcn/progress";
import { Check, Zap, Shield, CreditCard, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

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
      name: "Free",
      tier: "free",
      price: "$0",
      description: "Perfect for hobbyists and exploration.",
      features: [
        "3 Projects",
        "5 Workflows per project",
        "2 Knowledge Bases per project",
        "50 AI Executions / mo",
        "Community Support",
      ],
      icon: Zap,
      color: "from-blue-500 to-cyan-500",
    },
    {
      name: "Pro",
      tier: "pro",
      price: "$29",
      description: "For professionals needing more power.",
      features: [
        "20 Projects",
        "50 Workflows per project",
        "10 Knowledge Bases per project",
        "1,000 AI Executions / mo",
        "Priority Support",
      ],
      icon: Shield,
      color: "from-purple-500 to-pink-500",
      popular: true,
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      price: "Custom",
      description: "Scale with confidence and infinite resources.",
      features: [
        "999 Projects",
        "999 Workflows per project",
        "999 Knowledge Bases per project",
        "Unlimited Executions",
        "Dedicated Account Manager",
      ],
      icon: CreditCard,
      color: "from-amber-500 to-orange-500",
    },
  ];

  const currentTier = activeWorkspace?.pricingTier || "free";

  return (
    <div className="max-w-6xl mx-auto w-full p-32 space-y-32">
      <div className="space-y-8">
        <h1 className="text-title-h3 text-accent-black mb-8">Billing & Plans</h1>
        <p className="text-body-medium text-black-alpha-64">
          Manage your subscription and monitor your usage limits.
        </p>
      </div>

      {/* Current Usage Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-heat-100/20 bg-heat-100/5 rounded-16 overflow-hidden">
          <CardHeader className="p-24 pb-16">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-label-large text-accent-black">Monthly Usage</CardTitle>
                <CardDescription className="text-body-small text-black-alpha-48">
                  Your current AI execution usage for this period.
                </CardDescription>
              </div>
              <Badge className="px-12 py-4 bg-heat-100 text-white border-none rounded-full text-label-x-small">
                {currentTier.toUpperCase()} PLAN
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-24 pt-0 space-y-16">
            <div className="flex items-center justify-between text-body-medium">
              <span className="font-medium text-black-alpha-64">Executions</span>
              <span className="font-bold text-accent-black">
                {usage?.current || 0} / {usage?.limit || 50}
              </span>
            </div>
            <Progress value={((usage?.current || 0) / (usage?.limit || 1)) * 100} className="h-8 bg-heat-100/10" />
            <p className="text-label-x-small text-black-alpha-48 italic">
              Limits reset every 30 days from your period start date.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.tier}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={`h-full flex flex-col relative overflow-hidden rounded-16 border-black-alpha-8 bg-white transition-all ${plan.popular ? 'border-heat-100 shadow-lg scale-105 z-10' : 'hover:border-black-alpha-12'}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg font-bold bg-heat-100 text-white border-none">MOST POPULAR</Badge>
                </div>
              )}
              <CardHeader className="p-24 pb-16">
                <div className={`p-12 w-fit rounded-12 bg-gradient-to-br ${plan.color} text-white mb-16`}>
                  <plan.icon className="h-24 w-24" />
                </div>
                <CardTitle className="text-title-h5 text-accent-black">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-4 pt-8">
                  <span className="text-title-h4 text-accent-black">{plan.price}</span>
                  {plan.tier !== 'enterprise' && <span className="text-black-alpha-48 text-body-small">/ month</span>}
                </div>
                <CardDescription className="pt-8 text-body-small text-black-alpha-64">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full group h-44 rounded-8 font-semibold transition-all"
                  variant={currentTier === plan.tier ? "outline" : plan.popular ? "default" : "secondary"}
                  disabled={currentTier === plan.tier}
                  onClick={() => plan.tier !== 'free' && handleUpgrade(plan.tier as any)}
                >
                  {currentTier === plan.tier ? (
                    <span className="flex items-center gap-8">
                      <Check className="w-16 h-16" /> Current Plan
                    </span>
                  ) : (
                    <>
                      {plan.tier === "enterprise" ? "Contact Support" : "Upgrade Plan"}
                      <ArrowRight className="ml-8 h-18 w-18 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Security/Trust Footer */}
      <div className="flex flex-col items-center justify-center p-32 bg-black-alpha-4 rounded-32 border border-dashed border-black-alpha-12 text-center">
        <Shield className="h-32 w-32 text-black-alpha-24 mb-16" />
        <h3 className="text-label-medium text-accent-black">Simulated Environment</h3>
        <p className="max-w-md text-body-small text-black-alpha-48 mt-4">
          This is a simulated billing dashboard. Clicking upgrade will instantly move your workspace to the new tier without any real transaction.
        </p>
      </div>
    </div>
  );
}
