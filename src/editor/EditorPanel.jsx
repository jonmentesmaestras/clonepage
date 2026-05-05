import { useState } from 'react';
import { useEditorStore } from './store/useEditorStore';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import { PanelLeftClose, PanelLeft, Globe, Loader2, Save } from 'lucide-react';
import { injectEditorBridge } from './utils/iframeBridge';
import { uploadHtmlToS3 } from '../utils/s3Uploader';

export default function EditorPanel() {
  const { sidebarOpen, toggleSidebar, isTranslating, isTranslated, setIsTranslating, setHtmlContent, s3HtmlKey } = useEditorStore();
  const [isSavingTranslation, setIsSavingTranslation] = useState(false);

  const handleSaveTranslation = async () => {
    const iframe = window.__EDITOR_IFRAME_REF?.current;
    if (!iframe?.contentDocument) return;

    setIsSavingTranslation(true);

    try {
      // 0. Capturar la URL base de S3 actual antes de limpiar para el editor
      // Esto es CRÍTICO para que los estilos no se rompan tras el refresco
      const currentBaseHref = iframe.contentDocument.querySelector('base')?.getAttribute('href') || '';

      // 1. Clonar el documento del iframe (captura el estado actual traducido)
      const docClone = iframe.contentDocument.documentElement.cloneNode(true);

      // 2. Limpiar SOLO artefactos de Google Translate (ultra-conservador)
      const gtSelectors = [
        '#google_translate_element',
        '.goog-te-banner-frame',
        '.skiptranslate',
        '#goog-gt-tt',
        '.goog-te-spinner-pos',
        'iframe.goog-te-menu-frame',
        '.goog-te-menu-value',
        'script[src*="translate.google"]',
        'script[src*="translate_a"]',
      ].join(', ');
      docClone.querySelectorAll(gtSelectors).forEach(el => el.remove());

      // Remover estilos inyectados por GT (solo los que mencionan .goog-te)
      docClone.querySelectorAll('style').forEach(s => {
        if (s.textContent.includes('.goog-te')) s.remove();
      });

      // Limpiar clases de estado de GT sin tocar los inline styles originales
      [docClone, docClone.querySelector('body')].forEach(el => {
        if (el && el.className) {
          el.className = el.className.replace(/translated-\w+/g, '').trim();
        }
      });

      // 3. Limpiar artefactos del bridge WYSIWYG
      docClone.querySelectorAll('[data-bridge]').forEach(n => n.remove());
      docClone.querySelectorAll('script').forEach(s => {
        if (s.innerHTML.includes('Injected WYSIWYG Bridge Script')) s.remove();
      });
      docClone.querySelectorAll('style').forEach(s => {
        if (s.innerHTML.includes('wysiwyg-highlight')) s.remove();
      });
      docClone.querySelectorAll('[data-editor-id]').forEach(n => {
        n.removeAttribute('data-editor-id');
      });
      docClone.querySelectorAll('.wysiwyg-highlight').forEach(n => {
        n.classList.remove('wysiwyg-highlight');
        if (n.getAttribute('class') === '') n.removeAttribute('class');
      });

      // 4. Restaurar scripts originales (para S3)
      docClone.querySelectorAll('script[data-original-type]').forEach(s => {
        s.setAttribute('type', s.getAttribute('data-original-type'));
        s.removeAttribute('data-original-type');
      });

      // 5. Restaurar base href original (para S3)
      docClone.querySelectorAll('base[data-original-href]').forEach(b => {
        b.setAttribute('href', b.getAttribute('data-original-href'));
        b.removeAttribute('data-original-href');
      });

      // 6. Serializar HTML para S3
      const cleanHtml = '<!DOCTYPE html>\n' + docClone.outerHTML;

      // 7. Subir a S3 usando el key canonico definido en clonación
      const uploadKey = s3HtmlKey || 'index.html';
      await uploadHtmlToS3(cleanHtml, uploadKey);

      // 8. Re-preparar HTML para el Editor (bloquear scripts + base S3)
      // Esto garantiza que el editor siga viendo los estilos tras el refresco
      const parser = new DOMParser();
      const editorDoc = parser.parseFromString(cleanHtml, 'text/html');
      
      editorDoc.querySelectorAll('script').forEach(s => {
        s.setAttribute('data-original-type', s.type || 'text/javascript');
        s.type = 'javascript/blocked';
      });

      let baseTag = editorDoc.querySelector('base');
      if (baseTag) {
        baseTag.setAttribute('data-original-href', baseTag.getAttribute('href') || '');
        baseTag.setAttribute('href', currentBaseHref);
      } else if (currentBaseHref) {
        baseTag = editorDoc.createElement('base');
        baseTag.setAttribute('href', currentBaseHref);
        baseTag.setAttribute('data-bridge', 'base-url');
        editorDoc.head.insertBefore(baseTag, editorDoc.head.firstChild);
      }

      const editorHtml = '<!DOCTYPE html>\n' + editorDoc.documentElement.outerHTML;
      
      // Actualizar el store -> Canvas.jsx refresca el iframe con el bridge inyectado
      setHtmlContent(injectEditorBridge(editorHtml));

      // 9. Refrescar vista previa con un pequeño delay para asegurar propagación de S3
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('preview-refresh'));
      }, 500);

      setIsSavingTranslation(false);
      console.log('✅ Traducción guardada, estilos preservados y editor refrescado.');
    } catch (err) {
      console.error('Error guardando traducción:', err);
      setIsSavingTranslation(false);
      alert('Error al guardar: ' + err.message);
    }
  };

  return (
    <div className="flex w-full h-full bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div 
        className={`${sidebarOpen ? 'w-[370px] border-r border-gray-200' : 'w-0'} 
        bg-white h-full transition-all duration-300 ease-in-out shrink-0 overflow-y-auto`}
      >
        <Sidebar />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 h-full relative flex flex-col bg-gray-100 min-w-0">
        
        {/* Topbar / Toggle control */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0">
          <button 
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title={sidebarOpen ? "Ocultar panel" : "Mostrar panel"}
          >
            {sidebarOpen ? <PanelLeftClose size={20}/> : <PanelLeft size={20}/>}
          </button>
          <span className="ml-4 font-semibold text-gray-700">WYSIWYG Editor</span>
          <button
            onClick={() => {
              setIsTranslating(true);
              window.__EDITOR_IFRAME_REF?.current?.contentWindow.postMessage(
                { type: 'TRANSLATE_PAGE', lang: 'es' }, '*'
              );
            }}
            disabled={isTranslating || isTranslated}
            className={`ml-auto flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isTranslated ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {isTranslated ? '✅ Traducido' : isTranslating ? 'Traduciendo...' : '🌐 Traducir a Español'}
          </button>

          {isTranslated && (
            <button
              onClick={handleSaveTranslation}
              disabled={isSavingTranslation}
              className="ml-2 flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSavingTranslation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
              {isSavingTranslation ? 'Guardando...' : '💾 Guardar Traducción'}
            </button>
          )}
        </div>

        {/* Canvas Background Space */}
        <div className="flex-1 overflow-auto p-4 w-full h-full flex justify-center items-center">
           {/* A wrapper that acts like a browser window around the iframe */}
           <div className="w-[100%] max-w-6xl h-full shadow-2xl bg-white flex flex-col rounded-md overflow-hidden ring-1 ring-black/5">
              <Canvas />
           </div>
        </div>
      </div>
    </div>
  );
}
