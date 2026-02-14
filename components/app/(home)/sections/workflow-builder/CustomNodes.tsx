"use client";

import * as React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import type { NodeData } from "@/lib/workflow/types";
import {
  Plus,
  MousePointer2,
  Zap,
  StopCircle,
  FileText,
  Plug,
  GitBranch,
  Repeat,
  CheckCircle,
  Shield,
  Braces,
  Search,
  Server,
  Activity,
  Database
} from "lucide-react";

// Custom node component with handles for connections
export function CustomNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const nodeType = data.nodeType;
  const isRunning = data.isRunning;
  const executionStatus = data.executionStatus;

  // Note node state - MUST be declared before any conditional returns
  // This ensures hooks are called in the same order every render
  const noteText = String(data.noteText || 'Double-click to edit note');
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState<string>(noteText);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Determine border and background based on state
  const getBorderStyle = () => {
    // Note nodes have no border
    if (nodeType === 'note') return 'none';
    if (isRunning) return '1px solid #FA5D19';
    if (executionStatus === 'completed') return '1px solid #9ca3af';
    if (executionStatus === 'failed') return '1px solid #eb3424';
    if (selected) return '1px solid #FA5D19';
    return '1px solid #1c1c1f';
  };

  const getBackgroundColor = () => {
    if (nodeType === 'note') return '#fef9c3'; // Light yellow for notes
    return '#ffffff'; // Shade of white as requested
  };

  const getNodeTheme = () => {
    const themes: Record<string, { icon: any, color: string, label: string }> = {
      'agent': { icon: MousePointer2, color: 'bg-blue-500', label: 'Agent' },
      'custom-input': { icon: Zap, color: 'bg-indigo-500', label: 'Input' },
      'end': { icon: StopCircle, color: 'bg-teal-500', label: 'End' },
      'note': { icon: FileText, color: 'bg-gray-200', label: 'Note' },
      'mcp': { icon: Plug, color: 'bg-[#FFEFA4] dark:bg-[#FFDD40]', label: 'MCP Tool' },
      'if-else': { icon: GitBranch, color: 'bg-[#FEE7C2] dark:bg-[#FFAE2B]', label: 'Condition' },
      'router': { icon: GitBranch, color: 'bg-[#FEE7C2] dark:bg-[#FFAE2B]', label: 'Router' },
      'while': { icon: Repeat, color: 'bg-[#FEE7C2] dark:bg-[#FFAE2B]', label: 'Loop' },
      'user-approval': { icon: CheckCircle, color: 'bg-[#E5E7EB] dark:bg-[#9CA3AF]', label: 'Approval' },
      'guardrails': { icon: Shield, color: 'bg-[#FFEFA4] dark:bg-[#FFDD40]', label: 'Guardrails' },
      'transform': { icon: Braces, color: 'bg-[#ECE3FF] dark:bg-[#9665FF]', label: 'Transform' },
      'extract': { icon: Search, color: 'bg-[#ECE3FF] dark:bg-[#9665FF]', label: 'Extract' },
      'retriever': { icon: Database, color: 'bg-[#ECE3FF] dark:bg-[#9665FF]', label: 'Retriever' },
      'http': { icon: Server, color: 'bg-[#ECE3FF] dark:bg-[#9665FF]', label: 'Request' },
      'set-state': { icon: Braces, color: 'bg-[#ECE3FF] dark:bg-[#9665FF]', label: 'State' },
      'start': { icon: Activity, color: 'bg-gray-600', label: 'Trigger' },
    };
    return themes[nodeType || ''] || { icon: Activity, color: 'bg-gray-500', label: 'Node' };
  };

  const getOutlineStyle = () => {
    if (isRunning) return '2px solid rgba(250, 93, 25, 0.4)';
    if (selected) return '2px solid rgba(0, 0, 0, 0.1)';
    return '2px solid transparent';
  };

  // Note nodes have different styling
  const isNoteNode = nodeType === 'note';

  // Determine text color based on background
  const getTextColor = () => {
    if (nodeType === 'note') return '#854d0e'; // Original note text color
    return '#000000'; // Black text as requested
  };

  // Update editText when noteText changes (for different notes)
  React.useEffect(() => {
    if (isNoteNode) {
      setEditText(noteText);
    }
  }, [noteText, isNoteNode]);

  // Move this outside the conditional to satisfy React Hook rules
  React.useEffect(() => {
    if (isNoteNode && isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing, isNoteNode]);

  // Note nodes are visual-only sticky notes with inline editing
  if (isNoteNode) {

    const handleSave = () => {
      setIsEditing(false);
      // Update the node data
      if (data.onUpdate) {
        data.onUpdate({ noteText: editText });
      }
    };

    return (
      <div
        className="relative"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        style={{
          padding: '10px',
          fontSize: '11px',
          backgroundColor: '#fef9c3', // Light yellow
          border: selected ? '2px solid #eab308' : 'none',
          outline: selected ? '2px solid rgba(234, 179, 8, 0.2)' : 'none',
          outlineOffset: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease-out',
          borderRadius: '6px',
          minWidth: '140px',
          maxWidth: '200px',
          width: 'fit-content',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          color: '#854d0e',
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          cursor: isEditing ? 'text' : 'move',
        }}
      >
        {/* Sticky note &quot;tape&quot; effect */}
        <div
          style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30px',
            height: '12px',
            backgroundColor: 'rgba(234, 179, 8, 0.3)',
            borderRadius: '2px',
          }}
        />

        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditText(noteText);
                setIsEditing(false);
              }
              // Save on Ctrl/Cmd+Enter
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleSave();
              }
              // Don't propagate to prevent ReactFlow shortcuts
              e.stopPropagation();
            }}
            className="nodrag"
            style={{
              width: '100%',
              minHeight: '40px',
              padding: '0',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '11px',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              color: '#854d0e',
              lineHeight: '1.4',
              resize: 'vertical',
            }}
          />
        ) : (
          <div
            style={{
              minHeight: '20px',
              cursor: 'move',
            }}
          >
            {noteText || 'Double-click to edit note'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{
        padding: '12px 16px',
        fontSize: '13px',
        backgroundColor: getBackgroundColor(),
        border: selected ? '2px solid #FA5D19' : '1px solid rgba(0,0,0,0.08)',
        outline: getOutlineStyle(),
        outlineOffset: 0,
        boxShadow: selected
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: '8px', // rounded-2xl
        minWidth: '180px',
        maxWidth: '280px',
        width: 'fit-content',
        // overflow: 'hidden', // Removed to prevent clipping
      }}
    >
      {/* Left Accent Bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-6 ${getNodeTheme().color.split(' ')[0]}`}
        style={{
          opacity: 0.8,
          borderTopLeftRadius: '16px',
          borderBottomLeftRadius: '16px',
        }}
      />

      {/* Input handle (left) - all nodes except 'start' and 'note' */}
      {nodeType !== 'start' && nodeType !== 'note' && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{
            width: 10,
            height: 10,
            background: '#52525b',
            border: 'none',
            borderRadius: '50%',
            left: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
          }}
        />
      )}

      <div className="flex items-center gap-12">
        <div className={`w-36 h-36 rounded-12 ${getNodeTheme().color} flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden`}>
          {(() => {
            const Icon = getNodeTheme().icon;
            return <Icon className="w-20 h-20 text-white" strokeWidth={2.5} />;
          })()}
        </div>
        <div className="flex flex-col min-w-0">
          <span style={{
            color: getTextColor(),
            fontWeight: 700,
            fontSize: '14px',
            lineHeight: '1.2',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {String(data.label)}
          </span>
          <span style={{
            color: '#71717a',
            fontSize: '10px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
            marginTop: '2px'
          }}>
            {getNodeTheme().label}
          </span>
        </div>
      </div>

      {nodeType === 'router' && Array.isArray(data.routes) && (
        <div className="absolute right-0 top-0 h-full flex flex-col justify-around pointer-events-none" style={{ width: '1px' }}>
          {(data.routes as any[]).map((route: any, index: number) => {
            // Distribute handles along the right side
            const routes = data.routes as any[];
            const total = routes.length;
            const topPercent = total > 1 ? (index / (total - 1)) * 100 : 50;
            // Clamp topPercent to avoid handles at the very edges
            const verticalPosition = total > 1 ? 15 + (index / (total - 1)) * 70 : 50;

            return (
              <React.Fragment key={route.id}>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={route.id}
                  className="pointer-events-auto"
                  style={{
                    width: 10,
                    height: 10,
                    background: '#FA5D19',
                    border: 'none',
                    borderRadius: '50%',
                    right: -6,
                    top: `${verticalPosition}%`,
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                  }}
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: `${verticalPosition}%`,
                    right: -45,
                    transform: 'translateY(-50%)',
                    fontSize: '10px',
                    color: '#FA5D19',
                    fontWeight: 600,
                    maxWidth: '40px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={route.label}
                >
                  {route.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Output handles - special cases for branching nodes */}
      {nodeType === 'if-else' ? (
        <>
          {/* If branch (left bottom) */}
          <Handle
            type="source"
            position={Position.Right}
            id="if"
            style={{
              width: 10,
              height: 10,
              background: '#FA5D19',
              border: 'none',
              borderRadius: '50%',
              right: -6,
              top: '35%',
              transform: 'translateY(-50%)',
              zIndex: 10,
            }}
          />
          {/* Else branch (right bottom) */}
          <Handle
            type="source"
            position={Position.Right}
            id="else"
            style={{
              width: 10,
              height: 10,
              background: '#52525b', // Dark gray
              border: 'none',
              borderRadius: '50%',
              right: -6,
              top: '65%',
              transform: 'translateY(-50%)',
              zIndex: 10,
            }}
          />
          {/* Branch labels */}
          <div style={{
            position: 'absolute',
            top: '35%',
            right: -50,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: '#FA5D19',
            fontWeight: 600,
          }}>If</div>
          <div style={{
            position: 'absolute',
            top: '65%',
            right: -55,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: '#18181b',
            fontWeight: 600,
          }}>Else</div>
        </>
      ) : nodeType === 'user-approval' ? (
        <>
          {/* Approve branch (left bottom) */}
          <Handle
            type="source"
            position={Position.Right}
            id="approve"
            style={{
              width: 10,
              height: 10,
              background: '#10b981',
              border: 'none',
              borderRadius: '50%',
              right: -6,
              top: '35%',
              transform: 'translateY(-50%)',
              zIndex: 10,
            }}
          />
          {/* Reject branch (right bottom) */}
          <Handle
            type="source"
            position={Position.Right}
            id="reject"
            style={{
              width: 10,
              height: 10,
              background: '#ef4444',
              border: 'none',
              borderRadius: '50%',
              right: -6,
              top: '65%',
              transform: 'translateY(-50%)',
              zIndex: 10,
            }}
          />
          {/* Branch labels */}
          <div style={{
            position: 'absolute',
            top: '35%',
            right: -70,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: '#10b981',
            fontWeight: 600,
          }}>Approve</div>
          <div style={{
            position: 'absolute',
            top: '65%',
            right: -60,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: '#ef4444',
            fontWeight: 600,
          }}>Reject</div>
        </>
      ) : nodeType === 'while' ? (
        <>
          {/* Continue branch (top) */}
          <Handle
            type="source"
            position={Position.Right}
            id="continue"
            style={{
              width: 10,
              height: 10,
              background: '#FA5D19',
              border: 'none',
              borderRadius: '50%',
              right: -6,
              top: '35%',
              transform: 'translateY(-50%)',
              zIndex: 10,
            }}
          />
          {/* Break branch (bottom) */}
          <Handle
            type="source"
            position={Position.Right}
            id="break"
            style={{
              width: 10,
              height: 10,
              background: '#52525b', // Dark gray
              border: 'none',
              borderRadius: '50%',
              right: -6,
              top: '65%',
              transform: 'translateY(-50%)',
              zIndex: 10,
            }}
          />
          {/* Branch labels */}
          <div style={{
            position: 'absolute',
            top: '35%',
            right: -70,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: '#FA5D19',
            fontWeight: 600,
          }}>Continue</div>
          <div style={{
            position: 'absolute',
            top: '65%',
            right: -55,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: '#18181b',
            fontWeight: 600,
          }}>Break</div>
        </>
      ) : nodeType !== 'end' && nodeType !== 'note' ? (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{
            width: 10,
            height: 10,
            background: '#52525b',
            border: 'none',
            borderRadius: '50%',
            right: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
          }}
        />
      ) : null}
    </div>
  );
}

// Create all node types by reusing the same component
export const nodeTypes = {
  start: CustomNode,
  'custom-input': CustomNode,
  agent: CustomNode,
  mcp: CustomNode,
  extract: CustomNode,
  end: CustomNode,
  note: CustomNode,
  logic: CustomNode,
  data: CustomNode,
  http: CustomNode,
  transform: CustomNode,
  'if-else': CustomNode,
  'while': CustomNode,
  'user-approval': CustomNode,
  'set-state': CustomNode,
  'guardrails': CustomNode,
  'router': CustomNode,
  'retriever': CustomNode,
};
