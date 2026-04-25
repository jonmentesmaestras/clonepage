export const iframeScript = `
  // Injected WYSIWYG Bridge Script
  (function() {
    let selectedElement = null;

    function boot() {
      console.log('🔧 WYSIWYG Bridge activo — listo para edición');

      // Force interactivity: neutralize any CSS that blocks clicks
      const forceStyle = document.createElement('style');
      forceStyle.setAttribute('data-bridge', 'force-interactive');
      forceStyle.textContent = [
        '* { pointer-events: auto !important; user-select: auto !important; }',
        'body { cursor: default !important; }',
        'body * { cursor: pointer !important; }',
        // Disable fixed overlays that landing pages may include
        '[style*="position: fixed"], [style*="position:fixed"] {',
        '  pointer-events: none !important;',
        '  z-index: -1 !important;',
        '}',
      ].join('\\n');
      document.head.appendChild(forceStyle);

      // Also remove any preact/browser-injected overlays that could interfere
      const overlays = document.querySelectorAll('#preact-border-shadow-host, [data-overlay]');
      overlays.forEach(function(el) { el.remove(); });

      // Function to apply a visually distinctive highlight
      function highlightElement(el) {
        if (selectedElement) {
          selectedElement.classList.remove('wysiwyg-highlight');
        }
        selectedElement = el;
        selectedElement.classList.add('wysiwyg-highlight');
      }

      // Ensure every node has a unique ID for referencing from React
      function ensureId(el) {
        if (!el.getAttribute('data-editor-id')) {
          el.setAttribute('data-editor-id', 'id_' + Math.random().toString(36).substr(2, 9));
        }
        return el.getAttribute('data-editor-id');
      }

      // Handle click to select element
      document.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var target = e.target;
        if (target === document.body || target === document.documentElement) return;
        
        // Skip bridge-injected elements
        if (target.hasAttribute && target.hasAttribute('data-bridge')) return;

        var editorId = ensureId(target);
        highlightElement(target);

        // Send data back to the parent React app
        window.parent.postMessage({
          type: 'ELEMENT_SELECTED',
          payload: {
            id: editorId,
            tag: target.tagName,
            text: target.innerText || '',
            htmlContent: target.innerHTML || '',
            width: target.getAttribute('width') || target.style.width || '',
            height: target.getAttribute('height') || target.style.height || '',
            src: target.tagName === 'IMG' ? target.getAttribute('src') : ''
          }
        }, '*');
      }, true);

      // Listen for updates from React to apply to the DOM
      window.addEventListener('message', function(event) {
        var data = event.data;
        if (data.type === 'UPDATE_ELEMENT') {
          var id = data.payload.id;
          var updates = data.payload.updates;
          var el = document.querySelector('[data-editor-id="' + id + '"]');
          if (!el) return;

          // Inyectar HTML Rico o texto simple
          if (updates.htmlContent !== undefined && el.tagName !== 'IMG') {
            el.innerHTML = updates.htmlContent;
          } else if (updates.text !== undefined && el.tagName !== 'IMG') {
            el.innerText = updates.text;
          }
          
          if (updates.width !== undefined) {
            el.style.width = updates.width;
          }
          if (updates.height !== undefined) {
            el.style.height = updates.height;
          }
          if (updates.src !== undefined && el.tagName === 'IMG') {
            el.setAttribute('src', updates.src);
            el.removeAttribute('srcset');
            el.removeAttribute('sizes');
          }

          // If Tag changes (e.g. H2 -> H3), we must replace the element
          if (updates.tag && updates.tag !== el.tagName) {
            var newEl = document.createElement(updates.tag);
            // Copy attributes
            Array.from(el.attributes).forEach(function(attr) {
              newEl.setAttribute(attr.name, attr.value);
            });
            newEl.innerHTML = el.innerHTML;
            el.parentNode.replaceChild(newEl, el);
            
            // Re-highlight the new element
            highlightElement(newEl);
          }

          // --- PERSISTENCE: Clean and save ---
          if (updates.persist !== false) {
            // Clone the document to safely clean it without destroying the user's view
            var docClone = document.documentElement.cloneNode(true);
            
            // Remove temporary data-editor-id
            docClone.querySelectorAll('[data-editor-id]').forEach(function(node) {
              node.removeAttribute('data-editor-id');
            });
            
            // Remove highlight classes
            docClone.querySelectorAll('.wysiwyg-highlight').forEach(function(node) {
              node.classList.remove('wysiwyg-highlight');
              if (node.getAttribute('class') === '') {
                node.removeAttribute('class');
              }
            });
            
            // Remove ALL bridge-injected elements (scripts, styles)
            docClone.querySelectorAll('[data-bridge]').forEach(function(node) {
              node.remove();
            });
            
            var scripts = docClone.querySelectorAll('script');
            scripts.forEach(function(script) {
              if (script.innerHTML.includes('Injected WYSIWYG Bridge Script')) {
                script.remove();
              }
            });
            
            var styles = docClone.querySelectorAll('style');
            styles.forEach(function(style) {
              if (style.innerHTML.includes('wysiwyg-highlight')) {
                style.remove();
              }
            });

            var cleanHtml = '<!DOCTYPE html>\\n' + docClone.outerHTML;
            
            window.parent.postMessage({
              type: 'SAVE_CLEAN_HTML',
              payload: cleanHtml
            }, '*');
          }
        }
      });
    }

    // Ensure bridge boots after DOM is fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      // DOM already loaded (e.g. script at end of body)
      boot();
    }
  })();
`;

export const iframeStyle = `
  <style data-bridge="wysiwyg-styles">
    .wysiwyg-highlight {
      outline: 2px solid #ed4ddc !important;
      outline-offset: 4px !important;
      cursor: pointer !important;
      transition: outline-color 0.2s ease;
    }
    
    .wysiwyg-highlight:hover {
      outline-color: #ff85f4 !important;
    }

    body * {
      cursor: pointer !important;
      pointer-events: auto !important;
    }

    /* Disable fixed-position overlays from cloned landing pages */
    [style*="position: fixed"],
    [style*="position:fixed"] {
      pointer-events: none !important;
      z-index: -1 !important;
    }
  </style>
`;

/**
 * Inyecta el script y estilos del bridge WYSIWYG en un string HTML raw.
 * Función compartida para Canvas.jsx (file picker) y App.jsx (respuesta del servidor).
 * @param {string} rawHtml - HTML sin bridge inyectado
 * @returns {string} - HTML con bridge listo para usarse en el editor
 */
export function injectEditorBridge(rawHtml) {
  const scriptInjection = `<script data-bridge="wysiwyg-script">${iframeScript}<\/script>`;
  if (rawHtml.includes('</body>')) {
    return rawHtml.replace('</body>', `${iframeStyle}${scriptInjection}</body>`);
  }
  return rawHtml + iframeStyle + scriptInjection;
}
