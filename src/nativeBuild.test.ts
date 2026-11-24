import { nativeEnvError, nativeEnvWarning } from './nativeBuild'

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
  ])('rejects %s and points to .env.native.local', (_, env) => {
    expect(nativeEnvError(env)).toContain('.env.native.local')
  })
})

describe('nativeEnvWarning', () => {
  it('warns only for an http:// REST build', () => {
    expect(nativeEnvWarning({ VITE_API_URL: 'http://192.168.1.20:8080/api/v1' })).toContain('androidScheme')
    expect(nativeEnvWarning({ VITE_API_URL: 'https://foodly.example/api/v1' })).toBeNull()
    expect(nativeEnvWarning({ VITE_MOCK: '1', VITE_API_URL: 'http://x' })).toBeNull()
  })
})
