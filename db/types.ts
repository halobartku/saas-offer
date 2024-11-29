import { InferModel } from 'drizzle-orm';
import * as schema from './schema';

// Infer types from schema
export type User = InferModel<typeof schema.users>;
export type NewUser = InferModel<typeof schema.users, 'insert'>;

export type Organization = InferModel<typeof schema.organizations>;
export type NewOrganization = InferModel<typeof schema.organizations, 'insert'>;

export type OrganizationMember = InferModel<typeof schema.organizationMembers>;
export type NewOrganizationMember = InferModel<typeof schema.organizationMembers, 'insert'>;

export type Product = InferModel<typeof schema.products>;
export type NewProduct = InferModel<typeof schema.products, 'insert'>;

export type Subscription = InferModel<typeof schema.subscriptions>;
export type NewSubscription = InferModel<typeof schema.subscriptions, 'insert'>;
