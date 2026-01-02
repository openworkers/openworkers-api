import { z } from 'zod';

import { emailRegexp } from '../../utils/validation';

// Login Response
export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1)
});

// Email validation using the same regex as Angular (HTML spec compliant)
const emailSchema = z.string().regex(emailRegexp, 'Invalid email format');

// Password Auth Schemas (Email-first flow)
export const RegisterInputSchema = z.object({
  email: emailSchema
});

export const SetPasswordInputSchema = z.object({
  token: z.string().length(64, 'Invalid token'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long')
});

export const LoginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const ForgotPasswordInputSchema = z.object({
  email: emailSchema
});

export const ResetPasswordInputSchema = z.object({
  token: z.string().length(64, 'Invalid token'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long')
});

export const ResendSetPasswordInputSchema = z.object({
  email: emailSchema
});

// Types
export type ILoginResponse = z.infer<typeof LoginResponseSchema>;
export type IRegisterInput = z.infer<typeof RegisterInputSchema>;
export type ISetPasswordInput = z.infer<typeof SetPasswordInputSchema>;
export type ILoginInput = z.infer<typeof LoginInputSchema>;
export type IForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;
export type IResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
export type IResendSetPasswordInput = z.infer<typeof ResendSetPasswordInputSchema>;
