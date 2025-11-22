import * as db from './db';
import type { IWorker, IWorkerCreateInput, IWorkerUpdateInput } from '../types';

export class WorkersService {
  async findAll(userId: string): Promise<IWorker[]> {
    return db.findAllWorkers(userId);
  }

  async findById(userId: string, id: string): Promise<IWorker | null> {
    return db.findWorkerById(userId, id);
  }

  async create(userId: string, input: IWorkerCreateInput & { environmentId?: string }): Promise<IWorker> {
    return db.createWorker(userId, input.name, input.script || '', input.language, input.environmentId);
  }

  async update(userId: string, id: string, input: IWorkerUpdateInput): Promise<IWorker> {
    const worker = await db.updateWorker(userId, id, {
      name: input.name,
      script: input.script,
      environmentId: input.environment
    });

    if (!worker) {
      throw new Error('Worker not found or unauthorized');
    }

    return worker;
  }

  async delete(userId: string, id: string): Promise<number> {
    return db.deleteWorker(userId, id);
  }
}

export const workersService = new WorkersService();
