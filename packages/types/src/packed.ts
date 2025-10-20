import { z } from 'zod';
import { ImageManifestSchema } from './manifest';
import { TextBlockSchema } from './text';
import { NavbarItemSchema } from './navbar';

export const PackedSiteSchema = z.object({
  id: z.string(),
  domain: z.string(),
  business_name: z.string(),
  images: z.array(ImageManifestSchema),
  copy: z.array(TextBlockSchema),
  navigation: NavbarItemSchema,
  meta: z.object({
    colors: z.array(z.string()).default([]),
    og: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
    }).optional(),
    schema: z.record(z.any()).optional(),
    favicon: z.string().optional(),
  }),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PackedImagesSchema = z.object({
  images: z.array(ImageManifestSchema),
});

export const PackedTextSchema = z.object({
  copy: z.array(TextBlockSchema),
});

export const PackedNavigationSchema = z.object({
  navigation: NavbarItemSchema,
});

export type PackedSite = z.infer<typeof PackedSiteSchema>;
export type PackedImages = z.infer<typeof PackedImagesSchema>;
export type PackedText = z.infer<typeof PackedTextSchema>;
export type PackedNavigation = z.infer<typeof PackedNavigationSchema>;
