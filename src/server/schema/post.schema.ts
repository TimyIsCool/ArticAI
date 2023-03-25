import { z } from 'zod';
import { imageMetaSchema } from '~/server/schema/image.schema';
import { postgresSlugify } from '~/utils/string-helpers';
import { constants } from '~/server/common/constants';
import { MetricTimeframe } from '@prisma/client';
import { BrowsingMode, PostSort } from '~/server/common/enums';
import { isDefined } from '~/utils/type-guards';

export type PostsFilterInput = z.infer<typeof postsFilterSchema>;
export const postsFilterSchema = z.object({
  browsingMode: z.nativeEnum(BrowsingMode).default(constants.postFilterDefaults.browsingMode),
  period: z.nativeEnum(MetricTimeframe).default(constants.postFilterDefaults.period),
  sort: z.nativeEnum(PostSort).default(constants.postFilterDefaults.sort),
});

export type PostsQueryInput = z.infer<typeof postsQuerySchema>;
export const postsQuerySchema = postsFilterSchema.extend({
  limit: z.preprocess((val) => Number(val), z.number().min(0).max(100)).default(50),
  cursor: z.preprocess((val) => Number(val), z.number()).optional(),
  query: z.string().optional(),
  excludedTagIds: z.array(z.number()).optional(),
  excludedUserIds: z.array(z.number()).optional(),
  excludedImageIds: z.array(z.number()).optional(),
  tags: z.number().array().optional(),
  username: z
    .string()
    .transform((data) => postgresSlugify(data))
    .optional(),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export const postCreateSchema = z.object({
  modelVersionId: z.number().optional(),
});

export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
export const postUpdateSchema = z.object({
  id: z.number(),
  nsfw: z.boolean().optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
  publishedAt: z.date().optional(),
});

export type RemovePostTagInput = z.infer<typeof removePostTagSchema>;
export const removePostTagSchema = z.object({
  postId: z.number(),
  id: z.number(),
});

export type AddPostTagInput = z.infer<typeof addPostTagSchema>;
export const addPostTagSchema = z.object({
  postId: z.number(),
  id: z.number().optional(),
  name: z.string(),
});

// consider moving image creation to post service?
export type AddPostImageInput = z.infer<typeof addPostImageSchema>;
export const addPostImageSchema = z.object({
  name: z.string().nullish(),
  url: z.string().url().or(z.string().uuid()),
  hash: z.string().nullish(),
  height: z.number().nullish(),
  width: z.number().nullish(),
  nsfw: z.boolean().optional(),
  resources: z.array(z.string()).optional(),
  postId: z.number(),
  modelVersionId: z.number().optional(),
  index: z.number(),
  mimeType: z.string(),
  meta: z.preprocess((value) => {
    if (typeof value !== 'object') return null;
    if (value && !Object.keys(value).length) return null;
    return value;
  }, imageMetaSchema.nullish()),
});

export type UpdatePostImageInput = z.infer<typeof updatePostImageSchema>;
export const updatePostImageSchema = z.object({
  id: z.number(),
  meta: z.preprocess((value) => {
    if (typeof value !== 'object') return null;
    if (value && !Object.values(value).filter(isDefined).length) return null;
    return value;
  }, imageMetaSchema.nullish()),
  hideMeta: z.boolean().optional(),
  nsfw: z.boolean().optional(),
  // resources: z.array(imageResourceUpsertSchema),
});

export type ReorderPostImagesInput = z.infer<typeof reorderPostImagesSchema>;
export const reorderPostImagesSchema = z.object({
  id: z.number(),
  imageIds: z.number().array(),
});

export type GetPostTagsInput = z.infer<typeof getPostTagsSchema>;
export const getPostTagsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().default(10),
});
