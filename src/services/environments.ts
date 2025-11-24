import * as db from './db';
import type {
  IEnvironment,
  IEnvironmentValue,
  IEnvironmentCreateInput,
  IEnvironmentUpdateInput,
  IEnvironmentValueUpdateInput
} from '../types';

export class EnvironmentsService {
  async findAll(userId: string): Promise<IEnvironment[]> {
    return db.findAllEnvironments(userId);
  }

  async findById(userId: string, id: string): Promise<IEnvironment | null> {
    return db.findEnvironmentById(userId, id);
  }

  async create(userId: string, input: IEnvironmentCreateInput): Promise<IEnvironment> {
    return db.createEnvironment(userId, input.name, input.desc);
  }

  async update(userId: string, id: string, input: IEnvironmentUpdateInput): Promise<IEnvironment> {
    const env = await db.updateEnvironment(userId, id, {
      name: input.name,
      desc: input.desc
    });
    if (!env) {
      throw new Error('Environment not found or unauthorized');
    }
    return env;
  }

  async delete(userId: string, id: string): Promise<number> {
    // DB cascade will handle deletion of values
    return db.deleteEnvironment(userId, id);
  }

  // Values management - now values are included in findById
  async getValues(userId: string, envId: string): Promise<IEnvironmentValue[]> {
    const env = await db.findEnvironmentById(userId, envId);
    return env?.values || [];
  }

  async updateValues(userId: string, envId: string, values: IEnvironmentValueUpdateInput[]): Promise<void> {
    // Verify env ownership
    const env = await db.findEnvironmentById(userId, envId);
    if (!env) {
      throw new Error('Environment not found');
    }

    // Transaction logic simulation (since we don't have easy transaction object passing yet)
    // We'll do it sequentially. Ideally we should use a transaction.
    // For now, let's implement the logic:
    // 1. Delete nulls
    // 2. Update existing
    // 3. Create new

    for (const val of values) {
      if (val.id) {
        if (val.value === null) {
          await db.deleteEnvironmentValue(userId, val.id);
          continue;
        }

        await db.updateEnvironmentValue(userId, val.id, {
          key: val.key,
          value: val.value,
          secret: val.secret
        });
      } else {
        // Create: key and value are required in schema when id is missing
        await db.createEnvironmentValue(userId, envId, val.key!, val.value!, val.secret ?? false);
      }
    }
  }
}

export const environmentsService = new EnvironmentsService();
