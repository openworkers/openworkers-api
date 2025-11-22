import { z } from 'zod';

// Login Response
export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1)
});

// Types
export type ILoginResponse = z.infer<typeof LoginResponseSchema>;
