import { afterEach, describe, expect, it } from 'vitest'
import { connectionType } from './network'

function setConnection(connection: unknown) {
  Object.defineProperty(navigator, 'connection', { value: connection, configurable: true })
}

describe('connectionType', () => {
  afterEach(() => setConnection(undefined))

  it('counts Wi-Fi and Ethernet as Wi-Fi', () => {
    setConnection({ type: 'wifi' })
    expect(connectionType()).toBe('wifi')
    setConnection({ type: 'ethernet' })
    expect(connectionType()).toBe('wifi')
  })

  it('counts cellular and unknown as mobile', () => {
    setConnection({ type: 'cellular' })
    expect(connectionType()).toBe('mobile')
    setConnection({})
    expect(connectionType()).toBe('mobile')
    setConnection(undefined)
    expect(connectionType()).toBe('mobile')
  })
})
