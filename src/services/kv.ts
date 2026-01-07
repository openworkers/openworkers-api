import * as db from './db/kv';
import * as usersDb from './db/users';
import type { IKvNamespace, IKvNamespaceCreateInput, IKvNamespaceUpdateInput } from '../types';
import type { KvDataRow, KvDataListResult } from './db/kv';

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

  async create(userId: string, input: IKvNamespaceCreateInput): Promise<IKvNamespace> {
    const { name, desc } = input;

    // Check limit
    const user = await usersDb.findUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const count = await db.countKvNamespaces(userId);

    if (count >= user.limits.kv) {
      throw new Error(`KV namespace limit reached (${user.limits.kv})`);
    }

    // Check if name already exists
    const existing = await db.findKvNamespaceByName(userId, name);

    if (existing) {
      throw new Error(`KV namespace with name "${name}" already exists`);
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
        throw new Error(`KV namespace with name "${name}" already exists`);
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
    return db.putKvData(namespaceId, key, value, expiresIn);
  }

  async deleteData(namespaceId: string, key: string): Promise<boolean> {
    return db.deleteKvData(namespaceId, key);
  }
}

export const kvService = new KvService();
