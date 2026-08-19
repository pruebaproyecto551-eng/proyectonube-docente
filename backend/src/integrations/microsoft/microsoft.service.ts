import { ConfidentialClientApplication } from '@azure/msal-node';
import { env } from '../../config/env';

const configured =
  Boolean(env.microsoft.clientId) &&
  Boolean(env.microsoft.clientSecret) &&
  Boolean(env.microsoft.redirectUri);

export const microsoftConfigured = configured;

export const msalClient = configured
  ? new ConfidentialClientApplication({
      auth: {
        clientId: env.microsoft.clientId,
        clientSecret: env.microsoft.clientSecret,
        authority: `https://login.microsoftonline.com/${env.microsoft.tenant}`,
      },
    })
  : null;

const scopes = ['openid', 'profile', 'email'];

export async function getMicrosoftAuthUrl(): Promise<string> {
  if (!msalClient) {
    throw Object.assign(new Error('Microsoft OAuth is not configured'), { status: 503 });
  }
  return msalClient.getAuthCodeUrl({
    scopes,
    redirectUri: env.microsoft.redirectUri,
    prompt: 'select_account',
  });
}

export async function getMicrosoftUser(code: string) {
  if (!msalClient) {
    throw Object.assign(new Error('Microsoft OAuth is not configured'), { status: 503 });
  }
  const result = await msalClient.acquireTokenByCode({
    code,
    scopes,
    redirectUri: env.microsoft.redirectUri,
  });
  if (!result.account) {
    throw new Error('Microsoft account information not available');
  }
  return {
    providerId: result.account.homeAccountId,
    email: result.account.username,
    name: result.account.name ?? result.account.username,
  };
}
