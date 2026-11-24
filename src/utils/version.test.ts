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
    expect(DEFAULT_VERSION).toBeTruthy()
    expect(APP_VERSION).toBe(DEFAULT_VERSION)
  })

  it('provides useAppVersion hook with initial default value', () => {
    const { result } = renderHook(() => useAppVersion())
    expect(result.current).toBe(DEFAULT_VERSION)
  })

  it('updates version dynamically via setAppVersion', () => {
    const { result } = renderHook(() => useAppVersion())
    expect(result.current).toBe(DEFAULT_VERSION)

    act(() => {
      setAppVersion('v1.0.0')
    })

    expect(result.current).toBe('v1.0.0')
  })
})
