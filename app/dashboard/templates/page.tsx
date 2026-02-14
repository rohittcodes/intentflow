"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { listTemplates } from "@/lib/workflow/templates";

export default function TemplatesPage() {
  const router = useRouter();
  const templates = listTemplates();

  const handleLoadTemplate = (templateId: string) => {
    router.push(`/flow/new?template=${templateId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
          <p className="text-muted-foreground">Pre-built workflows to get you started faster.</p>
        </div>
      </div>

      <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleLoadTemplate(template.id)}
            className="group relative flex flex-col gap-12 rounded-12 border border-black-alpha-8 bg-accent-white p-16 hover:border-heat-100 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="flex flex-col gap-4">
              <h3 className="text-label-large text-accent-black group-hover:text-heat-100 transition-colors">{template.name}</h3>
              <p className="text-body-small text-black-alpha-64 line-clamp-2">{template.description}</p>
            </div>
            <div className="mt-auto pt-12">
              <span className="inline-flex items-center rounded-8 border border-black-alpha-8 bg-black-alpha-4 px-10 py-6 text-body-small text-accent-black hover:bg-black-alpha-8 transition-colors">
                Use Template
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
