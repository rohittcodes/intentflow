import { WorkflowNode, WorkflowState } from '../types';
import { substituteVariables } from '../variable-substitution';

/**
 * Execute HTTP Request Node
 */
export async function executeHTTPNode(
  node: WorkflowNode,
  state: WorkflowState,
  connectors: any[] = []
): Promise<any> {
  const { data } = node;
  const nodeData = data as any;

  try {
    // Substitute variables in URL
    let url = substituteVariables(nodeData.httpUrl || '', state);
    let method = nodeData.httpMethod || 'GET';
    const connectorId = nodeData.connectorId;

    // Resolve connector if provided
    if (connectorId) {
      const connector = connectors.find(c => c._id === connectorId || c.id === connectorId);
      if (connector) {
        console.log(`🔗 Using connector: ${connector.name} (${connector.type})`);
        // If it's a knowledge source/API connector, it might have a base URL
        if (connector.config?.url) {
          // If node URL is relative, prepend base URL. If it's empty, use base URL.
          const baseUrl = connector.config.url.endsWith('/') ? connector.config.url.slice(0, -1) : connector.config.url;
          if (!url) {
            url = baseUrl;
          } else if (url.startsWith('/')) {
            url = `${baseUrl}${url}`;
          } else if (!url.startsWith('http')) {
            url = `${baseUrl}/${url}`;
          }
        }
      }
    }

    // Build headers
    const headers: Record<string, string> = {};

    if (nodeData.httpHeaders && Array.isArray(nodeData.httpHeaders)) {
      nodeData.httpHeaders.forEach((h: any) => {
        if (h.key && h.value) {
          headers[h.key] = substituteVariables(h.value, state);
        }
      });
    }

    // Add authentication from connector
    if (connectorId) {
      const connector = connectors.find(c => c._id === connectorId || c.id === connectorId);
      if (connector && connector.config?.auth) {
        const auth = connector.config.auth;
        if (auth.type === 'bearer' && auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        } else if (auth.type === 'api-key' && auth.token) {
          const keyName = auth.keyName || 'X-API-Key';
          headers[keyName] = auth.token;
        } else if (auth.type === 'basic' && auth.username && auth.password) {
          headers['Authorization'] = `Basic ${btoa(`${auth.username}:${auth.password}`)}`;
        }
      }
    }

    // Add node-specific authentication (overrides connector)
    if (nodeData.httpAuthType === 'bearer' && nodeData.httpAuthToken) {
      headers['Authorization'] = `Bearer ${nodeData.httpAuthToken}`;
    } else if (nodeData.httpAuthType === 'api-key' && nodeData.httpAuthToken) {
      headers['X-API-Key'] = nodeData.httpAuthToken;
    } else if (nodeData.httpAuthType === 'basic' && nodeData.httpAuthToken) {
      headers['Authorization'] = `Basic ${btoa(nodeData.httpAuthToken)}`;
    }

    // Build request body
    let body: string | undefined = undefined;
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && nodeData.httpBody) {
      body = substituteVariables(nodeData.httpBody, state);
    }

    console.log('HTTP Request:', { method, url, headers, body });

    // Make the request
    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    const responseData = await response.json().catch(() => response.text());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries((response.headers as any).entries()),
      data: responseData,
      url,
      method,
    };
  } catch (error) {
    console.error('HTTP request error:', error);
    throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
