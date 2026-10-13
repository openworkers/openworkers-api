import { describe, test, expect, mock, beforeEach } from 'bun:test';

const MINE = '11111111-1111-4111-8111-111111111111';
const BOUND = '22222222-2222-4222-8222-222222222222';
const NEW = '33333333-3333-4333-8333-333333333333';

let limit = 5;
let count = 0;
const created: unknown[] = [];
const deleted: string[] = [];

const namespace = (id: string, name: string, className: string) => ({
  id,
  name,
  desc: null,
  workerId: MINE,
  workerName: 'my-app',
  className,
  createdAt: new Date(),
  updatedAt: new Date()
});

mock.module('./db/durable-objects', () => ({
  countNamespaces: async () => count,
  findNamespaceByName: async (_userId: string, name: string) =>
    name === 'taken' ? namespace(BOUND, 'taken', 'Taken') : null,
  findNamespaceByClass: async (_userId: string, _workerId: string, className: string) =>
    className === 'Taken' ? namespace(BOUND, 'taken', 'Taken') : null,
  findNamespaceById: async (_userId: string, id: string) => (id === NEW ? namespace(NEW, 'counters', 'Counter') : null),
  createNamespace: async (_userId: string, input: unknown) => {
    created.push(input);
    return NEW;
  },
  softDeleteNamespace: async (_userId: string, id: string) => {
    deleted.push(id);
    return true;
  }
}));

// Only my-app, by name or ID, is a worker of the account
mock.module('./db/workers', () => ({
  findWorker: async (_userId: string, idOrName: string) =>
    idOrName === 'my-app' || idOrName === MINE ? { id: MINE, name: 'my-app' } : null
}));

mock.module('./db/users', () => ({
  findUserById: async () => ({ limits: { durableObjects: limit } })
}));

mock.module('./db/environments', () => ({
  findBindingUsages: async (_userId: string, id: string) =>
    id === BOUND ? [{ environmentId: 'e', environmentName: 'production', key: 'COUNTER', workers: [] }] : []
}));

const { durableObjectsService } = await import('./durable-objects');

const input = (worker: string, name = 'counters', className = 'Counter') => ({ name, worker, className });

describe('durableObjectsService.create', () => {
  beforeEach(() => {
    limit = 5;
    count = 0;
    created.length = 0;
  });

  test('creates a namespace for a worker of the account, by name', async () => {
    const created_ = await durableObjectsService.create('u', input('my-app'));

    expect(created_.id).toBe(NEW);
    expect(created).toEqual([{ name: 'counters', desc: null, workerId: MINE, className: 'Counter' }]);
  });

  // The namespace would run the code of another account
  test('refuses a worker of another account', async () => {
    const error = await durableObjectsService.create('u', input('their-app')).catch((e) => e);

    expect(error.status).toBe(404);
    expect(error.message).toBe('Worker not found');
    expect(created).toEqual([]);
  });

  test('refuses past the limit of the account, which is 0 until it is turned on', async () => {
    limit = 0;

    const error = await durableObjectsService.create('u', input('my-app')).catch((e) => e);

    expect(error.status).toBe(403);
    expect(created).toEqual([]);
  });

  test('refuses a name or a class that has a namespace already', async () => {
    const byName = await durableObjectsService.create('u', input('my-app', 'taken')).catch((e) => e);
    const byClass = await durableObjectsService.create('u', input('my-app', 'other', 'Taken')).catch((e) => e);

    expect(byName.status).toBe(409);
    expect(byClass.status).toBe(409);
    expect(byClass.message).toContain('"taken"');
    expect(created).toEqual([]);
  });
});

describe('durableObjectsService.delete', () => {
  beforeEach(() => {
    deleted.length = 0;
  });

  // A binding to a deleted namespace would point to nothing
  test('refuses to delete a namespace that an environment binds', async () => {
    const error = await durableObjectsService.delete('u', BOUND).catch((e) => e);

    expect(error.status).toBe(409);
    expect(error.message).toContain('production');
    expect(deleted).toEqual([]);
  });

  test('deletes a namespace that nothing binds', async () => {
    expect(await durableObjectsService.delete('u', NEW)).toBe(true);
    expect(deleted).toEqual([NEW]);
  });
});
