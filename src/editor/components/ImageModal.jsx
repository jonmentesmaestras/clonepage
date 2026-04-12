import { useState, useRef } from 'react';
import { X, UploadCloud, Image as ImageIcon } from 'lucide-react';

export default function ImageModal({ isOpen, onClose, onSelectImage }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      alert('Por favor selecciona una imagen válida (PNG, JPG, WEBP).');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Insertar medio</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2">
            <button 
              className={`text-left px-3 py-2 rounded text-sm font-medium ${activeTab === 'upload' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('upload')}
            >
              Insertar medio
            </button>
            <button className="text-left px-3 py-2 rounded text-sm font-medium text-gray-400 cursor-not-allowed" title="Próximamente">
              Insertar desde URL
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Tabs Bar inside Main content */}
            <div className="flex border-b border-gray-200 px-6 pt-4 gap-6">
              <button className="pb-3 text-sm font-medium border-b-2 border-blue-600 text-slate-800">
                Subir archivos
              </button>
              <button className="pb-3 text-sm font-medium text-gray-400 border-b-2 border-transparent cursor-not-allowed" title="Próximamente">
                Biblioteca de medios
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 flex flex-col mt-2">
              {!previewUrl ? (
                <div 
                  className="flex-1 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-8 bg-white hover:bg-gray-50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <UploadCloud size={48} className="text-gray-400 mb-4" />
                  <p className="text-lg font-semibold text-gray-700 mb-1">Arrastra los archivos para subirlos</p>
                  <p className="text-gray-500 mb-6 text-sm">o</p>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleFileChange}
                  />
                  
                  <button 
                    className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Seleccionar archivos
                  </button>
                  <p className="mt-8 text-xs text-gray-400">Tamaño máximo de archivo: 1 GB.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center relative p-4 border border-gray-200 bg-white rounded-lg">
                  <button onClick={clearSelection} className="absolute top-4 right-4 p-1 bg-white shadow rounded-full hover:bg-gray-100 text-gray-600">
                    <X size={16} />
                  </button>
                  <img src={previewUrl} alt="Vista previa" className="max-h-[50vh] object-contain rounded" />
                  <p className="mt-4 text-sm text-gray-600 truncate max-w-md">{selectedFile?.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
          <button 
            disabled={!selectedFile}
            onClick={() => onSelectImage(selectedFile, previewUrl)}
            className={`px-6 py-2 rounded text-sm font-medium transition-colors ${selectedFile ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-blue-300 text-white cursor-not-allowed'}`}
          >
            Seleccionar
          </button>
        </div>

      </div>
    </div>
  );
}
