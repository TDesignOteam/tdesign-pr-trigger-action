import { vi } from 'vitest'

vi.mock('../../src/utils', async () => {
  return {
    ...(await vi.importActual<typeof import('../../src/utils')>('../../src/utils')),
    getPrData: vi.fn().mockReturnValue(`{ "version": "x.x.x" }`),
  }
})
