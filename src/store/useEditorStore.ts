import { create } from 'zustand';

interface EditorState {
  isZenMode: boolean;
  toggleZenMode: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeFile: File | null;
  setActiveFile: (file: File | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  isZenMode: false,
  toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),
  isDarkMode: true,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  activeFile: null,
  setActiveFile: (file) => set({ activeFile: file }),
}));
