import { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Edit2, Image as ImageIcon, CheckCircle, ChevronDown, AlignLeft, Trash2 } from 'lucide-react';
import JoditEditor from 'jodit-react';
import ImageModal from './ImageModal';

export default function Sidebar() {
  const { selectedElement, updateElementData, isSaving, saveProgress } = useEditorStore();
  
  // Local state for the form inputs
  const [formData, setFormData] = useState({ text: '', htmlContent: '', tag: '', width: '', height: '', src: '' });
  const [accordionOpen, setAccordionOpen] = useState(true);

  // Media Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localImageFile, setLocalImageFile] = useState(null);

  // Sync form data when the selected element changes
  useEffect(() => {
    if (selectedElement) {
      setFormData({
        text: selectedElement.text || '',
        htmlContent: selectedElement.htmlContent || '',
        tag: selectedElement.tag || '',
        width: selectedElement.width || '',
        height: selectedElement.height || '',
        src: selectedElement.src || ''
      });
      setLocalImageFile(null);
    }
  }, [selectedElement]);

  const joditConfig = useMemo(() => ({
    readonly: false,
    toolbarAdaptive: false,
    buttons: "paragraph,bold,italic,underline,ul,ol,link,|,strikethrough,hr,brush,eraser,copyformat,symbol,indent,outdent,undo,redo,source"
  }), []);

  // Handle saving data back to the iframe
  const handleSave = async () => {
    if (!selectedElement || !window.__EDITOR_IFRAME_REF?.current) return;
    
    // The Progress and isSaving state is now managed globally by Canvas.jsx
    // upon receiving the SAVE_CLEAN_HTML event triggered by the message below.
    
    let finalUpdates = { ...formData, persist: true };
  
    // Lógica de subida de imagen externa
    if (selectedElement.tag === 'IMG' && localImageFile) {
        useEditorStore.getState().setIsSaving(true);
        useEditorStore.getState().setSaveProgress(10);
        
        const payload = new FormData();
        payload.append('bucket_name', 'pulpo-landing-demo-9c9676');
        payload.append('key', localImageFile.name || 'image.png');
        payload.append('image', localImageFile);
        
        try {
            console.log("Iniciando subida de imagen...");
            const res = await fetch('http://127.0.0.1:5000/api/upload-image', {
                method: 'POST',
                body: payload
            });
            const data = await res.json();
            console.log("Respuesta subida imagen S3:", data);
            
            if (data.error === "false" || data.error === false || data.image_url) {
                console.log("Sustituyendo el src antiguo por:", data.image_url);
                finalUpdates.src = data.image_url; // 2. debe cambiar en el editor la imagen antigua por la nueva
                setLocalImageFile(null); 
            } else {
                throw new Error(data.message || 'Error al subir la imagen.');
            }
        } catch(e) {
            console.error('Error uploading image', e);
            alert('Hubo un error subiendo la imagen al servidor: ' + e.message);
            useEditorStore.getState().setIsSaving(false);
            useEditorStore.getState().setSaveProgress(0);
            return;
        }
    }
  
    // Send message to the iframe to update the real DOM and trigger SAVE_CLEAN_HTML
    window.__EDITOR_IFRAME_REF.current.contentWindow.postMessage({
      type: 'UPDATE_ELEMENT',
      payload: {
        id: selectedElement.id,
        updates: finalUpdates
      }
    }, '*');
  
    // Update global store
    updateElementData(finalUpdates);
    
    // El feedback visual de "¡Guardado! ✅" lo manejamos en el render del botón basado en el progreso
  };

  // Live Sync for the Rich Text Editor
  const handleRteChange = (newHtml) => {
    setFormData(prev => ({ ...prev, htmlContent: newHtml }));
    
    if (window.__EDITOR_IFRAME_REF?.current) {
      window.__EDITOR_IFRAME_REF.current.contentWindow.postMessage({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: selectedElement.id,
          updates: { htmlContent: newHtml, tag: formData.tag, persist: false }
        }
      }, '*');
    }
  };

  if (!selectedElement) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 h-full">
        <AlignLeft className="w-12 h-12 mb-4 opacity-30" />
        <p>Selecciona un elemento en el lienzo para comenzar a editar.</p>
      </div>
    );
  }

  const isRichTextNode = ['P', 'DIV', 'SPAN'].includes(selectedElement.tag);
  const isTextNode = ['H1','H2','H3','H4','H5','H6'].includes(selectedElement.tag);
  const isImageNode = selectedElement.tag === 'IMG';

  const getTitle = () => {
    if (isImageNode) return 'Editar Imagen';
    if (isRichTextNode) return 'Editar Editor de texto';
    return 'Editar Encabezado';
  };

  const getAccordionTitle = () => {
    if (isImageNode) return 'Imagen';
    if (isRichTextNode) return 'Editor de texto';
    return 'Encabezado';
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 select-none">
      {/* Sidebar Header */}
      <div className="flex items-center justify-center p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-800 text-sm">
          {getTitle()}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        <button className="flex-1 py-3 border-b-2 border-slate-800 text-slate-800 flex justify-center items-center gap-2 text-xs font-medium">
          {isImageNode ? <ImageIcon size={14}/> : <Edit2 size={14}/>} Contenido
        </button>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* Accordion Toggle */}
        <div 
          className="flex justify-between items-center cursor-pointer py-2 border-b border-gray-100"
          onClick={() => setAccordionOpen(!accordionOpen)}
        >
          <span className="font-semibold text-sm text-gray-700">
            {getAccordionTitle()}
          </span>
          <ChevronDown size={16} className={`transition-transform duration-200 ${accordionOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Accordion Body */}
        {accordionOpen && (
          <div className="flex flex-col gap-4 mt-2">
            
            {/* RICH TEXT EDITOR */}
            {isRichTextNode && (
               <div className="flex flex-col gap-4">
                 <div className="[&_.jodit-wysiwyg]:!text-gray-900">
                   <JoditEditor
                     value={formData.htmlContent}
                     config={joditConfig}
                     onChange={handleRteChange}
                   />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-xs font-medium text-gray-500">Etiqueta HTML</label>
                   <select 
                     className="w-full text-sm border border-gray-300 rounded p-2 outline-none focus:border-blue-500"
                     value={formData.tag}
                     onChange={(e) => setFormData({...formData, tag: e.target.value})}
                   >
                     {['P', 'SPAN', 'DIV'].map(t => (
                       <option key={t} value={t}>{t}</option>
                     ))}
                   </select>
                 </div>
               </div>
            )}

            {/* NORMAL TEXT FIELDS */}
            {isTextNode && (
               <>
                 <div className="flex flex-col gap-1">
                   <label className="text-xs font-medium text-gray-500">Título</label>
                   <textarea 
                     rows={4}
                     className="w-full text-sm border border-gray-300 rounded p-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                     value={formData.text}
                     onChange={(e) => {
                       const val = e.target.value;
                       setFormData({...formData, text: val});
                       if (window.__EDITOR_IFRAME_REF?.current) {
                         window.__EDITOR_IFRAME_REF.current.contentWindow.postMessage({
                           type: 'UPDATE_ELEMENT',
                           payload: {
                             id: selectedElement.id,
                             updates: { text: val, tag: formData.tag, persist: false }
                           }
                         }, '*');
                       }
                     }}
                   />
                 </div>

                 <div className="flex flex-col gap-1">
                   <label className="text-xs font-medium text-gray-500">Etiqueta HTML</label>
                   <select 
                     className="w-full text-sm border border-gray-300 rounded p-2 outline-none focus:border-blue-500"
                     value={formData.tag}
                     onChange={(e) => setFormData({...formData, tag: e.target.value})}
                   >
                     {['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map(t => (
                       <option key={t} value={t}>{t}</option>
                     ))}
                   </select>
                 </div>
               </>
            )}

            {/* IMAGE FIELDS */}
            {isImageNode && (
               <>
                 {/* Image Preview & Upload Control */}
                 <div className="mb-2 relative group rounded overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center min-h-[120px]">
                   {formData.src ? (
                       <img src={formData.src} alt="Vista previa" className="max-h-[160px] object-contain w-full" />
                   ) : (
                       <div className="text-gray-400 text-xs">Sin imagen</div>
                   )}
                   
                   {/* Hover Overlay */}
                   <div 
                     className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                     onClick={() => setIsModalOpen(true)}
                   >
                     <span className="text-white text-sm font-medium flex items-center gap-2"><ImageIcon size={16}/> Seleccionar imagen</span>
                   </div>

                   {/* Delete Btn */}
                   <button 
                     className="absolute bottom-2 right-2 p-1.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                     onClick={(e) => {
                        e.stopPropagation();
                        setFormData({...formData, src: ''});
                        setLocalImageFile(null);
                        window.__EDITOR_IFRAME_REF?.current?.contentWindow.postMessage({
                           type: 'UPDATE_ELEMENT',
                           payload: { id: selectedElement.id, updates: { src: '', persist: false } }
                        }, '*');
                     }}
                     title="Eliminar imagen"
                   >
                     <Trash2 size={14} />
                   </button>
                 </div>
                 
                 <div className="flex flex-col gap-1">
                   <label className="text-xs font-medium text-gray-500">Ancho (ej: 100%, 200px)</label>
                   <input 
                     type="text"
                     className="w-full text-sm border border-gray-300 rounded p-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                     value={formData.width}
                     onChange={(e) => {
                       const val = e.target.value;
                       setFormData({...formData, width: val});
                       if (window.__EDITOR_IFRAME_REF?.current) {
                         window.__EDITOR_IFRAME_REF.current.contentWindow.postMessage({
                           type: 'UPDATE_ELEMENT',
                           payload: { id: selectedElement.id, updates: { width: val, persist: false } }
                         }, '*');
                       }
                     }}
                     placeholder="Ninguno"
                   />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-xs font-medium text-gray-500">Alto (ej: auto, 150px)</label>
                   <input 
                     type="text"
                     className="w-full text-sm border border-gray-300 rounded p-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                     value={formData.height}
                     onChange={(e) => {
                       const val = e.target.value;
                       setFormData({...formData, height: val});
                       if (window.__EDITOR_IFRAME_REF?.current) {
                         window.__EDITOR_IFRAME_REF.current.contentWindow.postMessage({
                           type: 'UPDATE_ELEMENT',
                           payload: { id: selectedElement.id, updates: { height: val, persist: false } }
                         }, '*');
                       }
                     }}
                     placeholder="Ninguno"
                   />
                 </div>
               </>
            )}

          </div>
        )}

      </div>

      {/* Save Button */}
      <div className="p-4 border-t border-gray-200">
        {isSaving && (
          <div className="mb-3">
             <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                <span>Guardando cambios...</span>
                <span>{saveProgress}%</span>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full transition-all duration-500 ease-out" 
                  style={{ width: `${saveProgress}%` }}
                ></div>
             </div>
          </div>
        )}

        <button
          id="save-btn" 
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full flex items-center justify-center gap-2 text-white font-medium py-3 rounded text-sm transition-all duration-300 ${
            isSaving 
            ? 'bg-slate-400 cursor-not-allowed' 
            : saveProgress === 100 
              ? 'bg-green-600' 
              : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {isSaving ? (
            <>Publicando...</>
          ) : saveProgress === 100 ? (
            <>¡Guardado! ✅</>
          ) : (
            <>Guardar <CheckCircle size={16} /></>
          )}
        </button>
        <p className="mt-2 text-[10px] text-gray-400 text-center font-mono">&lt;{selectedElement.tag}&gt; Actual</p>
      </div>

      {/* Media Modal */}
      <ImageModal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         onSelectImage={(file, localUrl) => {
             setLocalImageFile(file);
             setFormData({...formData, src: localUrl});
             
             // Update Canvas preview immediately
             window.__EDITOR_IFRAME_REF?.current?.contentWindow.postMessage({
                 type: 'UPDATE_ELEMENT',
                 payload: { id: selectedElement.id, updates: { src: localUrl, persist: false } }
             }, '*');

             setIsModalOpen(false);
         }}
      />
    </div>
  );
}
