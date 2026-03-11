"use client";

import { useRouter } from "next/navigation";
import { listTemplates } from "@/lib/workflow/templates";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutTemplate } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

export default function TemplatesPage() {
  const router = useRouter();
  const { activeProjectId } = useWorkspace();
  const templates = listTemplates();

  const handleLoadTemplate = (templateId: string) => {
    router.push(`/dashboard/workflow/new?template=${templateId}`);
  };

  return (
    <div className="pb-8 space-y-8">
      <PageHeader title="Templates" />

      {!activeProjectId ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center border-2 border-dashed border-border/50 rounded-[32px] bg-muted/10 mt-8">
          <div className="p-4 rounded-full bg-background border border-border mb-6">
            <LayoutTemplate className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-2">Select a Project</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
            You need to create a <strong className="font-bold text-foreground">Project</strong> to use templates.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="group cursor-pointer hover:border-primary flex flex-col"
              onClick={() => handleLoadTemplate(template.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-primary">
                    {template.name}
                  </CardTitle>
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5rem] leading-relaxed">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-4 border-t">
                <div className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground group-hover:text-primary">
                  <span>USE TEMPLATE</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
