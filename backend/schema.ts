
import { pgTable, text, timestamp, boolean, uuid, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  name: text('name'),
  appleId: text('apple_id').unique(),
  passwordHash: text('password_hash'),
  isPremium: boolean('is_premium').default(false),
  subscriptionStatus: text('subscription_status'),
  subscriptionData: jsonb('subscription_data'),
  trialStartedAt: timestamp('trial_started_at'),
  trialExpiresAt: timestamp('trial_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
