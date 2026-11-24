import { buildBase, nativeEnvError, nativeEnvWarnings } from './nativeBuild'

describe('buildBase', () => {
  it('ignores the preview sub-path in native mode', () => {
    expect(buildBase('native', '/x/')).toBe('/')
    expect(buildBase('native', undefined)).toBe('/')
  })

  it('keeps the preview sub-path for the web build', () => {
    expect(buildBase('production', '/x/')).toBe('/x/')
    expect(buildBase('production', undefined)).toBe('/')
  })
})

describe('nativeEnvError', () => {
  it('accepts a mock build', () => {
    expect(nativeEnvError({ VITE_MOCK: '1' })).toBeNull()
    expect(nativeEnvError({ VITE_MOCK: '1', VITE_API_URL: '/api/v1' })).toBeNull()
  })

  it('accepts an absolute backend URL', () => {
    expect(nativeEnvError({ VITE_MOCK: '', VITE_API_URL: 'https://foodly.example/api/v1' })).toBeNull()
    expect(nativeEnvError({ VITE_API_URL: ' http://192.168.1.20:8080/api/v1 ' })).toBeNull()
  })

  it.each([
    ['nothing set', {}],
    ['empty VITE_MOCK', { VITE_MOCK: '' }],
    ['VITE_MOCK=0', { VITE_MOCK: '0' }],
    ['relative URL', { VITE_MOCK: '', VITE_API_URL: '/api/v1' }],
    ['blank URL', { VITE_API_URL: '   ' }],
    ['unparsable URL', { VITE_API_URL: 'https://' }],
  ])('rejects %s and points to .env.native.local', (_, env) => {
    expect(nativeEnvError(env)).toContain('.env.native.local')
  })
})

describe('nativeEnvWarnings', () => {
  it('warns for an http:// REST build', () => {
    expect(nativeEnvWarnings({ VITE_API_URL: 'http://192.168.1.20:8080/api/v1' })).toEqual([
      expect.stringContaining('androidScheme'),
    ])
  })

  it.each(['https://localhost:8443/api/v1', 'https://127.0.0.1/api/v1', 'https://[::1]/api/v1'])(
    'warns for the loopback host in %s',
    (url) => {
      expect(nativeEnvWarnings({ VITE_API_URL: url })).toEqual([expect.stringContaining('localhost')])
    },
  )

  it('stays quiet for an https:// LAN or public backend and for mock builds', () => {
    expect(nativeEnvWarnings({ VITE_API_URL: 'https://foodly.example/api/v1' })).toEqual([])
    expect(nativeEnvWarnings({ VITE_MOCK: '1', VITE_API_URL: 'http://localhost' })).toEqual([])
  })
})
