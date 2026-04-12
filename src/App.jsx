import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Copy, 
  Download, 
  Wand2, 
  Globe, 
  DollarSign, 
  Code2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  FilePlus
} from 'lucide-react';

const App = () => {
  const [htmlInput, setHtmlInput] = useState('');
  const [productName, setProductName] = useState('La autocuración energética');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'editor'
  const [editorMode, setEditorMode] = useState(false);



  const handleGenerate = async () => {
    if (!htmlInput) {
      setError("Por favor, pega el código HTML de origen.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    let retries = 0;
    const maxRetries = 5;

    const callApi = async () => {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            htmlInput,
            productName,
            targetCurrency
          })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'API request failed');
        
        setGeneratedHtml(data.html);
        setActiveTab('preview');
      } catch (err) {
        if (retries < maxRetries) {
          retries++;
          const delay = Math.pow(2, retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return callApi();
        }
        console.error(err);
        setError("Error en la generación. Verifica el código fuente o intenta de nuevo.");
      } finally {
        setIsGenerating(false);
      }
    };

    callApi();
  };

  const downloadHtml = () => {
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const textArea = document.createElement("textarea");
    textArea.value = generatedHtml;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30">
      {/* Header */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Antigravity <span className="text-purple-400 font-medium text-sm">Vibe Cloner</span></h1>
          </div>
          <div className="flex gap-4 items-center">
            {editorMode && (
              <button
                onClick={() => { setEditorMode(false); setActiveTab('preview'); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-700 hover:border-purple-500 hover:text-purple-400 rounded-lg transition-all"
              >
                <FilePlus className="w-4 h-4" /> Nueva Página
              </button>
            )}
            {generatedHtml && (
              <>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copiar
                </button>
                <button 
                  onClick={downloadHtml}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" /> Descargar .html
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={`max-w-[1700px] mx-auto p-6 grid gap-6 h-[calc(100vh-100px)] transition-all duration-300 ${editorMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[400px_1fr]'}`}>
        
        {/* Left Side: Configuration & Input — oculto en editorMode */}
        {!editorMode && (
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Wand2 className="w-3 h-3 text-purple-400" /> Nuevo Nombre
                  </label>
                  <input 
                    type="text" 
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    placeholder="Ej: La Autocuración Energética"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-purple-400" /> Moneda Objetivo
                  </label>
                  <select 
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="USD">Dólares (USD)</option>
                    <option value="EUR">Euros (EUR)</option>
                    <option value="MXN">Pesos Mexicanos (MXN)</option>
                    <option value="COP">Pesos Colombianos (COP)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Code2 className="w-3 h-3 text-purple-400" /> Pegar HTML Fuente (Ctrl + V)
                </label>
                <textarea 
                  value={htmlInput}
                  onChange={(e) => setHtmlInput(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none leading-relaxed"
                  placeholder="<html> ... </html>"
                />
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-600/10 ${
                  isGenerating 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white active:scale-[0.98]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    PROCESANDO CON ANTIGRAVITY...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    TRANSFORMAR LANDING PAGE
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Side: Preview & Output */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-800">
            <button 
              onClick={() => setActiveTab('preview')}
              disabled={!generatedHtml}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'preview' ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'} ${!generatedHtml && 'opacity-50 cursor-not-allowed'}`}
            >
              <Eye className="w-4 h-4" /> Vibe Check (Vista Previa)
            </button>
            <button 
              onClick={() => { setActiveTab('editor'); setEditorMode(true); }}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'editor' ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Code2 className="w-4 h-4" /> Editor
            </button>
          </div>

          <div className="flex-1 bg-slate-950 min-h-0 relative">
            {!generatedHtml && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                <Globe className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Pega el HTML de la página probada a la izquierda y presiona transformar.</p>
                <p className="text-xs mt-2 opacity-50 italic">"The vibe is what sells, the code is just the vehicle."</p>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                   <Zap className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="mt-4 text-purple-400 font-medium animate-pulse">Sincronizando frecuencias de venta...</p>
              </div>
            )}

            {activeTab === 'editor' ? (
              <textarea 
                readOnly
                value={generatedHtml}
                className="w-full h-full bg-slate-950 p-4 text-xs font-mono text-emerald-400/90 outline-none resize-none leading-relaxed"
                placeholder="El código transformado aparecerá aquí..."
              />
            ) : (
              <iframe 
                srcDoc={generatedHtml}
                className="w-full h-full border-none bg-white"
                title="Preview"
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer Meta */}
      <footer className="max-w-[1700px] mx-auto px-6 py-4 flex justify-between items-center text-[10px] text-slate-600 font-mono">
        <div className="flex gap-4">
          <span>MODE: AGENTIC_ANTIGRAVITY</span>
          <span>ENGINE: GEMINI_FLASH_PRO</span>
        </div>
        <div>
          VIBE ENGINEERING STATUS: <span className="text-emerald-500">OPTIMIZED</span>
        </div>
      </footer>
    </div>
  );
};

export default App;