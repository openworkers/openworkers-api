import * as db from './db';
import type { IWorker, IWorkerLanguage, IWorkerUpdateInput } from '../types';

export class WorkersService {
  async findAll(userId: string): Promise<IWorker[]> {
    return db.findAllWorkers(userId);
  }

  async findById(userId: string, id: string): Promise<IWorker | null> {
    return db.findWorkerById(userId, id);
  }

  async create(
    userId: string,
    name: string,
    script: string,
    language: IWorkerLanguage,
    environmentId?: string
  ): Promise<IWorker> {
    return db.createWorker(userId, name, script, language, environmentId);
  }

  async update(userId: string, id: string, input: IWorkerUpdateInput): Promise<IWorker | null> {
    return db.updateWorker(userId, id, {
      name: input.name,
      script: input.script,
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
