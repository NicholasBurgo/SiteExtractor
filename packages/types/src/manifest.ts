import { z } from 'zod';

export const ImageManifestSchema = z.object({
  id: z.string(),
  original_url: z.string(),
  local_path: z.string(),
  thumbnail_path: z.string().optional(),
  role: z.enum(['logo', 'hero', 'gallery', 'background', 'icon', 'unknown']),
  status: z.enum(['pending', 'keep', 'reject', 'edit']),
  confidence: z.number().min(0).max(1),
  width: z.number().optional(),
  height: z.number().optional(),
  file_size: z.number().optional(),
  alt_text: z.string().optional(),
  labels: z.array(z.string()).default([]),
  entity_links: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ImageManifest = z.infer<typeof ImageManifestSchema>;
