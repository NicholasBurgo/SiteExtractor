import { z } from 'zod';

export const TextBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['heading', 'paragraph', 'list', 'table', 'quote']),
  content: z.string(),
  status: z.enum(['pending', 'keep', 'reject', 'edit']),
  confidence: z.number().min(0).max(1),
  page_url: z.string(),
  dom_selector: z.string(),
  text_hash: z.string(),
  entity_links: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  hierarchy_level: z.number().optional(),
  parent_block_id: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TextBlock = z.infer<typeof TextBlockSchema>;
