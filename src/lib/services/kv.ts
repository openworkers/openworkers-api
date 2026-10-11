import * as db from './db/kv';
import * as usersDb from './db/users';
import type { IKvNamespace, IKvNamespaceCreateInput, IKvNamespaceUpdateInput } from '../types';
import type { KvDataRow, KvDataListResult } from './db/kv';
import { isUuid } from '../utils/validation';
import { ServiceError } from './errors';
import { refuseIfBound } from './binding-usages';

const MAX_VALUE_SIZE = 100 * 1024;

export class KvService {
  async findAll(userId: string): Promise<IKvNamespace[]> {
    const rows = await db.findAllKvNamespaces(userId);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      desc: row.desc,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  async findById(userId: string, id: string): Promise<IKvNamespace | null> {
    const row = await db.findKvNamespaceById(userId, id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      desc: row.desc,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async findByName(userId: string, name: string): Promise<IKvNamespace | null> {
    const row = await db.findKvNamespaceByName(userId, name);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      desc: row.desc,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async findByIdOrName(userId: string, idOrName: string): Promise<IKvNamespace | null> {
    return isUuid(idOrName) ? this.findById(userId, idOrName) : this.findByName(userId, idOrName);
  }

  async create(userId: string, input: IKvNamespaceCreateInput): Promise<IKvNamespace> {
    const { name, desc } = input;

    // Check limit
    const user = await usersDb.findUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const count = await db.countKvNamespaces(userId);

    if (count >= user.limits.kv) {
      throw new ServiceError(`KV namespace limit reached (${user.limits.kv})`, 403);
    }

    // Check if name already exists
    const existing = await db.findKvNamespaceByName(userId, name);

    if (existing) {
      throw new ServiceError(`KV namespace with name "${name}" already exists`, 409);
    }

    const row = await db.createKvNamespace(userId, name, desc);

    return {
      id: row.id,
      name: row.name,
      desc: row.desc,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async update(userId: string, id: string, input: IKvNamespaceUpdateInput): Promise<IKvNamespace | null> {
    const { name, desc } = input;

    // If renaming, check if new name already exists
    if (name) {
      const existing = await db.findKvNamespaceByName(userId, name);

      if (existing && existing.id !== id) {
        throw new ServiceError(`KV namespace with name "${name}" already exists`, 409);
      }
    }

    const row = await db.updateKvNamespace(userId, id, name, desc);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      desc: row.desc,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async delete(userId: string, id: string): Promise<boolean> {
    await refuseIfBound(userId, id);

    const deleted = await db.deleteKvNamespace(userId, id);
    return deleted > 0;
  }

  // ============ KV Data Methods ============

  async listData(
    namespaceId: string,
    options: { prefix?: string; cursor?: string; limit?: number }
  ): Promise<KvDataListResult> {
    return db.listKvData(namespaceId, options);
  }

  async putData(namespaceId: string, key: string, value: unknown, expiresIn?: number): Promise<KvDataRow> {
    const valueSize = JSON.stringify(value).length;

    if (valueSize > MAX_VALUE_SIZE) {
      throw new ServiceError(`Value too large: ${valueSize} bytes (max ${MAX_VALUE_SIZE} bytes)`, 400);
    }

    return db.putKvData(namespaceId, key, value, expiresIn);
  }

  async deleteData(namespaceId: string, key: string): Promise<boolean> {
    return db.deleteKvData(namespaceId, key);
  }
}

export const kvService = new KvService();
