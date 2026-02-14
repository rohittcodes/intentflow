"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

// Import shared components
import Button from "@/components/shared/button/Button";
import { Connector } from "@/components/shared/layout/curvy-rect";
import HeroFlame from "@/components/shared/effects/flame/hero-flame";
import { HeaderProvider } from "@/components/shared/header/HeaderContext";

// Import hero section components
import HomeHeroBackground from "@/components/app/(home)/sections/hero/Background/Background";
import { BackgroundOuterPiece } from "@/components/app/(home)/sections/hero/Background/BackgroundOuterPiece";
import HomeHeroBadge from "@/components/app/(home)/sections/hero/Badge/Badge";
import HomeHeroPixi from "@/components/app/(home)/sections/hero/Pixi/Pixi";
import HomeHeroTitle from "@/components/app/(home)/sections/hero/Title/Title";
import WorkflowBuilder from "@/components/app/(home)/sections/workflow-builder/WorkflowBuilder";

// Import header components
import HeaderBrandKit from "@/components/shared/header/BrandKit/BrandKit";
import HeaderWrapper from "@/components/shared/header/Wrapper/Wrapper";
import HeaderDropdownWrapper from "@/components/shared/header/Dropdown/Wrapper/Wrapper";
import GithubIcon from "@/components/shared/header/Github/_svg/GithubIcon";
import ButtonUI from "@/components/ui/shadcn/button";

function StyleGuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    <HeaderProvider>
      {showWorkflowBuilder ? (
        <SignedIn>
          <WorkflowBuilder
            onBack={handleReset}
            initialWorkflowId={loadWorkflowId}
            initialTemplateId={loadTemplateId}
          />
        </SignedIn>
      ) : (
        <div className="min-h-screen bg-background-base">
          {/* Header/Navigation Section */}
          <HeaderDropdownWrapper />

          <div className="sticky top-0 left-0 w-full z-[101] bg-background-base header">
            <div className="absolute top-0 cmw-container border-x border-border-faint h-full pointer-events-none" />

            <div className="h-1 bg-border-faint w-full left-0 -bottom-1 absolute" />

            <div className="cmw-container absolute h-full pointer-events-none top-0">
              <Connector className="absolute -left-[10.5px] -bottom-11" />
              <Connector className="absolute -right-[10.5px] -bottom-11" />
            </div>

            <HeaderWrapper>
              <div className="max-w-[1240px] mx-auto w-full flex justify-between items-center px-16 lg:px-24">
                <div className="flex gap-32 items-center">
                  <HeaderBrandKit />
                </div>

                <div className="flex gap-16 items-center">
                  {/* Documentation Button */}
                  <Link
                    className="contents"
                    href="/dashboard"
                  >
                    <ButtonUI variant="secondary" className="px-24 py-12 h-44 text-label-large">
                      View Workflows
                    </ButtonUI>
                  </Link>

                  {/* Clerk Auth */}
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="px-24 py-12 bg-heat-100 hover:bg-heat-200 text-white rounded-8 text-label-large font-medium transition-all active:scale-[0.98] shadow-md h-44 flex items-center justify-center">
                        Sign In
                      </button>
                    </SignInButton>
                  </SignedOut>

                  <SignedIn>
                    <Link href="/dashboard">
                      <button className="bg-heat-100 w-full hover:bg-heat-200 text-white font-medium px-24 py-14 rounded-8 transition-all active:scale-[0.98] text-label-large shadow-md cursor-pointer mr-8 h-44 flex items-center justify-center">
                        Dashboard
                      </button>
                    </Link>
                    <UserButton
                      appearance={{
                        elements: {
                          rootBox: "w-32 h-32",
                          userButtonTrigger: "w-32 h-32",
                          avatarBox: "w-32 h-32 border-2 border-border-faint hover:border-heat-100 transition-colors shadow-md",
                          userButtonAvatarBox: "w-32 h-32",
                          userButtonAvatarImage: "w-32 h-32",
                        }
                      }}
                      afterSignOutUrl="/"
                    />
                  </SignedIn>
                </div>
              </div>
            </HeaderWrapper>
          </div>

          {/* Hero Section */}
          <section className="overflow-x-clip" id="home-hero">
            <div className="pt-28 lg:pt-254 lg:-mt-100 pb-115 relative" id="hero-content">
              <HomeHeroPixi />
              <HeroFlame />
              <BackgroundOuterPiece />
              <HomeHeroBackground />

              <AnimatePresence mode="wait">
                <motion.div
                  key="hero"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="relative container px-16"
                >
                  <HomeHeroBadge />
                  <HomeHeroTitle />

                  <p className="text-center text-body-large text-black-alpha-64 max-w-[600px] mx-auto">
                    Design, automate, and deploy intelligent AI agents with a visual workflow builder.
                    Integrate any data source and build production-ready RAG pipelines in minutes.
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Start Building Button */}
            <motion.div
              className="flex justify-center -mt-90 relative z-10"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* When signed in - navigate to workflows */}
              <SignedIn>
                <button
                  onClick={handleSubmit}
                  className="bg-heat-100 hover:bg-heat-200 text-white font-medium px-32 py-12 rounded-10 transition-all active:scale-[0.98] text-body-medium shadow-md cursor-pointer"
                >
                  Start building
                </button>
              </SignedIn>

              {/* When signed out - open sign-in modal */}
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-heat-100 hover:bg-heat-200 text-white font-medium px-32 py-12 rounded-10 transition-all active:scale-[0.98] text-body-medium shadow-md cursor-pointer">
                    Start building
                  </button>
                </SignInButton>
              </SignedOut>
            </motion.div>
          </section>
        </div>
      )}
    </HeaderProvider>
  );
}

export default function StyleGuidePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StyleGuidePageContent />
    </Suspense>
  );
}