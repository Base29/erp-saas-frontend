import '@testing-library/jest-dom'

// Mock localStorage for Node 22+ environments in happy-dom / jsdom
const storageMock: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => storageMock[key] ?? null,
  setItem: (key: string, value: string) => {
    storageMock[key] = String(value)
  },
  removeItem: (key: string) => {
    delete storageMock[key]
  },
  clear: () => {
    Object.keys(storageMock).forEach((k) => delete storageMock[k])
  },
  key: (i: number) => Object.keys(storageMock)[i] ?? null,
  get length() {
    return Object.keys(storageMock).length
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
}
