import { createHash } from 'crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function phash(input: string): string {
  // Placeholder for perceptual hashing
  // This would typically use a library like blockhash or similar
  return createHash('md5').update(input).digest('hex');
}

export function generateRunId(domain: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const domainSlug = domain.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return `${domainSlug}-${timestamp}`;
}
