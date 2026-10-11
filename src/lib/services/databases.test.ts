import { describe, test, expect, mock, beforeEach } from 'bun:test';

let count = 0;
const created: string[] = [];

mock.module('./db/users', () => ({
  findUserById: async () => ({ id: 'u', limits: { workers: 5, environments: 5, databases: 3, kv: 3, storage: 3 } })
}));

mock.module('./db/client', () => ({
  sql: async (query: string) => created.push(query)
}));

mock.module('./db/databases', () => ({
  countDatabases: async () => count,
  createPlatformDatabase: async (_userId: string, input: { name: string }) => {
    created.push(input.name);
    return { id: 'd', name: input.name, desc: null, provider: 'platform', maxRows: 1000, timeoutSeconds: 30 };
  }
}));

const { databasesService } = await import('./databases');
const { ServiceError } = await import('./errors');

describe('databasesService.create', () => {
  beforeEach(() => {
    created.length = 0;
  });

  // The limit shown on the databases page must hold for the REST API and the forms too
  test('refuses a database above the limit of the account', async () => {
    count = 3;

    const error = await databasesService
      .create('u', { provider: 'platform', name: 'extra', maxRows: 1000, timeoutSeconds: 30 })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.status).toBe(403);
    expect(created).toEqual([]);
  });

  test('creates a database under the limit', async () => {
    count = 2;

    await databasesService.create('u', { provider: 'platform', name: 'third', maxRows: 1000, timeoutSeconds: 30 });

    expect(created).toContain('third');
  });
});
