import { WorkflowNode, WorkflowState } from "../types";

/**
 * Memory Node Executor
 * Handles persistent context management within workflows
 */
export async function executeMemoryNode(
  node: WorkflowNode,
  state: WorkflowState
): Promise<any> {
  const { memoryOperation, memoryKey, memoryValue, memoryScope = 'thread' } = node.data;

  if (!memoryKey && memoryOperation !== 'clear') {
    throw new Error("Memory key is required for this operation");
  }

  // Currently, we're using thread-level state (state.variables)
  // In a future update, 'user' scope can be backed by a database
  const targetState = state.variables;

  // Initialize memory state if needed
  if (!state.memory) {
    state.memory = {};
  }

  const updateInjection = (val: any) => {
    if (node.data.injectIntoAI && memoryKey) {
      state.memory![memoryKey] = val;
    }
  };

  switch (memoryOperation) {
    case 'store':
      targetState[memoryKey!] = memoryValue;
      updateInjection(memoryValue);
      return {
        success: true,
        message: `Stored value under key: ${memoryKey}`,
        value: memoryValue
      };

    case 'retrieve':
      const value = targetState[memoryKey!];
      return {
        success: true,
        message: `Retrieved value for key: ${memoryKey}`,
        value: value
      };

    case 'append':
      const existing = targetState[memoryKey!] || "";
      const newValue = Array.isArray(existing)
        ? [...existing, memoryValue]
        : typeof existing === 'string'
          ? existing + memoryValue
          : [existing, memoryValue];

      targetState[memoryKey!] = newValue;
      updateInjection(newValue);
      return {
        success: true,
        message: `Appended value to key: ${memoryKey}`,
        value: newValue
      };

    case 'clear':
      if (memoryKey) {
        delete targetState[memoryKey];
        if (state.memory) delete state.memory[memoryKey];
        return { success: true, message: `Cleared memory for key: ${memoryKey}` };
      } else {
        // Clear all (use with caution)
        state.variables = { input: state.variables.input, lastOutput: state.variables.lastOutput };
        if (state.memory) state.memory = {};
        return { success: true, message: "Cleared all thread memory" };
      }

    default:
      throw new Error(`Unknown memory operation: ${memoryOperation}`);
  }
}
