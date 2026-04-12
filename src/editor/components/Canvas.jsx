import { useRef, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { iframeScript, iframeStyle } from '../utils/iframeBridge';
import { UploadCloud, FileEdit } from 'lucide-react';

export default function Canvas() {
  const { htmlContent, setHtmlContent, setSelectedElement, setFileHandle } = useEditorStore();
  const iframeRef = useRef(null);

  // Expose iframeRef globally so Sidebar can send messages to it
  useEffect(() => {
    window.__EDITOR_IFRAME_REF = iframeRef;
    
    const handleMessage = async (event) => {
      if (event.data?.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.payload);
      }
      
      if (event.data?.type === 'SAVE_CLEAN_HTML') {
        const cleanHtml = event.data.payload;
        
        const currentHandle = useEditorStore.getState().fileHandle;
        if (currentHandle) {
          try {
            // Native File System Access API write back!
            const writable = await currentHandle.createWritable();
            await writable.write(cleanHtml);
            await writable.close();
            console.log('📝 Modificaciones guardadas de manera persistente en disco.');
          } catch (err) {
            console.error('Ocurrió un error al guardar o el usuario denegó permiso', err);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setSelectedElement]);

  const handleOpenFilePicker = async () => {
    try {
      // Pedimos permiso para abrir y adquirir el token (handle)
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Archivos HTML',
          accept: { 'text/html': ['.html'] }
        }]
      });
      
      setFileHandle(handle);
      const file = await handle.getFile();
      let content = await file.text();
      
      // Inject bridge script and styles before closing </body> or </html>
      const scriptInjection = `<script>${iframeScript}</script>`;
      
      if (content.includes('</body>')) {
        content = content.replace('</body>', `${iframeStyle}${scriptInjection}</body>`);
      } else {
        content += iframeStyle + scriptInjection;
      }
      
      setHtmlContent(content);
    } catch (err) {
      console.error('Error al seleccionar el archivo', err);
    }
  };

  if (!htmlContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Cargar plantilla</h3>
          <p className="mt-1 text-sm text-gray-500">Abre un archivo index.html para edición nativa en disco.</p>
          <div className="mt-6">
            <button 
              onClick={handleOpenFilePicker}
              className="cursor-pointer inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 gap-2"
            >
              <FileEdit size={16} /> Seleccionar archivo HTML
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white shadow-lg overflow-hidden flex flex-col">
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        className="w-full h-full border-0"
        title="Editor Canvas"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}
