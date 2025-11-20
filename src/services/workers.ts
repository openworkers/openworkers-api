import * as db from './db';
import type { Worker } from '../types';

export class WorkersService {
  async findAll(userId: string): Promise<Worker[]> {
    return db.findAllWorkers(userId);
  }

  async findById(userId: string, id: string): Promise<Worker | null> {
    return db.findWorkerById(userId, id);
  }

  async create(userId: string, input: {
    name: string;
    script: string;
    language: 'javascript' | 'typescript';
    environment_id?: string;
  }): Promise<Worker> {
    return db.createWorker(userId, input.name, input.script, input.language, input.environment_id);
  }

  async update(userId: string, id: string, input: {
    name?: string;
    script?: string;
    language?: 'javascript' | 'typescript';
    environment_id?: string;
  }): Promise<Worker> {
    const worker = await db.updateWorker(userId, id, input);
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
