"use client";

import { Trash2, Plus, Info, Settings2, ShieldCheck, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InputVariable {
  name: string;
  type: "string" | "number" | "boolean" | "url" | "object";
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface StartNodePanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export default function StartNodePanel({ node, onClose, onUpdate }: StartNodePanelProps) {
  const nodeData = node?.data as any;
  const [inputVariables, setInputVariables] = useState<InputVariable[]>(
    nodeData?.inputVariables || [
      {
        name: "input_as_text",
        type: "string",
        required: false,
        defaultValue: "",
        description: "",
      }
    ]
  );

  // Auto-save changes with change check
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      const hasChanged = JSON.stringify(inputVariables) !== JSON.stringify(node.data?.inputVariables);

      if (hasChanged) {
        onUpdate(node.id, {
          inputVariables,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputVariables, node?.id, node?.data, onUpdate]);

  const addVariable = () => {
    setInputVariables([
      ...inputVariables,
      {
        name: `input${inputVariables.length + 1}`,
        type: "string",
        required: false,
        description: "",
      },
    ]);
  };

  const updateVariable = (index: number, updates: Partial<InputVariable>) => {
    setInputVariables(
      inputVariables.map((v, i) => (i === index ? { ...v, ...updates } : v))
    );
  };

  const removeVariable = (index: number) => {
    setInputVariables(inputVariables.filter((_, i) => i !== index));
  };

  if (!node) return null;

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-6 w-full pb-10">
      {/* Input Variables List */}
      <div className="space-y-4 px-1 max-w-[320px] mx-auto">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Input variables
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={addVariable}
            className="h-7 px-2.5 font-bold uppercase tracking-wider text-[10px] gap-1.5 border-primary/20 text-primary hover:bg-primary/10 transition-all rounded-md"
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>

        <div className="space-y-4 pt-2">
          {inputVariables.length === 0 ? (
            <div className="p-8 bg-muted/20 border border-dashed border-border rounded-lg text-center space-y-4">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground italic">No input variables defined</p>
              </div>
              <Button
                size="sm"
                onClick={addVariable}
                className="w-full font-bold uppercase tracking-wider text-[10px]"
              >
                Add Your First Variable
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {inputVariables.map((variable, index) => (
                <Card key={index} className="bg-muted/10 border-border/50 shadow-none rounded-lg overflow-hidden group hover:border-primary/20 transition-all">
                  <CardContent className="p-3 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">Variable Name</Label>
                        <Input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, { name: e.target.value })}
                          className="h-8 bg-background/50 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 rounded-md"
                          placeholder="variable_name"
                        />
                      </div>
                      <div className="w-[100px] space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">Type</Label>
                        <Select
                          value={variable.type}
                          onValueChange={(val) => updateVariable(index, { type: val as any })}
                        >
                          <SelectTrigger className="h-8 bg-background/50 border-border/50 text-[10px] transition-all rounded-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string" className="text-[10px]">String</SelectItem>
                            <SelectItem value="number" className="text-[10px]">Number</SelectItem>
                            <SelectItem value="boolean" className="text-[10px]">Boolean</SelectItem>
                            <SelectItem value="url" className="text-[10px]">URL</SelectItem>
                            <SelectItem value="object" className="text-[10px]">Object</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">Description</Label>
                        <Input
                          type="text"
                          value={variable.description || ''}
                          onChange={(e) => updateVariable(index, { description: e.target.value })}
                          className="h-8 bg-background/50 border-border/50 text-[11px] italic focus-visible:ring-primary/20 rounded-md"
                          placeholder="What is this input for?"
                        />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">Default Value</Label>
                        <Input
                          type="text"
                          value={variable.defaultValue || ''}
                          onChange={(e) => updateVariable(index, { defaultValue: e.target.value })}
                          className="h-8 bg-background/50 border-border/50 text-[11px] font-mono focus-visible:ring-primary/20 rounded-md"
                          placeholder="Optional default..."
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`required-${index}`}
                          checked={variable.required}
                          onCheckedChange={(checked) => updateVariable(index, { required: !!checked })}
                          className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Label 
                          htmlFor={`required-${index}`}
                          className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                        >
                          Required
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariable(index)}
                        className="h-7 px-2 text-destructive hover:bg-destructive/10 text-[9px] font-bold uppercase tracking-widest gap-1 transition-all rounded-md"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-1 pt-2 max-w-[320px] mx-auto">
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex gap-2.5">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-[10px] text-primary/70 leading-relaxed italic font-medium">
              Input variables are presented as form fields when starting the workflow.
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <Badge variant="outline" className="h-5 bg-primary/10 border-primary/20 text-[9px] font-mono text-primary px-1.5 rounded-sm">
                {`{{variable_name}}`}
              </Badge>
              <span className="text-[9px] text-primary/60 font-bold uppercase tracking-widest">Reference values.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
