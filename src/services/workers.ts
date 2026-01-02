import * as db from './db';
import type { IWorker, IWorkerCreateInput, IWorkerUpdateInput } from '../types';

export class WorkersService {
  async findAll(userId: string): Promise<Omit<IWorker, 'script'>[]> {
    return db.findAllWorkers(userId);
  }

  async findById(userId: string, id: string): Promise<IWorker | null> {
    return db.findWorkerById(userId, id);
  }

  async create(userId: string, input: IWorkerCreateInput & { environmentId?: string }): Promise<IWorker> {
    return db.createWorker(userId, input.name, input.script || '', input.language, input.environmentId);
  }

  async update(userId: string, id: string, input: IWorkerUpdateInput): Promise<IWorker | null> {
    const worker = await db.updateWorker(userId, id, {
      name: input.name,
      script: input.script,
      environmentId: input.environment,
      domains: input.domains
    });

    if (!worker) {
      return null;
    }

    // Return full worker with updated domains
    return db.findWorkerById(userId, id);
  }

  async delete(userId: string, id: string): Promise<number> {
    return db.deleteWorker(userId, id);
  }
}

export const workersService = new WorkersService();
