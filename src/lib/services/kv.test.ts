import { describe, test, expect, mock, beforeEach } from 'bun:test';

const BOUND = '11111111-1111-4111-8111-111111111111';
const FREE = '22222222-2222-4222-8222-222222222222';

const deleted: string[] = [];

mock.module('./db/kv', () => ({
  deleteKvNamespace: async (_userId: string, id: string) => {
    deleted.push(id);
    return 1;
  }
}));

mock.module('./db/environments', () => ({
  findBindingUsages: async (_userId: string, id: string) =>
    id === BOUND ? [{ environmentId: 'e', environmentName: 'production', key: 'CACHE', workers: [] }] : []
}));

const { kvService } = await import('./kv');
const { ServiceError } = await import('./errors');

describe('kvService.delete', () => {
  beforeEach(() => {
    deleted.length = 0;
  });

  // A binding to a deleted resource would point to nothing
  test('refuses to delete a namespace that an environment binds', async () => {
    const error = await kvService.delete('u', BOUND).catch((e) => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.status).toBe(409);
    expect(error.message).toContain('production');
    expect(deleted).toEqual([]);
  });

  test('deletes a namespace that nothing binds', async () => {
    expect(await kvService.delete('u', FREE)).toBe(true);
    expect(deleted).toEqual([FREE]);
  });
});
