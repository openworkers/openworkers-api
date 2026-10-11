import { z } from 'zod';
import { ResourceUpdateInputSchema } from '#lib/types/schemas/base.schema.ts';

const { name, desc } = ResourceUpdateInputSchema.shape;

// The name and description form of a resource page
export const ResourceSettingsSchema = z.object({
  id: z.uuid(),
  name: name.unwrap(),
  desc: desc.unwrap().unwrap()
});
