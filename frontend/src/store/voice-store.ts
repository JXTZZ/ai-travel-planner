import { create } from 'zustand';

export type VoiceCommand = {
  id: string;
  transcript: string;
  createdAt: string;
  mode: 'planning' | 'budget';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
};

type VoiceState = {
  commands: VoiceCommand[];
  addCommand: (command: Omit<VoiceCommand, 'id' | 'createdAt' | 'status'>) => VoiceCommand;
  updateCommand: (id: string, patch: Partial<VoiceCommand>) => void;
};

export const useVoiceStore = create<VoiceState>((set, get) => ({
  commands: [],
  addCommand(command) {
    const newCommand: VoiceCommand = {
      ...command,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    set((state) => ({ commands: [newCommand, ...state.commands] }));
    return newCommand;
  },
  updateCommand(id, patch) {
    set((state) => ({
      commands: state.commands.map((item) => (item.id === id ? { ...item, ...patch } : item))
    }));
    if (patch.result) {
      const updated = get().commands.find((item) => item.id === id);
      if (updated) {
        console.info('Voice command processed:', updated.result);
      }
    }
  }
}));
