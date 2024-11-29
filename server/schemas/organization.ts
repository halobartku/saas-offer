import { z } from 'zod';

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters'),
  }),
});

export const updateOrganizationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization ID'),
  }),
  body: z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters').optional(),
    plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  }),
});

export const addOrganizationMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization ID'),
  }),
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'member']).default('member'),
  }),
});
