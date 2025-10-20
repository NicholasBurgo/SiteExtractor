import { z } from 'zod';

export const BusinessTypeSchema = z.enum(['services', 'restaurant', 'law', 'retail', 'other']);

export const MetaSchema = z.object({
  businessName: z.string().nullable(),
  businessType: BusinessTypeSchema.nullable(),
  slogan: z.string().nullable().optional(),
  background: z.string().nullable().optional(),
  colors: z.array(z.string()).optional(),
});

export type BusinessType = z.infer<typeof BusinessTypeSchema>;
export type Meta = z.infer<typeof MetaSchema>;
