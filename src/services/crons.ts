import * as db from './db';
import type { ICron, ICronCreateInput, ICronUpdateInput } from '../types';
import { WasmCron } from '@openworkers/croner-wasm';

export class CronsService {
  async findById(userId: string, id: string): Promise<ICron | null> {
    return db.findCronById(userId, id);
  }

  async create(userId: string, input: ICronCreateInput): Promise<ICron> {
    // Validate cron expression
    try {
      new WasmCron(input.value);
    } catch (error) {
      throw new Error('Invalid cron expression');
    }

    const croner = new WasmCron(input.value);
    const nextRun = croner.nextRun();

    if (!nextRun) {
      throw new Error('Cron expression will never run');
    }

    return db.createCron(userId, input.workerId, input.value, nextRun);
  }

  async update(userId: string, id: string, input: ICronUpdateInput): Promise<ICron> {
    // Validate cron expression
    try {
      new WasmCron(input.expression);
    } catch (error) {
      throw new Error('Invalid cron expression');
    }

    const croner = new WasmCron(input.expression);
    const nextRun = croner.nextRun();

    if (!nextRun) {
      throw new Error('Cron expression will never run');
    }

    const cron = await db.updateCron(userId, id, input.expression, nextRun);
    if (!cron) {
      throw new Error('Cron not found or unauthorized');
    }

    return cron;
  }

  async delete(userId: string, id: string): Promise<number> {
    return db.deleteCron(userId, id);
  }
}

export const cronsService = new CronsService();
