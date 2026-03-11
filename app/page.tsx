"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SignedIn, SignedOut, SignInButton, useUser, useClerk } from '@clerk/nextjs';
import { LogOut, Settings as SettingsIcon, User as UserIcon, ChevronDown } from "lucide-react";

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Import sections
import WorkflowBuilder from "@/components/app/(home)/sections/workflow-builder/WorkflowBuilder";
import { AnimatedGrid } from "@/components/app/AnimatedGrid";

function StyleGuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const [loadWorkflowId, setLoadWorkflowId] = useState<string | null>(null);
  const [loadTemplateId, setLoadTemplateId] = useState<string | null>(null);

  // Handle URL params
  useEffect(() => {
    if (!searchParams) return;

    const view = searchParams.get('view');
    const workflowId = searchParams.get('workflow');
    const templateId = searchParams.get('template');

    if (view === 'builder') {
      setShowWorkflowBuilder(true);
    } else if (workflowId) {
      setLoadWorkflowId(workflowId);
      setShowWorkflowBuilder(true);
    } else if (templateId) {
      setLoadTemplateId(templateId);
      setShowWorkflowBuilder(true);
    }
  }, [searchParams]);

  const handleSubmit = () => {
    router.push('/dashboard/workflows');
  };

  const handleReset = () => {
    setShowWorkflowBuilder(false);
    setLoadWorkflowId(null);
    setLoadTemplateId(null);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedGrid />

      {showWorkflowBuilder ? (
        <SignedIn>
          <WorkflowBuilder
            onBack={handleReset}
            initialWorkflowId={loadWorkflowId}
            initialTemplateId={loadTemplateId}
          />
        </SignedIn>
      ) : (
        <>
          {/* Header Section */}
          <header className="sticky top-0 z-50 w-full border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40 px-6 transition-all">
            <div className="w-full flex h-14 items-center justify-between mx-auto max-w-[1400px]">
              <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight">
                  IntentFlow
                </Link>
              </div>

              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="hidden sm:inline-block">
                  <Button variant="ghost">View Workflows</Button>
                </Link>

                <SignedOut>
                  <SignInButton mode="modal">
                    <Button>Sign In</Button>
                  </SignInButton>
                </SignedOut>

                <SignedIn>
                  <Link href="/dashboard" className="hidden sm:inline-block">
                    <Button variant="secondary" className="font-medium">Dashboard</Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-9 px-2 gap-2 rounded-full border border-border/50 hover:bg-muted/50">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User Avatar"} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {user?.firstName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 rounded-xl border-border/50" align="end" sideOffset={8}>
                      <DropdownMenuLabel className="font-normal p-2">
                        <div className="flex items-center gap-3">
                           <Avatar className="h-8 w-8 rounded-lg border border-border/50 shadow-sm">
                            <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User Avatar"} />
                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <p className="text-xs font-bold leading-none mb-1 truncate">{user?.fullName}</p>
                            <p className="text-[10px] leading-none text-muted-foreground truncate">
                              {user?.primaryEmailAddress?.emailAddress}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="cursor-pointer rounded-lg m-1">
                        <Link href="/dashboard/settings/profile">
                          <UserIcon className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer rounded-lg m-1">
                        <Link href="/dashboard/settings">
                          <SettingsIcon className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => signOut({ redirectUrl: '/' })} 
                        className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-100/50 dark:focus:bg-red-950/50 rounded-lg m-1 font-medium"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SignedIn>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="w-full relative py-24 lg:py-40 flex flex-col items-center text-center gap-10 px-6 fade-in-up">
            <div className="flex flex-col items-center gap-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
                <span className="text-primary font-semibold">New: Visual Workflow Builder</span>
                <span className="h-4 w-px bg-primary/20" />
                <span className="text-orange-500 uppercase">NOT backed by YC</span>
              </div>
            </div>

            <div className="pb-4">
              <h1 className="text-5xl font-extrabold tracking-tight lg:text-7xl max-w-5xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent leading-[1.1]">
                Design, automate, and deploy intelligent AI agents
              </h1>
            </div>

            <p className="max-w-[900px] text-xl text-muted-foreground leading-relaxed">
              Build production-ready RAG pipelines and automate complex tasks with a visual workflow builder.
              Integrate any data source and language model in minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <SignedIn>
                <Button size="lg" onClick={handleSubmit} className="h-12 px-8 text-base shadow-xl shadow-primary/20">
                  Start building
                </Button>
              </SignedIn>

              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="lg" className="h-12 px-8 text-base shadow-xl shadow-primary/20">
                    Start building
                  </Button>
                </SignInButton>
              </SignedOut>

              <Link href="https://github.com/rohittcodes/intentflow" target="_blank">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base backdrop-blur-sm bg-background/20">
                  View Source
                </Button>
              </Link>
            </div>
          </section>

          {/* Hire/Co-founder section */}
          <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground/60">
            <span>Building the future of agentic workflows. Join us as a co-founder or early hire:</span>
            <a href="mailto:careers@getlinea.app" className="font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary hover:text-muted-foreground transition-colors">
              careers@getlinea.app
            </a>
          </footer>
        </>
      )}
    </div>
  );
}

export default function StyleGuidePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StyleGuidePageContent />
    </Suspense>
  );
}