import * as db from './db/durable-objects';
import { findWorker } from './db/workers';
import type {
  IDurableObjectNamespace,
  IDurableObjectNamespaceCreateInput,
  IDurableObjectNamespaceUpdateInput
} from '../types';
import { isUuid } from '../utils/validation';
import { ServiceError } from './errors';
import { refuseIfBound } from './binding-usages';
import { refuseOverLimit } from './limits';

export class DurableObjectsService {
  async findAll(userId: string): Promise<IDurableObjectNamespace[]> {
    return db.findAllNamespaces(userId);
  }

  async findById(userId: string, id: string): Promise<IDurableObjectNamespace | null> {
    return db.findNamespaceById(userId, id);
  }

  async findByIdOrName(userId: string, idOrName: string): Promise<IDurableObjectNamespace | null> {
    return isUuid(idOrName) ? db.findNamespaceById(userId, idOrName) : db.findNamespaceByName(userId, idOrName);
  }

  async create(userId: string, input: IDurableObjectNamespaceCreateInput): Promise<IDurableObjectNamespace> {
    // limit_durable_objects is 0 until Durable Objects are turned on for the account
    await refuseOverLimit(userId, 'durableObjects', await db.countNamespaces(userId));

    // The runner checks it too, but a namespace must never run the code of another account
    const worker = await findWorker(userId, input.worker);

    if (!worker) {
      throw new ServiceError('Worker not found', 404);
    }

    if (await db.findNamespaceByName(userId, input.name)) {
      throw new ServiceError(`Durable Object namespace with name "${input.name}" already exists`, 409);
    }

    const sameClass = await db.findNamespaceByClass(userId, worker.id, input.className);

    if (sameClass) {
      throw new ServiceError(
        `The class ${input.className} of this worker already has the namespace "${sameClass.name}"`,
        409
      );
    }

    const id = await db.createNamespace(userId, {
      name: input.name,
      desc: input.desc ?? null,
      workerId: worker.id,
      className: input.className
    });

    const namespace = await db.findNamespaceById(userId, id);

    if (!namespace) {
      throw new Error('The new namespace is gone');
    }

    return namespace;
  }

  async update(
    userId: string,
    id: string,
    input: IDurableObjectNamespaceUpdateInput
  ): Promise<IDurableObjectNamespace | null> {
    if (input.name) {
      const existing = await db.findNamespaceByName(userId, input.name);

      if (existing && existing.id !== id) {
        throw new ServiceError(`Durable Object namespace with name "${input.name}" already exists`, 409);
      }
    }

    if (!(await db.updateNamespace(userId, id, { name: input.name, desc: input.desc }))) {
      return null;
    }

    return db.findNamespaceById(userId, id);
  }

  // The runner then stops the objects and removes their storage
  async delete(userId: string, id: string): Promise<boolean> {
    await refuseIfBound(userId, id);

    return db.softDeleteNamespace(userId, id);
  }
}

export const durableObjectsService = new DurableObjectsService();
