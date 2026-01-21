import { db } from '@/db';
import { auditLogs, AuditEventType } from '@/db/schema';

interface AuditLogParams {
  eventType: AuditEventType;
  userId?: string | null;
  playerId?: string | null;
  donationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      eventType: params.eventType,
      userId: params.userId || null,
      playerId: params.playerId || null,
      donationId: params.donationId || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      details: params.details ? JSON.stringify(params.details) : null,
    });
  } catch (error) {
    // Log but don't throw - audit logging should never break the main flow
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Log a user login event
 */
export async function logLogin(params: {
  userId: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'login',
    userId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: { email: params.email },
  });
}

/**
 * Log a failed login attempt
 */
export async function logLoginFailed(params: {
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'login_failed',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: { email: params.email, reason: params.reason },
  });
}

/**
 * Log a donation created event
 */
export async function logDonationCreated(params: {
  donationId: string;
  playerId: string;
  amount: string;
  donorName?: string | null;
  paymentProvider: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'donation_created',
    playerId: params.playerId,
    donationId: params.donationId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: {
      amount: params.amount,
      donorName: params.donorName,
      paymentProvider: params.paymentProvider,
    },
  });
}

/**
 * Log a donation completed event
 */
export async function logDonationCompleted(params: {
  donationId: string;
  playerId: string;
  amount: string;
  donorName?: string | null;
  paymentProvider: string;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'donation_completed',
    playerId: params.playerId,
    donationId: params.donationId,
    details: {
      amount: params.amount,
      donorName: params.donorName,
      paymentProvider: params.paymentProvider,
    },
  });
}

/**
 * Log a donation failed event
 */
export async function logDonationFailed(params: {
  donationId?: string;
  playerId: string;
  amount?: string;
  reason?: string;
  paymentProvider: string;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'donation_failed',
    playerId: params.playerId,
    donationId: params.donationId,
    details: {
      amount: params.amount,
      reason: params.reason,
      paymentProvider: params.paymentProvider,
    },
  });
}

/**
 * Log a manual donation event
 */
export async function logManualDonation(params: {
  userId: string;
  donationId: string;
  playerId: string;
  amount: string;
  donorName?: string | null;
  paymentMethod: string;
  notes?: string | null;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'manual_donation',
    userId: params.userId,
    playerId: params.playerId,
    donationId: params.donationId,
    details: {
      amount: params.amount,
      donorName: params.donorName,
      paymentMethod: params.paymentMethod,
      notes: params.notes,
    },
  });
}

/**
 * Log player created event
 */
export async function logPlayerCreated(params: {
  userId: string;
  playerId: string;
  playerName: string;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'player_created',
    userId: params.userId,
    playerId: params.playerId,
    details: { playerName: params.playerName },
  });
}

/**
 * Log player updated event
 */
export async function logPlayerUpdated(params: {
  userId: string;
  playerId: string;
  changes: Record<string, unknown>;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'player_updated',
    userId: params.userId,
    playerId: params.playerId,
    details: { changes: params.changes },
  });
}

/**
 * Log player deleted event
 */
export async function logPlayerDeleted(params: {
  userId: string;
  playerId: string;
  playerName: string;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'player_deleted',
    userId: params.userId,
    playerId: params.playerId,
    details: { playerName: params.playerName },
  });
}

/**
 * Log password reset requested
 */
export async function logPasswordResetRequested(params: {
  email: string;
  userId?: string;
  ipAddress?: string | null;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'password_reset_requested',
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { email: params.email },
  });
}

/**
 * Log password reset completed
 */
export async function logPasswordResetCompleted(params: {
  userId: string;
  ipAddress?: string | null;
}): Promise<void> {
  await logAuditEvent({
    eventType: 'password_reset_completed',
    userId: params.userId,
    ipAddress: params.ipAddress,
  });
}

/**
 * Extract IP address from request headers
 */
export function getIpFromHeaders(headers: Headers): string | null {
  // Check various headers for real IP (behind proxies)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return null;
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string | null {
  return headers.get('user-agent');
}
