"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import ExecutionPanel from "@/components/app/(home)/sections/workflow-builder/ExecutionPanel";
import { Play, Loader2 } from "lucide-react";
import { Workflow } from "@/lib/workflow/types";

export default function EmbedPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const searchParamsObj = use(searchParams);
  const apiKey = searchParamsObj?.apiKey as string | undefined;

  // Try custom ID first, fallback to regular Convex ID
  let workflow = useQuery(api.workflows.getWorkflowByCustomId, { customId: id });
  const fallbackWorkflow = useQuery(api.workflows.getWorkflow, { id: id as any });

  const finalWorkflow = workflow || (id.startsWith('j') ? fallbackWorkflow : undefined);

  const {
    execution,
    isRunning,
    currentNodeId,
    nodeResults,
    pendingAuth,
    runWorkflow,
    resumeWorkflow,
    retryExecution
  } = useWorkflowExecution();

  const [initialInput, setInitialInput] = useState("");

  if (finalWorkflow === undefined) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background-base text-accent-black">
        <Loader2 className="w-8 h-8 animate-spin text-heat-100 mb-4" />
        <p className="text-body-small font-medium text-black-alpha-56">Loading workflow...</p>
      </div>
    );
  }

  if (finalWorkflow === null) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background-base text-accent-black p-4 text-center">
        <h1 className="text-title-h3 font-display font-medium mb-2">Workflow not found</h1>
        <p className="text-body-small text-black-alpha-56">
          This workflow either does not exist or is not configured to be publicly embeddable.
        </p>
      </div>
    );
  }

  // Pre-check for start node
  const startNode = (finalWorkflow as any).nodes?.find((n: any) => n.type === "start");
  const requiresInput = startNode && startNode.data?.inputVariables && startNode.data.inputVariables.length > 0;

  // Render the Execution Panel
  return (
    <div className="w-full h-screen flex flex-col bg-background-base font-sans overflow-hidden">
      {/* Top Banner */}
      <div className="h-14 border-b border-border-faint bg-accent-white flex items-center justify-between px-16 shrink-0">
        <div className="flex items-center gap-12">
          <div className="w-24 h-24 rounded-8 bg-heat-100 flex items-center justify-center text-white">
            <Play className="w-6 h-6 ml-1" />
          </div>
          <div>
            <h1 className="text-body-small font-bold text-accent-black leading-tight">
              {finalWorkflow.name}
            </h1>
            <p className="text-[11px] text-black-alpha-48 leading-tight line-clamp-1">
              {finalWorkflow.description || "Intentflow Embedded Runner"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Execution Area */}
      <div className="flex-1 relative overflow-hidden bg-[#FAFAFA]">
        <ExecutionPanel
          workflow={finalWorkflow as unknown as Workflow}
          execution={execution}
          isRunning={isRunning}
          currentNodeId={currentNodeId}
          nodeResults={nodeResults}
          pendingAuth={pendingAuth}
          onRun={async (input) => {
            const customHeaders: Record<string, string> = {};
            if (apiKey) {
              customHeaders['Authorization'] = `Bearer ${apiKey}`;
            }
            await runWorkflow(finalWorkflow as unknown as Workflow, input, customHeaders);
          }}
          onResumePendingAuth={resumeWorkflow}
          onRetry={retryExecution}
          onClose={() => { }} // No-op, cannot close embedded view
          environment="production"
        />
      </div>
    </div>
  );
}
