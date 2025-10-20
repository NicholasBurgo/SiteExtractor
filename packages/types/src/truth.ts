import { z } from 'zod';

export const ProvenanceSchema = z.object({
  url: z.string(),
  path: z.string(),
});

export const FieldValueSchema = z.object({
  value: z.union([z.string(), z.array(z.string()), z.record(z.any()), z.null()]),
  confidence: z.number().min(0).max(1),
  provenance: z.array(ProvenanceSchema),
  notes: z.string(),
});

export const CandidateSchema = z.object({
  value: z.union([z.string(), z.array(z.string()), z.record(z.any()), z.null()]),
  score: z.number().min(0).max(1),
  provenance: z.array(ProvenanceSchema),
  notes: z.string(),
});

export const DownloadedImageSchema = z.object({
  original_url: z.string(),
  local_path: z.string(),
  zone: z.string(),
  confidence: z.number().min(0).max(1),
});

export const TruthRecordSchema = z.object({
  business_id: z.string(),
  domain: z.string(),
  crawled_at: z.string(),
  pages_visited: z.number(),
  fields: z.object({
    brand_name: FieldValueSchema,
    location: FieldValueSchema,
    email: FieldValueSchema,
    phone: FieldValueSchema,
    socials: FieldValueSchema,
    services: FieldValueSchema,
    brand_colors: FieldValueSchema,
    logo: FieldValueSchema,
    background: FieldValueSchema,
    slogan: FieldValueSchema,
    images: FieldValueSchema.optional(),
    downloaded_images: FieldValueSchema.optional(),
  }),
  candidates: z.object({
    brand_name: z.array(CandidateSchema),
    location: z.array(CandidateSchema),
    email: z.array(CandidateSchema),
    phone: z.array(CandidateSchema),
    socials: z.union([
      z.array(CandidateSchema),
      z.object({
        facebook: z.array(CandidateSchema),
        instagram: z.array(CandidateSchema),
        linkedin: z.array(CandidateSchema),
        x: z.array(CandidateSchema),
        youtube: z.array(CandidateSchema),
        tiktok: z.array(CandidateSchema),
        yelp: z.array(CandidateSchema),
      }),
    ]),
    services: z.array(CandidateSchema),
    brand_colors: z.array(CandidateSchema),
    logo: z.array(CandidateSchema),
    images: z.array(CandidateSchema).optional(),
    background: z.array(CandidateSchema),
    slogan: z.array(CandidateSchema),
  }),
});

export type Provenance = z.infer<typeof ProvenanceSchema>;
export type FieldValue = z.infer<typeof FieldValueSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type DownloadedImage = z.infer<typeof DownloadedImageSchema>;
export type TruthRecord = z.infer<typeof TruthRecordSchema>;
