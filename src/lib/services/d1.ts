import * as db from './db/d1';
import type { ID1Database, ID1DatabaseCreateInput, ID1DatabaseUpdateInput, ID1Request } from '../types';
import { isUuid } from '../utils/validation';
import { ServiceError } from './errors';
import { refuseIfBound } from './binding-usages';
import { refuseOverLimit } from './limits';

const REQUEST_POLL_MS = 100;
// The runner gives a request to this worker 60 seconds
const REQUEST_TIMEOUT_MS = 30_000;

export class D1Service {
  async findAll(userId: string): Promise<ID1Database[]> {
    return db.findAllD1Databases(userId);
  }

  async findById(userId: string, id: string): Promise<ID1Database | null> {
    return db.findD1DatabaseById(userId, id);
  }

  async findByIdOrName(userId: string, idOrName: string): Promise<ID1Database | null> {
    return isUuid(idOrName) ? db.findD1DatabaseById(userId, idOrName) : db.findD1DatabaseByName(userId, idOrName);
  }

  async create(userId: string, input: ID1DatabaseCreateInput): Promise<ID1Database> {
    // limit_d1 is 0 until D1 is turned on for the account
    await refuseOverLimit(userId, 'd1', await db.countD1Databases(userId));

    if (await db.findD1DatabaseByName(userId, input.name)) {
      throw new ServiceError(`D1 database with name "${input.name}" already exists`, 409);
    }

    return db.createD1Database(userId, input.name, input.desc ?? null);
  }

  async update(userId: string, id: string, input: ID1DatabaseUpdateInput): Promise<ID1Database | null> {
    if (input.name) {
      const existing = await db.findD1DatabaseByName(userId, input.name);

      if (existing && existing.id !== id) {
        throw new ServiceError(`D1 database with name "${input.name}" already exists`, 409);
      }
    }

    return db.updateD1Database(userId, id, { name: input.name, desc: input.desc });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    await refuseIfBound(userId, id);

    return db.softDeleteD1Database(userId, id);
  }

  // A worker cannot LISTEN, so it polls the row until the runner answers
  async request(databaseId: string, request: ID1Request): Promise<unknown> {
    const id = await db.insertD1Request(databaseId, request);
    const deadline = Date.now() + REQUEST_TIMEOUT_MS;
    let result: unknown = null;

    try {
      while (Date.now() < deadline) {
        const row = await db.findD1RequestResult(id);

        if (row) {
          result = row.result;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, REQUEST_POLL_MS));
      }
    } finally {
      // Also on a timeout; the runner can answer between the last poll and this delete
      const row = await db.deleteD1Request(id);
      result ??= row?.result ?? null;
    }

    if (result === null) {
      throw new ServiceError(
        `No runner answered within ${REQUEST_TIMEOUT_MS / 1000} seconds; is D1 enabled on the runner?`,
        504
      );
    }

    return result;
  }
}

export const d1Service = new D1Service();
