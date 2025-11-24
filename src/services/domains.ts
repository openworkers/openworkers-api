import * as db from './db';
import type { IDomain } from '../types';

export class DomainsService {
  async findAll(userId: string): Promise<IDomain[]> {
    return db.findAllDomains(userId);
  }

  async findByName(name: string): Promise<IDomain | null> {
    return db.findDomainByName(name);
  }

  async create(userId: string, input: { name: string; workerId: string }): Promise<IDomain> {
    // Check if domain already exists
    const existing = await db.findDomainByName(input.name);
    if (existing) {
      throw new Error('Domain already exists');
    }

    return db.createDomain(userId, input.workerId, input.name);
  }

  async delete(userId: string, name: string): Promise<number> {
    return db.deleteDomain(userId, name);
  }
}

export const domainsService = new DomainsService();
