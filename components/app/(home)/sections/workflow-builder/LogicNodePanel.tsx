"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  Variable, 
  RefreshCw, 
  UserCheck, 
  ChevronDown, 
  Play, 
  HelpCircle,
  AlertCircle,
  Code2,
  ListRestart,
  ShieldAlert,
  Hash
} from "lucide-react";
import type { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LogicNodePanelProps {
  node: Node | null;
  nodes: Node[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export default function LogicNodePanel({ node, nodes, onClose, onDelete, onUpdate }: LogicNodePanelProps) {
  const nodeData = node?.data as any;
  const nodeType = nodeData?.nodeType?.toLowerCase() || '';
  const [name, setName] = useState(nodeData?.name || nodeData?.nodeName || "Logic");
  const conditionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const whileConditionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const approvalMessageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // If/Else state
  const [condition, setCondition] = useState(nodeData?.condition || "input.score > 70");

  // While state
  const [whileCondition, setWhileCondition] = useState(nodeData?.whileCondition || "iteration < 10");
  const [maxIterations, setMaxIterations] = useState(nodeData?.maxIterations || "100");

  // User Approval state
  const [approvalMessage, setApprovalMessage] = useState(nodeData?.approvalMessage || "Please review and approve this step");
  const [timeoutMinutes, setTimeoutMinutes] = useState(nodeData?.timeoutMinutes || "30");

  // Build available variables for conditions
  const getAvailableVariables = () => {
    const startNode = nodes.find(n => (n.data as any)?.nodeType === 'start');
    const inputVariables = (startNode?.data as any)?.inputVariables || [];

    const previousNodes = nodes.filter(n => n.id !== node?.id && (n.data as any)?.nodeType !== 'note' && (n.data as any)?.nodeType !== 'start');

    return {
      inputVars: inputVariables.map((v: any) => ({
        name: v.name,
        path: `input.${v.name}`,
        description: v.description,
        type: v.type,
      })),
      nodeOutputs: previousNodes.map(n => ({
        name: (n.data as any)?.nodeName || n.id,
        path: n.id.replace(/-/g, '_'),
        description: `Output from ${(n.data as any)?.nodeName || n.id}`,
      })),
      special: [
        { name: 'lastOutput', path: 'lastOutput', description: 'Output from previous node' },
        { name: 'iteration', path: 'iteration', description: 'Current iteration count (while loops only)' },
      ]
    };
  };

  const insertVariable = (varPath: string, targetType: 'ifElse' | 'while' | 'approval') => {
    let textarea: HTMLTextAreaElement | null = null;
    let currentValue = '';
    let setter: (value: string) => void;

    switch (targetType) {
      case 'ifElse':
        textarea = conditionTextareaRef.current;
        currentValue = condition;
        setter = setCondition;
        break;
      case 'while':
        textarea = whileConditionTextareaRef.current;
        currentValue = whileCondition;
        setter = setWhileCondition;
        break;
      case 'approval':
        textarea = approvalMessageTextareaRef.current;
        currentValue = approvalMessage;
        setter = setApprovalMessage;
        break;
    }

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = currentValue.substring(0, start) + varPath + currentValue.substring(end);

    setter(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea!.focus();
      textarea!.setSelectionRange(start + varPath.length, start + varPath.length);
    }, 0);
  };

  // Auto-save changes with change check
  useEffect(() => {
    if (!node?.id) return;

    const timeoutId = setTimeout(() => {
      const hasChanged =
        name !== (node.data as any)?.name ||
        condition !== (node.data as any)?.condition ||
        whileCondition !== (node.data as any)?.whileCondition ||
        maxIterations !== (node.data as any)?.maxIterations ||
        approvalMessage !== (node.data as any)?.approvalMessage ||
        timeoutMinutes !== (node.data as any)?.timeoutMinutes;

      if (hasChanged) {
        onUpdate(node.id, {
          name,
          nodeName: name,
          condition,
          whileCondition,
          maxIterations,
          approvalMessage,
          timeoutMinutes,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    name,
    condition,
    whileCondition,
    maxIterations,
    approvalMessage,
    timeoutMinutes,
    node?.id,
    node?.data,
    onUpdate
  ]);

  if (!node) return null;

  const availableVars = getAvailableVariables();

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-6 w-full pb-10">
      {/* If/Else Configuration */}
      {nodeType.includes('if') && (
        <div className="space-y-6 px-1 max-w-[320px] mx-auto">
          <div className="space-y-3 px-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Condition
              </Label>
              <Badge variant="outline" className="text-[9px] font-mono bg-background border-border/50 text-muted-foreground">
                JavaScript
              </Badge>
            </div>
            <Textarea
              ref={conditionTextareaRef}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              rows={3}
              placeholder="e.g., input.score > 70"
              className="min-h-[80px] bg-muted/20 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all rounded-md p-4"
            />
          </div>

          {/* Quick Variable Selector */}
          <Card className="bg-muted/20 border-border/50 shadow-none rounded-lg overflow-hidden group hover:border-primary/20 transition-all">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                <Variable className="h-3.5 w-3.5 text-primary" />
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                  Variables
                </Label>
              </div>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                {/* Input Variables */}
                {availableVars.inputVars.length > 0 && (
                  <div className="space-y-1.5 focus:outline-none">
                    {availableVars.inputVars.map((v: any, idx: number) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        onClick={() => insertVariable(v.path, 'ifElse')}
                        className="h-6 px-1.5 w-full justify-start hover:bg-primary/10 text-[10px] font-mono transition-all text-muted-foreground hover:text-primary"
                        title={v.description}
                      >
                        {v.path}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Previous Node Outputs */}
                {availableVars.nodeOutputs.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-border/30">
                    {availableVars.nodeOutputs.map((v: any, idx: number) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        onClick={() => insertVariable(v.path, 'ifElse')}
                        className="h-6 px-1.5 w-full justify-start hover:bg-primary/10 text-[10px] font-mono transition-all text-muted-foreground hover:text-primary"
                        title={v.description}
                      >
                        {v.path}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Common Condition Examples */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Code2 className="h-3.5 w-3.5 text-muted-foreground/60" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Common Patterns</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { cond: 'input.score > 70', label: 'Score Check' },
                { cond: 'input.status === "approved"', label: 'Status Equals' },
                { cond: 'lastOutput.length > 0', label: 'Array Exists' },
                { cond: 'input.age >= 18', label: 'Age Limit' },
              ].map((pattern) => (
                <Button
                  key={pattern.cond}
                  variant="outline"
                  onClick={() => setCondition(pattern.cond)}
                  className="h-auto flex-col items-start gap-1 p-3 bg-muted/10 border-border/50 hover:bg-primary/5 hover:border-primary/20 group transition-all"
                >
                  <code className="text-[9px] font-mono text-primary truncate w-full">{pattern.cond}</code>
                  <span className="text-[10px] text-muted-foreground italic">{pattern.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* While Configuration */}
      {nodeType.includes('while') && (
        <div className="space-y-6 px-1 max-w-[320px] mx-auto">
          <div className="space-y-3 px-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Loop Condition
            </Label>
            <Textarea
              ref={whileConditionTextareaRef}
              value={whileCondition}
              onChange={(e) => setWhileCondition(e.target.value)}
              rows={2}
              placeholder="e.g., iteration < 10"
              className="h-20 bg-muted/20 border-border/50 font-mono text-[11px] focus-visible:ring-primary/20 transition-all rounded-md p-4"
            />
          </div>

          {/* Quick Variable Selector for While */}
          <Card className="bg-muted/20 border-border/50 shadow-none rounded-lg overflow-hidden group hover:border-primary/20 transition-all">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                <Variable className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">
                  Variables
                </h3>
              </div>

              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                {/* Input Variables */}
                {availableVars.inputVars.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Inputs</p>
                    <div className="flex flex-wrap gap-1.5 focus:outline-none">
                      {availableVars.inputVars.map((v: any, idx: number) => (
                        <Button
                          key={idx}
                          variant="secondary"
                          size="sm"
                          onClick={() => insertVariable(v.path, 'while')}
                          className="h-7 px-2 bg-background border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/20 text-[10px] font-mono transition-all"
                        >
                          {v.path}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Loop Variable (Iteration) */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Loop Control</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => insertVariable('iteration', 'while')}
                      className="h-7 px-2 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 text-[10px] font-mono font-bold"
                    >
                      iteration
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2 px-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Max Iterations
              </Label>
              <Input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(e.target.value)}
                className="h-8 bg-muted/20 border-border/50 font-mono focus-visible:ring-primary/20 rounded-md text-[11px]"
              />
            </div>

            <Card className="bg-primary/5 border-primary/15 shadow-none rounded-lg">
              <CardContent className="p-4 flex gap-3">
                <ListRestart className="h-4 w-4 text-primary shrink-0" />
                <p className="text-[11px] text-primary/70 leading-relaxed italic">
                  <strong>Loop Pattern:</strong> Connect the nodes you want to repeat to the loop output, then use "continue" to return to the start.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* User Approval Configuration */}
      {nodeType.includes('approval') && (
        <div className="space-y-6 px-1 max-w-[320px] mx-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Approval Prompt
              </Label>
              <UserCheck className="h-4 w-4 text-primary/40" />
            </div>
            <Textarea
              ref={approvalMessageTextareaRef}
              value={approvalMessage}
              onChange={(e) => setApprovalMessage(e.target.value)}
              rows={4}
              placeholder="e.g., Please review: ${lastOutput.summary}"
              className="min-h-[100px] bg-muted/20 border-border/50 text-[11px] focus-visible:ring-primary/20 transition-all leading-relaxed rounded-md p-4"
            />
            <div className="flex items-center gap-2 px-1">
              <code className="text-[9px] font-mono text-muted-foreground bg-muted/30 px-1 rounded-sm">{"${variable}"}</code>
              <p className="text-[10px] text-muted-foreground italic">
                Dynamic value injection
              </p>
            </div>
          </div>

          {/* Quick Variable Selector for Approval */}
          <Card className="bg-muted/20 border-border/50 shadow-none rounded-lg overflow-hidden group hover:border-primary/20 transition-all">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                <Variable className="h-3.5 w-3.5 text-primary" />
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                  Variables
                </Label>
              </div>
              <div className="flex flex-wrap gap-1.5 focus:outline-none max-h-[150px] overflow-y-auto pr-1">
                {availableVars.inputVars.map((v: any, idx: number) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="sm"
                    onClick={() => insertVariable('${' + v.path + '}', 'approval')}
                    className="h-6 px-1.5 hover:bg-primary/10 text-[10px] font-mono transition-all text-muted-foreground hover:text-primary"
                  >
                    {`\${${v.name}}`}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2 px-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Timeout (Minutes)
              </Label>
              <Input
                type="number"
                value={timeoutMinutes}
                onChange={(e) => setTimeoutMinutes(e.target.value)}
                className="h-8 bg-muted/20 border-border/50 font-mono focus-visible:ring-primary/20 rounded-md text-[11px]"
              />
            </div>

            <Card className="bg-secondary/40 border-border/30 shadow-none rounded-lg">
              <CardContent className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-1.5 rounded-md bg-green-500/5 border border-green-500/10 justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[9px] font-bold uppercase tracking-tight text-green-700">Approve</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-md bg-red-500/5 border border-red-500/10 justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="text-[9px] font-bold uppercase tracking-tight text-red-700">Reject</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Universal Output Selector placeholder */}
      <div className="px-1 opacity-0 pointer-events-none">
        <div className="h-px bg-border/50" />
      </div>
    </div>
  );
}
