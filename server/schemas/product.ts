import { z } from 'zod';

const featureSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  included: z.boolean().default(true),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters'),
    description: z.string().optional(),
    price: z.number().int('Price must be an integer').min(0, 'Price cannot be negative'),
    features: z.array(featureSchema).default([]),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID'),
  }),
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters').optional(),
    description: z.string().optional(),
    price: z.number().int('Price must be an integer').min(0, 'Price cannot be negative').optional(),
    active: z.boolean().optional(),
    features: z.array(featureSchema).optional(),
  }),
});
