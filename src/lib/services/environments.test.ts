import { describe, test, expect, mock, beforeEach } from 'bun:test';

const OWN_KV = '11111111-1111-4111-8111-111111111111';
const FOREIGN_KV = '22222222-2222-4222-8222-222222222222';
const ENV = '33333333-3333-4333-8333-333333333333';
const VALUE = '44444444-4444-4444-8444-444444444444';

const writes: string[] = [];

mock.module('./db', () => ({
  findEnvironmentById: async () => ({
    id: ENV,
    name: 'env',
    values: [{ id: VALUE, key: 'CACHE', value: OWN_KV, type: 'kv' }]
  }),
  createEnvironmentValue: async (_u: string, _e: string, key: string) => writes.push(`create ${key}`),
  updateEnvironmentValue: async (_u: string, id: string) => writes.push(`update ${id}`),
  deleteEnvironmentValue: async (_u: string, id: string) => writes.push(`delete ${id}`)
}));

mock.module('./binding-owner', () => ({
  ownsBindingTarget: async (_userId: string, _type: string, id: string) => id === OWN_KV
}));

const { environmentsService } = await import('./environments');
const { ServiceError } = await import('./errors');

describe('environmentsService.updateValues', () => {
  beforeEach(() => {
    writes.length = 0;
  });

  // The runner resolves a binding by id only, so a foreign id would give access to another account's resource
  test('refuses a new binding to a resource of another account', async () => {
    const error = await environmentsService
      .updateValues('u', ENV, [{ key: 'STOLEN', value: FOREIGN_KV, type: 'kv' }])
      .catch((e) => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(writes).toEqual([]);
  });

  test('refuses to point an existing binding to a resource of another account', async () => {
    const error = await environmentsService.updateValues('u', ENV, [{ id: VALUE, value: FOREIGN_KV }]).catch((e) => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(writes).toEqual([]);
  });

  test('writes nothing when one value of the batch is refused', async () => {
    const error = await environmentsService
      .updateValues('u', ENV, [
        { key: 'PLAIN', value: 'x', type: 'var' },
        { key: 'STOLEN', value: FOREIGN_KV, type: 'kv' }
      ])
      .catch((e) => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(writes).toEqual([]);
  });

  test('accepts a binding to an own resource, variables and deletions', async () => {
    await environmentsService.updateValues('u', ENV, [
      { key: 'OTHER_CACHE', value: OWN_KV, type: 'kv' },
      { key: 'PLAIN', value: 'x', type: 'var' },
      { id: VALUE, key: 'RENAMED' },
      { id: VALUE, value: null }
    ]);

    expect(writes).toEqual(['create OTHER_CACHE', 'create PLAIN', `update ${VALUE}`, `delete ${VALUE}`]);
  });
});
