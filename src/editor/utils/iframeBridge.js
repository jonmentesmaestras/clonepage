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

      // Reusable function to clean the document for saving/exporting
      // Esta función debe ser ultra-conservadora para no arruinar estilos
      function cleanDocumentForExport() {
        var docClone = document.documentElement.cloneNode(true);

        // 1. Limpiar Bridge Artifacts
        docClone.querySelectorAll('[data-editor-id]').forEach(function(node) {
          node.removeAttribute('data-editor-id');
        });

        docClone.querySelectorAll('.wysiwyg-highlight').forEach(function(node) {
          node.classList.remove('wysiwyg-highlight');
          if (node.getAttribute('class') === '') node.removeAttribute('class');
        });

        docClone.querySelectorAll('[data-bridge]').forEach(function(node) { node.remove(); });

        docClone.querySelectorAll('script').forEach(function(script) {
          if (script.innerHTML.includes('Injected WYSIWYG Bridge Script')) script.remove();
        });

        docClone.querySelectorAll('style').forEach(function(style) {
          if (style.innerHTML.includes('wysiwyg-highlight')) style.remove();
        });

        // 2. Limpiar Google Translate Artifacts (Solo elementos inyectados)
        var gtSelectors = '#google_translate_element, .goog-te-banner-frame, .skiptranslate, #goog-gt-tt, .goog-te-spinner-pos, iframe.goog-te-menu-frame, .goog-te-menu-value';
        docClone.querySelectorAll(gtSelectors).forEach(function(el) { el.remove(); });
        
        docClone.querySelectorAll('script[src*="translate.google"], script[src*="element.js"]').forEach(function(el) { el.remove(); });
        
        docClone.querySelectorAll('style').forEach(function(s) {
          if (s.textContent.includes('.goog-te') || s.textContent.includes('translated')) s.remove();
        });

        // Limpiar clases de estado de GT sin borrar el atributo STYLE (crítico!)
        [docClone, docClone.querySelector('body')].forEach(function(el) {
          if (el && el.className) {
            el.className = el.className.replace(/translated-\\w+/g, '').trim();
          }
        });

        // 3. Restaurar Scripts
        docClone.querySelectorAll('script[data-original-type]').forEach(function(s) {
          s.setAttribute('type', s.getAttribute('data-original-type'));
          s.removeAttribute('data-original-type');
        });

        // 4. Restaurar Base Href original
        docClone.querySelectorAll('base[data-original-href]').forEach(function(b) {
          b.setAttribute('href', b.getAttribute('data-original-href'));
          b.removeAttribute('data-original-href');
        });

        return '<!DOCTYPE html>\\n' + docClone.outerHTML;
      }

      // Handle click to select element
      document.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var target = e.target;
        if (target === document.body || target === document.documentElement) return;
        if (target.hasAttribute && target.hasAttribute('data-bridge')) return;

        var editorId = ensureId(target);
        highlightElement(target);

        window.parent.postMessage({
          type: 'ELEMENT_SELECTED',
          payload: {
            id: editorId,
            tag: target.tagName,
            text: target.innerText || '',
            htmlContent: target.innerHTML || '',
            width: target.getAttribute('width') || target.style.width || '',
            height: target.getAttribute('height') || target.style.height || '',
            src: target.tagName === 'IMG' ? target.src : ''
          }
        }, '*');
      }, true);

      // Single message listener for all bridge commands
      window.addEventListener('message', function(event) {
        var data = event.data;

        if (data.type === 'UPDATE_ELEMENT') {
          var id = data.payload.id;
          var updates = data.payload.updates;
          var el = document.querySelector('[data-editor-id="' + id + '"]');
          if (!el) return;

          if (updates.htmlContent !== undefined && el.tagName !== 'IMG') {
            el.innerHTML = updates.htmlContent;
          } else if (updates.text !== undefined && el.tagName !== 'IMG') {
            el.innerText = updates.text;
          }

          if (updates.width !== undefined) el.style.width = updates.width;
          if (updates.height !== undefined) el.style.height = updates.height;
          if (updates.src !== undefined && el.tagName === 'IMG') {
            el.setAttribute('src', updates.src);
            el.removeAttribute('srcset');
            el.removeAttribute('sizes');
          }

          if (updates.tag && updates.tag !== el.tagName) {
            var newEl = document.createElement(updates.tag);
            Array.from(el.attributes).forEach(function(attr) {
              newEl.setAttribute(attr.name, attr.value);
            });
            newEl.innerHTML = el.innerHTML;
            el.parentNode.replaceChild(newEl, el);
            highlightElement(newEl);
          }

          if (updates.persist !== false) {
            var cleanHtml = cleanDocumentForExport();
            window.parent.postMessage({ type: 'SAVE_CLEAN_HTML', payload: cleanHtml }, '*');
          }

        } else if (data.type === 'EXTRACT_TRANSLATED_HTML') {
          var cleanHtml = cleanDocumentForExport();
          window.parent.postMessage({ type: 'TRANSLATED_HTML_EXTRACTED', payload: cleanHtml }, '*');

        } else if (data.type === 'TRANSLATE_PAGE') {
          var targetLang = data.lang || 'es';

          if (!document.getElementById('google_translate_element')) {
            var gtDiv = document.createElement('div');
            gtDiv.id = 'google_translate_element';
            gtDiv.style.display = 'none';
            document.body.appendChild(gtDiv);
          }

          window.googleTranslateElementInit = function() {
            new window.google.translate.TranslateElement({
              pageLanguage: 'auto',
              includedLanguages: targetLang,
              autoDisplay: false
            }, 'google_translate_element');
          };

          if (!document.querySelector('script[src*="translate_a/element.js"]')) {
            var gtScript = document.createElement('script');
            gtScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            gtScript.onerror = function() {
              window.parent.postMessage({ type: 'TRANSLATION_FAILED', reason: 'script_load_error' }, '*');
            };
            document.head.appendChild(gtScript);
          } else {
            if (window.google && window.google.translate) {
              window.googleTranslateElementInit();
            }
          }

          var globalTimeout = setTimeout(function() {
            window.parent.postMessage({ type: 'TRANSLATION_FAILED', reason: 'timeout' }, '*');
          }, 30000);

          var comboAttempts = 0;
          var checkInterval = setInterval(function() {
            comboAttempts++;
            if (comboAttempts > 30) {
              clearInterval(checkInterval);
              clearTimeout(globalTimeout);
              window.parent.postMessage({ type: 'TRANSLATION_FAILED', reason: 'widget_not_loaded' }, '*');
              return;
            }
            var select = document.querySelector('.goog-te-combo');
            if (select) {
              select.value = targetLang;
              select.dispatchEvent(new Event('change'));
              clearInterval(checkInterval);

              var finishAttempts = 0;
              var finishInterval = setInterval(function() {
                finishAttempts++;
                var htmlEl = document.documentElement;
                var bodyEl = document.body;
                var hasClass = htmlEl.classList.contains('translated-ltr') || bodyEl.classList.contains('translated-ltr');
                var hasFontTags = document.querySelector('font.notranslate') || document.querySelectorAll('font[style]').length > 3;

                if (hasClass || hasFontTags) {
                  clearInterval(finishInterval);
                  clearTimeout(globalTimeout);
                  window.parent.postMessage({ type: 'TRANSLATION_COMPLETE' }, '*');
                } else if (finishAttempts > 40) {
                  clearInterval(finishInterval);
                  clearTimeout(globalTimeout);
                  window.parent.postMessage({ type: 'TRANSLATION_FAILED', reason: 'translation_timeout' }, '*');
                }
              }, 500);
            }
          }, 500);
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
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
 */
export function injectEditorBridge(rawHtml) {
  const scriptInjection = `<script data-bridge="wysiwyg-script">${iframeScript}<\/script>`;
  if (rawHtml.includes('</body>')) {
    return rawHtml.replace('</body>', `${iframeStyle}${scriptInjection}</body>`);
  }
  return rawHtml + iframeStyle + scriptInjection;
}
