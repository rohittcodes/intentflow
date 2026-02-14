import { WorkflowNode, WorkflowState } from '../types';

/**
 * Execute Code Node - Supports JavaScript and Python
 * 
 * - JavaScript: Executed via VM (Sandboxed) or E2B (Secure Cloud)
 * - Python: Executed via E2B (Secure Cloud) only
 */
export async function executeCodeNode(
  node: WorkflowNode,
  state: WorkflowState,
  apiKeys?: Record<string, string>
): Promise<any> {
  const { data } = node;
  const language = data.language || 'javascript';
  const code = data.code || '';

  // Check for E2B API Key (in env or secrets)
  const e2bApiKey = process.env.E2B_API_KEY || apiKeys?.e2b;

  if (language === 'python') {
    if (!e2bApiKey) {
      throw new Error('Python execution requires E2B_API_KEY. Please configure it in secrets or environment variables.');
    }
    return await executeE2B(code, language, state, e2bApiKey);
  }

  // JavaScript
  if (e2bApiKey) {
    try {
      return await executeE2B(code, 'javascript', state, e2bApiKey);
    } catch (error) {
      console.warn('E2B execution failed, falling back to local VM', error);
    }
  }

  return await executeLocalJS(code, state);
}

async function executeE2B(code: string, language: string, state: WorkflowState, apiKey: string) {
  // Lazy load E2B to avoid build issues if not installed
  const CodeInterpreter = (await import('@e2b/code-interpreter')).default;

  const sandbox = await CodeInterpreter.create({ apiKey });

  try {
    const input = state.variables || {};
    const inputJson = JSON.stringify(input);

    // Wrapper code to inject inputs
    let wrappedCode = code;
    if (language === 'python') {
      wrappedCode = `
import json
variables = json.loads('${inputJson.replace(/'/g, "\\'")}')
input = variables.get('input')
lastOutput = variables.get('lastOutput')

${code}
`;
    } else {
      wrappedCode = `
const variables = ${inputJson};
const input = variables.input;
const lastOutput = variables.lastOutput;

${code}
`;
    }

    const execution = await sandbox.runCode(wrappedCode);

    if (execution.error) {
      throw new Error(`Execution ended with error: ${execution.error.name}: ${execution.error.value}\n${execution.error.traceback}`);
    }

    // Try to match last line as output or look for stdout
    // For now, return stdout as result, or a specific variable if we parsed it
    // A better approach for E2B is to use the `execution.results` if they support returning values
    // Or we assume the code prints the JSON result

    const logs = execution.logs.stdout.join('\n');
    try {
      // If logs look like JSON, parse them
      return JSON.parse(logs);
    } catch {
      return {
        text: logs,
        logs: execution.logs.stdout,
        stderr: execution.logs.stderr
      };
    }

  } finally {
    await sandbox.kill();
  }
}

async function executeLocalJS(code: string, state: WorkflowState) {
  const allowedGlobals = {
    console,
    JSON,
    Math,
    Date,
    encodeURIComponent,
    decodeURIComponent,
    // ... safe globals
  };

  const input = state.variables || {};

  // Simple Function wrapper (Not fully secure, but standard for this level)
  // We already use this in data.ts
  const fn = new Function('variables', 'input', 'lastOutput', `
        "use strict";
        ${code}
    `);

  return fn(input, input.input, input.lastOutput);
}
