import { create } from 'zustand'

export const useEditorStore = create((set) => ({
  htmlContent: '', // El HTML cargado por el usuario
  fileHandle: null, // File System Access API handle
  selectedElement: null, // { id, tag, text, width, height, etc }
  sidebarOpen: true,
  isSaving: false,
  saveProgress: 0,
  isTranslating: false,
  isTranslated: false,
  
  setHtmlContent: (content) => set({ htmlContent: content, isTranslated: false }),
  setFileHandle: (handle) => set({ fileHandle: handle }),
  setSelectedElement: (element) => set({ selectedElement: element }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setIsSaving: (val) => set({ isSaving: val }),
  setSaveProgress: (val) => set({ saveProgress: val }),
  setIsTranslating: (val) => set({ isTranslating: val }),
  setIsTranslated: (val) => set({ isTranslated: val }),
  
  updateElementData: (newData) => set((state) => ({
    selectedElement: state.selectedElement ? { ...state.selectedElement, ...newData } : null
  })),
}))
