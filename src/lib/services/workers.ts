import * as db from './db';
import * as projectsDb from './db/projects';
import type { IWorker, IWorkerLanguage, IWorkerUpdateInput } from '../types';
import { ServiceError } from './errors';
import { refuseIfBound } from './binding-usages';
import { refuseOverLimit } from './limits';

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
    if (input.name !== null) {
      await refuseOverLimit(userId, 'workers', await db.countNamedWorkers(userId));
    }

    // Worker names are global: they are subdomains
    if (input.name !== null && (await db.checkWorkerNameExists(input.name))) {
      throw new ServiceError(`Worker name "${input.name}" is already taken`, 409);
    }

    return db.createWorker(userId, input);
  }

  async update(userId: string, id: string, input: IWorkerUpdateInput): Promise<IWorker | null> {
    return db.updateWorker(userId, id, {
      name: input.name,
      desc: input.desc,
      script: input.script,
      scriptBase64: input.scriptBase64,
      language: input.language,
      environmentId: input.environment,
      domains: input.domains
    });
  }

  async delete(userId: string, id: string): Promise<number> {
    await refuseIfBound(userId, id);

    // Deleting the main worker of a project deletes the whole project
    if (await projectsDb.isProjectMainWorker(userId, id)) {
      return projectsDb.deleteProject(userId, id);
    }

    return db.deleteWorker(userId, id);
  }
}

export const workersService = new WorkersService();
