import { beforeEach, describe, expect, it } from 'vitest'
import { mockRequest, CURRENT_USER_ID } from './index'

beforeEach(() => localStorage.clear())

describe('mock personal note', () => {
  it('stores the note in the stub storage, so it survives a reload', async () => {
    expect(await mockRequest('myNote.get', { id: 5 })).toBe('')
    await mockRequest('myNote.set', { id: 5, text: 'Mehr Zitrone' })
    expect(await mockRequest('myNote.get', { id: 5 })).toBe('Mehr Zitrone')
    expect(JSON.parse(localStorage.getItem('foodly.stub.myNotes')!)).toEqual({
      [CURRENT_USER_ID]: { 5: 'Mehr Zitrone' },
    })
  })
})
