import { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { injectEditorBridge } from '../utils/iframeBridge';
import { UploadCloud, FileEdit, Wand2 } from 'lucide-react';
import { uploadHtmlToS3 } from '../../utils/s3Uploader';

export default function Canvas() {
  const { htmlContent, setHtmlContent, setSelectedElement, setFileHandle } = useEditorStore();
  const iframeRef = useRef(null);
  const prevHtmlRef = useRef(htmlContent);
  
  // Estado local para el srcDoc del iframe.
  // Evita parpadeos al guardar, pero se sincroniza cuando el store recibe HTML nuevo (ej. post-clonación).
  const [iframeData, setIframeData] = useState(htmlContent);

  // Sincronizar iframeData cuando htmlContent del store cambia (nueva clonación, carga de archivo, etc.)
  useEffect(() => {
    if (htmlContent !== prevHtmlRef.current) {
      prevHtmlRef.current = htmlContent;
      setIframeData(htmlContent);
    }
  }, [htmlContent]);

  // Expose iframeRef globally so Sidebar can send messages to it
  useEffect(() => {
    window.__EDITOR_IFRAME_REF = iframeRef;
    
    const handleMessage = async (event) => {
      if (event.data?.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.payload);
      }
      
      if (event.data?.type === 'SAVE_CLEAN_HTML') {
        const cleanHtml = event.data.payload;
        const { setIsSaving, setSaveProgress } = useEditorStore.getState();
        
        try {
          setIsSaving(true);
          setSaveProgress(30); // Inicio de proceso
          
          await uploadHtmlToS3(cleanHtml);
          
          // Guardar el código más reciente en el estado global (memoria)
          // para cuando el usuario cambie de pestañas entre "Editor" y "Vista Previa".
          // Al usar Zustand de esta manera, actualiza la memoria sin obligar al iframe a recargar su 'srcDoc'
          useEditorStore.getState().setHtmlContent(injectEditorBridge(cleanHtml));
          
          setSaveProgress(100); // Éxito
          setTimeout(() => {
            setIsSaving(false);
            setSaveProgress(0);
          }, 1500);
          
          console.log('📝 Modificaciones guardadas de manera persistente en S3 y en memoria.');
        } catch (err) {
          console.error('Error al guardar en S3:', err);
          alert('Hubo un error al guardar los cambios en la nube.');
          setIsSaving(false);
          setSaveProgress(0);
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
      const rawContent = await file.text();
      const injected = injectEditorBridge(rawContent);
      setHtmlContent(injected);
      setIframeData(injected);
    } catch (err) {
      console.error('Error al seleccionar el archivo', err);
    }
  };

  if (!iframeData) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
        <div className="text-center max-w-sm">
          <Wand2 className="mx-auto h-12 w-12 text-purple-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Editor listo</h3>
          <p className="mt-1 text-sm text-gray-500">
            Genera una página desde el panel izquierdo y el editor cargará automáticamente el HTML clonado.
          </p>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-400 mb-3">¿O prefieres cargar un archivo local?</p>
            <button
              onClick={handleOpenFilePicker}
              className="cursor-pointer inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 gap-2"
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
        srcDoc={iframeData}
        className="w-full h-full border-0"
        title="Editor Canvas"
        sandbox="allow-same-origin allow-scripts allow-popups allow-modals"
        onLoad={() => {
          console.log('✅ Editor iframe loaded');
          // Re-register the ref globally when iframe reloads
          window.__EDITOR_IFRAME_REF = iframeRef;
        }}
      />
    </div>
  );
}
