import { findBindingUsages } from './db/environments';
import { ServiceError } from './errors';

// A binding to a deleted resource would point to nothing
export async function refuseIfBound(userId: string, resourceId: string): Promise<void> {
  const usages = await findBindingUsages(userId, resourceId);

  if (usages.length > 0) {
    const where = usages.map((usage) => `${usage.environmentName} (${usage.key})`).join(', ');
    throw new ServiceError(`Still bound in ${where}; remove the binding first`, 409);
  }
}
