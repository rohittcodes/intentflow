"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import WorkflowBuilder from "@/components/app/(home)/sections/workflow-builder/WorkflowBuilder";
import { useRouter } from "next/navigation";

function FlowPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // Get flow ID from params (e.g., /flow/abc123)
  const flowId = params?.id as string | undefined;

  // Check if it's a new flow
  const isNew = flowId === "new";

  // Get template ID from search params (e.g., /flow/new?template=simple-scraper)
  const templateId = searchParams?.get("template");

  const handleBack = () => {
    router.push("/dashboard/workflows");
  };

  return (
    <WorkflowBuilder
      onBack={handleBack}
      initialWorkflowId={!isNew && flowId ? flowId : null}
      initialTemplateId={templateId}
    />
  );
}

export default function FlowPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading flow builder...</div>}>
      <FlowPageContent />
    </Suspense>
  );
}
