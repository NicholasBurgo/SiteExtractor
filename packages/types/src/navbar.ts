import { z } from 'zod';

export const NavbarItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  order: z.number(),
  status: z.enum(['pending', 'keep', 'reject', 'edit']),
  children: z.array(z.any()).default([]), // Simplified for now
  is_locked: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});

export type NavbarItem = z.infer<typeof NavbarItemSchema>;
