import { create } from 'zustand'
import versionConfig from '@/version.json'

export const DEFAULT_VERSION: string = versionConfig.version
export const APP_VERSION = DEFAULT_VERSION

interface VersionState {
  version: string
  setVersion: (version: string) => void
}

export const useVersionStore = create<VersionState>((set) => ({
  version: DEFAULT_VERSION,
  setVersion: (version: string) => set({ version }),
}))

export function useAppVersion(): string {
  return useVersionStore((state) => state.version)
}

export function setAppVersion(version: string): void {
  if (version) {
    useVersionStore.getState().setVersion(version)
  }
}
