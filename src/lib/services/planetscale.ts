import { getPlanetScaleConfig } from '$lib/config';
import * as psTokens from './db/planetscale-tokens';

const AUTH_URL = 'https://auth.planetscale.com/oauth/token';
const API_URL = 'https://api.planetscale.com/v1';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface Organization {
  id: string;
  name: string;
}

interface PlanetScaleDatabase {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface VitessPasswordResponse {
  id: string;
  name: string;
  username: string;
  plain_text: string;
  access_host_url: string;
}

interface PostgresRoleResponse {
  id: string;
  name: string;
  username: string;
  password: string;
  access_host_url: string;
  database_name: string;
}

function expiresAtFromSeconds(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}

async function exchangeCode(userId: string, code: string): Promise<void> {
  const config = getPlanetScaleConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error('PlanetScale OAuth not configured');
  }

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: `${config.appUrl}/api/v1/callback/planetscale`
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PlanetScale token exchange failed: ${text}`);
  }

  const data = (await response.json()) as TokenResponse;

  await psTokens.upsertToken(userId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: expiresAtFromSeconds(data.expires_in)
  });
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  const config = getPlanetScaleConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error('PlanetScale OAuth not configured');
  }

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PlanetScale token refresh failed: ${text}`);
  }

  const data = (await response.json()) as TokenResponse;

  await psTokens.upsertToken(userId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: expiresAtFromSeconds(data.expires_in)
  });

  return data.access_token;
}

async function getAccessToken(userId: string): Promise<string> {
  const token = await psTokens.getToken(userId);

  if (!token) {
    throw new Error('No PlanetScale token found. Please connect your PlanetScale account first.');
  }

  // Refresh if expired or expiring within 60 seconds
  const expiresAt = new Date(token.expiresAt).getTime();
  if (expiresAt - Date.now() < 60_000) {
    return refreshAccessToken(userId, token.refreshToken);
  }

  return token.accessToken;
}

async function apiRequest<T>(userId: string, path: string, options?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken(userId);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PlanetScale API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

async function listOrganizations(userId: string): Promise<Organization[]> {
  const data = await apiRequest<{ data: Organization[] }>(userId, '/organizations');
  return data.data;
}

async function listDatabases(userId: string, org: string): Promise<PlanetScaleDatabase[]> {
  const data = await apiRequest<{ data: PlanetScaleDatabase[] }>(
    userId,
    `/organizations/${encodeURIComponent(org)}/databases`
  );
  return data.data;
}

async function listBranches(userId: string, org: string, db: string): Promise<Branch[]> {
  const data = await apiRequest<{ data: Branch[] }>(
    userId,
    `/organizations/${encodeURIComponent(org)}/databases/${encodeURIComponent(db)}/branches`
  );
  return data.data;
}

async function createPassword(
  userId: string,
  org: string,
  db: string,
  branch: string,
  dbName: string
): Promise<string> {
  const basePath = `/organizations/${encodeURIComponent(org)}/databases/${encodeURIComponent(db)}/branches/${encodeURIComponent(branch)}`;

  // Try Postgres roles endpoint first, fall back to Vitess passwords
  try {
    const data = await apiRequest<PostgresRoleResponse>(
      userId,
      `${basePath}/roles`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: `ow-${crypto.randomUUID().slice(0, 8)}`,
          inherited_roles: ['pg_read_all_data', 'pg_write_all_data']
        })
      }
    );

    return `postgresql://${data.username}:${encodeURIComponent(data.password)}@${data.access_host_url}/${dbName}?sslmode=require`;
  } catch (err) {
    // If roles endpoint fails (Vitess DB), try passwords endpoint
    const data = await apiRequest<VitessPasswordResponse>(
      userId,
      `${basePath}/passwords`,
      {
        method: 'POST',
        body: JSON.stringify({ role: 'readwriter' })
      }
    );

    return `mysql://${data.username}:${encodeURIComponent(data.plain_text)}@${data.access_host_url}/${dbName}?ssl={"rejectUnauthorized":true}`;
  }
}

export const planetScaleService = {
  exchangeCode,
  getAccessToken,
  listOrganizations,
  listDatabases,
  listBranches,
  createPassword
};
