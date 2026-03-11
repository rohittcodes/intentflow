/**
 * Intentflow Embed SDK
 * Usage:
 * <div id="intentflow-widget" data-workflow-id="your-workflow-id"></div>
 * <script src="https://intentflow.com/embed.js"></script>
 */

(function () {
  function initIntentflowEmbeds() {
    const containers = document.querySelectorAll('#intentflow-widget, .intentflow-widget');

    containers.forEach(container => {
      // Check if already initialized
      if (container.getAttribute('data-intentflow-initialized')) {
        return;
      }

      const workflowId = container.getAttribute('data-workflow-id');
      const apiKey = container.getAttribute('data-api-key');
      const height = container.getAttribute('data-height') || '600px';
      const width = container.getAttribute('data-width') || '100%';
      const theme = container.getAttribute('data-theme') || 'light';

      if (!workflowId) {
        console.error('Intentflow Embed: Missing data-workflow-id attribute');
        container.innerHTML = '<div style="color: red; padding: 20px; border: 1px solid red; border-radius: 8px; text-align: center;">Intentflow Embed Error: Missing workflow ID</div>';
        return;
      }

      // Build the iframe URL
      // In production, this should be the actual domain (e.g., https://app.intentflow.com)
      const baseUrl = window.NEXT_PUBLIC_INTENTFLOW_DOMAIN || 'http://localhost:3000';
      let iframeUrl = `${baseUrl}/embed/${workflowId}?theme=${theme}`;
      
      if (apiKey) {
        // Warning: Passing API keys via URL params is generally discouraged for client-side embeds.
        // It's recommended to securely proxy requests through your own backend, or use restricted public keys.
        iframeUrl += `&apiKey=${encodeURIComponent(apiKey)}`;
      }

      // Create and inject the iframe
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = width;
      iframe.style.height = height;
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      iframe.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.08)';
      iframe.style.overflow = 'hidden';
      iframe.allow = 'clipboard-write; microphone; camera'; // Needed for some MCP tools

      container.appendChild(iframe);
      container.setAttribute('data-intentflow-initialized', 'true');
    });
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntentflowEmbeds);
  } else {
    initIntentflowEmbeds();
  }

  // Expose a global object for manual initialization (useful for SPA frameworks like React/Vue)
  window.Intentflow = {
    init: initIntentflowEmbeds
  };
})();
