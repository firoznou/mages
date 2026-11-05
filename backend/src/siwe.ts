/**
 * Sign-In with Ethereum (SIWE / EIP-4361) Verification Module
 * Provides cryptographically secure nonce generation, message verification, and session creation.
 */

import crypto from 'node:crypto';

export interface SiweMessageData {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createSiweMessage(data: SiweMessageData): string {
  let message = `${data.domain} wants you to sign in with your Ethereum account:\n${data.address}\n\n`;
  if (data.statement) {
    message += `${data.statement}\n\n`;
  }
  message += `URI: ${data.uri}\n`;
  message += `Version: ${data.version}\n`;
  message += `Chain ID: ${data.chainId}\n`;
  message += `Nonce: ${data.nonce}\n`;
  message += `Issued At: ${data.issuedAt}`;
  if (data.expirationTime) {
    message += `\nExpiration Time: ${data.expirationTime}`;
  }
  return message;
}

export function parseSiweMessage(message: string): Partial<SiweMessageData> {
  const lines = message.split('\n');
  const result: Partial<SiweMessageData> = {};

  const headerMatch = lines[0]?.match(/^(.+) wants you to sign in with your Ethereum account:$/);
  if (headerMatch) {
    result.domain = headerMatch[1];
  }
  if (lines[1]) {
    result.address = lines[1].trim();
  }

  for (const line of lines) {
    if (line.startsWith('URI: ')) result.uri = line.substring(5).trim();
    if (line.startsWith('Version: ')) result.version = line.substring(9).trim();
    if (line.startsWith('Chain ID: ')) result.chainId = parseInt(line.substring(10).trim(), 10);
    if (line.startsWith('Nonce: ')) result.nonce = line.substring(7).trim();
    if (line.startsWith('Issued At: ')) result.issuedAt = line.substring(11).trim();
    if (line.startsWith('Expiration Time: ')) result.expirationTime = line.substring(17).trim();
  }

  return result;
}

