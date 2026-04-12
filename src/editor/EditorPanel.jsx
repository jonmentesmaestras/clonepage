import { useEditorStore } from './store/useEditorStore';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

export default function EditorPanel() {
  const { sidebarOpen, toggleSidebar } = useEditorStore();

  return (
    <div className="flex w-full h-full bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div 
        className={`${sidebarOpen ? 'w-80 border-r border-gray-200' : 'w-0'} 
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
