import { pgTable, uuid, varchar, text, timestamp, integer, boolean, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'player']);

// Users table (for authentication)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('player'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Players table
export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  photoUrl: text('photo_url'),
  parentEmail: varchar('parent_email', { length: 255 }),
  goal: decimal('goal', { precision: 10, scale: 2 }).notNull().default('100.00'),
  totalRaised: decimal('total_raised', { precision: 10, scale: 2 }).notNull().default('0.00'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Squares table (heart grid squares)
export const squares = pgTable('squares', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'cascade' }).notNull(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  isPurchased: boolean('is_purchased').notNull().default(false),
  donorName: varchar('donor_name', { length: 255 }),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  purchasedAt: timestamp('purchased_at'),
});

// Donations/Transactions table
export const donations = pgTable('donations', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'cascade' }).notNull(),
  squareId: uuid('square_id').references(() => squares.id, { onDelete: 'set null' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  donorName: varchar('donor_name', { length: 255 }),
  donorEmail: varchar('donor_email', { length: 255 }),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  stripeCustomerId: text('stripe_customer_id'),
  // Square payment fields
  paymentProvider: varchar('payment_provider', { length: 50 }).default('stripe'), // 'stripe' | 'square' | 'manual'
  squarePaymentId: text('square_payment_id').unique(),
  squareOrderId: text('square_order_id'),
  // Manual donation fields
  manualPaymentMethod: varchar('manual_payment_method', { length: 50 }), // 'cash' | 'check' | 'other'
  notes: text('notes'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, succeeded, failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  player: one(players, {
    fields: [users.id],
    references: [players.userId],
  }),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  user: one(users, {
    fields: [players.userId],
    references: [users.id],
  }),
  squares: many(squares),
  donations: many(donations),
}));

export const squaresRelations = relations(squares, ({ one }) => ({
  player: one(players, {
    fields: [squares.playerId],
    references: [players.id],
  }),
  donation: one(donations, {
    fields: [squares.id],
    references: [donations.squareId],
  }),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  player: one(players, {
    fields: [donations.playerId],
    references: [players.id],
  }),
  square: one(squares, {
    fields: [donations.squareId],
    references: [squares.id],
  }),
}));

// Settings table (for app configuration)
export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(), // Encrypted if isSecret=true
  category: varchar('category', { length: 100 }).notNull(), // 'stripe', 'app'
  isSecret: boolean('is_secret').notNull().default(false),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Settings audit log table
export const settingsAuditLog = pgTable('settings_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  settingId: uuid('setting_id').references(() => settings.id, { onDelete: 'set null' }),
  settingKey: varchar('setting_key', { length: 255 }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(), // 'create', 'update', 'delete'
  oldValue: text('old_value'), // Encrypted if secret
  newValue: text('new_value'), // Encrypted if secret
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Donations audit log table (for tracking manual donations and adjustments)
export const donationsAuditLog = pgTable('donations_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  donationId: uuid('donation_id').references(() => donations.id, { onDelete: 'set null' }),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(), // 'manual_donation', 'adjustment', 'void'
  amount: decimal('amount', { precision: 10, scale: 2 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  donorName: varchar('donor_name', { length: 255 }),
  notes: text('notes'),
  details: text('details'), // JSON string with additional details
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Settings relations
export const settingsRelations = relations(settings, ({ many }) => ({
  auditLogs: many(settingsAuditLog),
}));

export const settingsAuditLogRelations = relations(settingsAuditLog, ({ one }) => ({
  setting: one(settings, {
    fields: [settingsAuditLog.settingId],
    references: [settings.id],
  }),
  user: one(users, {
    fields: [settingsAuditLog.userId],
    references: [users.id],
  }),
}));

export const donationsAuditLogRelations = relations(donationsAuditLog, ({ one }) => ({
  donation: one(donations, {
    fields: [donationsAuditLog.donationId],
    references: [donations.id],
  }),
  player: one(players, {
    fields: [donationsAuditLog.playerId],
    references: [players.id],
  }),
  user: one(users, {
    fields: [donationsAuditLog.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Square = typeof squares.$inferSelect;
export type NewSquare = typeof squares.$inferInsert;
export type Donation = typeof donations.$inferSelect;
export type NewDonation = typeof donations.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type SettingsAuditLog = typeof settingsAuditLog.$inferSelect;
export type NewSettingsAuditLog = typeof settingsAuditLog.$inferInsert;
export type DonationsAuditLog = typeof donationsAuditLog.$inferSelect;
export type NewDonationsAuditLog = typeof donationsAuditLog.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
