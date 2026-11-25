const m = vi.hoisted(() => ({
  calls: [] as string[],
  keepAwake: vi.fn<() => Promise<void>>(),
  allowSleep: vi.fn<() => Promise<void>>(),
}))

vi.mock('@capacitor-community/keep-awake', () => ({ KeepAwake: { keepAwake: m.keepAwake, allowSleep: m.allowSleep } }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function load() {
  vi.resetModules()
  return import('./keepAwake')
}

beforeEach(() => {
  m.calls.length = 0
  m.keepAwake.mockReset().mockImplementation(() => {
    m.calls.push('keepAwake')
    return Promise.resolve()
  })
  m.allowSleep.mockReset().mockImplementation(() => {
    m.calls.push('allowSleep')
    return Promise.resolve()
  })
})

describe('keepAwake adapter', () => {
  it('runs allowSleep only after a still pending keepAwake has settled', async () => {
    const { keepAwake, allowSleep } = await load()
    let finish!: () => void
    m.keepAwake.mockImplementationOnce(() => {
      m.calls.push('keepAwake:start')
      return new Promise<void>((resolve) => {
        finish = () => {
          m.calls.push('keepAwake:end')
          resolve()
        }
      })
    })

    const on = keepAwake()
    const off = allowSleep()
    await flush()
    expect(m.calls).toEqual(['keepAwake:start'])

    finish()
    await Promise.all([on, off])
    expect(m.calls).toEqual(['keepAwake:start', 'keepAwake:end', 'allowSleep'])
  })

  it('rejects the failing call but keeps the queue going', async () => {
    const { keepAwake, allowSleep } = await load()
    m.keepAwake.mockImplementationOnce(() => Promise.reject(new Error('nope')))

    await expect(keepAwake()).rejects.toThrow('nope')
    await allowSleep()
    expect(m.allowSleep).toHaveBeenCalledTimes(1)
  })
})
