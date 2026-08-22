import * as db from './db';
import type { IWorker, IWorkerLanguage, IWorkerUpdateInput } from '../types';

interface FindWorkerOptions {
  includeScript?: boolean;
}

export class WorkersService {
  async findAll(userId: string): Promise<IWorker[]> {
    return db.findAllWorkers(userId);
  }

  async findById(userId: string, id: string, options: FindWorkerOptions = {}): Promise<IWorker | null> {
    return db.findWorker(userId, id, options);
  }

  async findByIdOrName(userId: string, idOrName: string, options: FindWorkerOptions = {}): Promise<IWorker | null> {
    return db.findWorker(userId, idOrName, options);
  }

  async create(userId: string, input: db.CreateWorkerInput): Promise<IWorker> {
    return db.createWorker(userId, input);
  }

  async update(userId: string, id: string, input: IWorkerUpdateInput): Promise<IWorker | null> {
    return db.updateWorker(userId, id, {
      name: input.name,
      script: input.script,
      scriptBase64: input.scriptBase64,
      language: input.language,
      environmentId: input.environment,
      domains: input.domains
    });
  }

  async delete(userId: string, id: string): Promise<number> {
    return db.deleteWorker(userId, id);
  }
}

export const workersService = new WorkersService();
