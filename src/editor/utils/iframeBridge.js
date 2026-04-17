export const iframeScript = `
  // Injected WYSIWYG Bridge Script
  let selectedElement = null;

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
  document.body.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    if (target === document.body || target === document.documentElement) return;

    const editorId = ensureId(target);
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
    const data = event.data;
    if (data.type === 'UPDATE_ELEMENT') {
      const { id, updates } = data.payload;
      const el = document.querySelector(\`[data-editor-id="\${id}"]\`);
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
        const newEl = document.createElement(updates.tag);
        // Copy attributes
        Array.from(el.attributes).forEach(attr => {
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
        const docClone = document.documentElement.cloneNode(true);
        
        // Remove temporary data-editor-id
        docClone.querySelectorAll('[data-editor-id]').forEach(node => {
          node.removeAttribute('data-editor-id');
        });
        
        // Remove highlight classes
        docClone.querySelectorAll('.wysiwyg-highlight').forEach(node => {
          node.classList.remove('wysiwyg-highlight');
          if (node.getAttribute('class') === '') {
            node.removeAttribute('class');
          }
        });
        
        // Remove the injected bridge script and styles
        const scripts = docClone.querySelectorAll('script');
        scripts.forEach(script => {
          if (script.innerHTML.includes('Injected WYSIWYG Bridge Script')) {
            script.remove();
          }
        });
        
        const styles = docClone.querySelectorAll('style');
        styles.forEach(style => {
          if (style.innerHTML.includes('wysiwyg-highlight')) {
            style.remove();
          }
        });

        const cleanHtml = '<!DOCTYPE html>\\n' + docClone.outerHTML;
        
        window.parent.postMessage({
          type: 'SAVE_CLEAN_HTML',
          payload: cleanHtml
        }, '*');
      }
    }
  });
`;

export const iframeStyle = `
  <style>
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
      cursor: pointer;
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
  const scriptInjection = `<script>${iframeScript}</script>`;
  if (rawHtml.includes('</body>')) {
    return rawHtml.replace('</body>', `${iframeStyle}${scriptInjection}</body>`);
  }
  return rawHtml + iframeStyle + scriptInjection;
}
