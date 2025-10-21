import { z } from 'zod';

export const ServiceItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
});

export type ServiceItem = z.infer<typeof ServiceItemSchema>;
