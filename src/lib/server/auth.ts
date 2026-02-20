import { verify } from '$lib/utils/jwt';
import { getJwtConfig } from '$lib/config';
import { findApiKeyByToken, updateApiKeyLastUsed } from '$lib/services/db/api-keys';

interface AuthResult {
  userId: string;
  authMethod: 'jwt' | 'api_key';
}

/**
 * Authenticate a request via API key or JWT.
 * Returns null if authentication fails.
 */
export async function authenticate(request: Request): Promise<AuthResult | null> {
  const authHeader = request.headers.get('Authorization');

  // Check for API key (Bearer ow_...)
  if (authHeader?.startsWith('Bearer ow_')) {
    const token = authHeader.substring(7);
    const apiKey = await findApiKeyByToken(token);

    if (!apiKey) {
      return null;
    }

    // Update last used (fire and forget)
    updateApiKeyLastUsed(apiKey.id).catch(() => {});

    return { userId: apiKey.userId, authMethod: 'api_key' };
  }

  // Try JWT from Authorization header
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Try JWT from cookie
  if (!token) {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) {
        token = match[1]!;
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    const payload = await verify(token, getJwtConfig().access.secret);

    if (!payload.sub || typeof payload.sub !== 'string') {
      return null;
    }

    return { userId: payload.sub, authMethod: 'jwt' };
  } catch {
    return null;
  }
}
