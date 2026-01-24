import * as db from './db';
import type { IWorker, IWorkerLanguage, IWorkerUpdateInput } from '../types';

interface FindWorkerOptions {
  detailed?: boolean;
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
