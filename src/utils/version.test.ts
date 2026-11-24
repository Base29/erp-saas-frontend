import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DEFAULT_VERSION, APP_VERSION, useAppVersion, setAppVersion, useVersionStore } from './version'

describe('version utility', () => {
  beforeEach(() => {
    act(() => {
      useVersionStore.getState().setVersion(DEFAULT_VERSION)
    })
  })

  it('exports correct default version constants matching version.json', () => {
    expect(DEFAULT_VERSION).toBe('v0.2.9')
    expect(APP_VERSION).toBe('v0.2.9')
  })

  it('provides useAppVersion hook with initial default value', () => {
    const { result } = renderHook(() => useAppVersion())
    expect(result.current).toBe('v0.2.9')
  })

  it('updates version dynamically via setAppVersion', () => {
    const { result } = renderHook(() => useAppVersion())
    expect(result.current).toBe('v0.2.9')

    act(() => {
      setAppVersion('v1.0.0')
    })

    expect(result.current).toBe('v1.0.0')
  })
})
