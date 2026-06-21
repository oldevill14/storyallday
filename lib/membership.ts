// lib/membership.ts — pure access-control logic + plan constants.
//
// No Firestore here — just the rules for "is this account an admin?" and "does
// this account currently have access?". Kept pure so it's trivially testable and
// shared by the gate, the admin page, and the member status badge.

import type { Membership, PlanId, Role } from './types';

/**
 * Accounts that are ALWAYS super-admins, regardless of any stored role field.
 * codename.poker@gmail.com controls everything. (Mirrored in firestore.rules via
 * request.auth.token.email so it's enforced server-side too.)
 */
export const SUPER_ADMIN_EMAILS = ['codename.poker@gmail.com'];

export type PlanMeta = {
  id: PlanId;
  label: string;
  /** Price in THB. */
  price: number;
  /** Billing-period length in days (used to auto-compute expiry). */
  days: number;
  /** Short per-period label, e.g. "/เดือน". */
  per: string;
};

/** Subscription plans offered for web access. */
export const PLANS: Record<PlanId, PlanMeta> = {
  monthly: { id: 'monthly', label: 'รายเดือน', price: 399, days: 30, per: '/เดือน' },
  yearly: { id: 'yearly', label: 'รายปี', price: 4999, days: 365, per: '/ปี' },
};

export const PLAN_LIST: PlanMeta[] = [PLANS.monthly, PLANS.yearly];

/** Case-insensitive super-admin check. */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** True if the account is an admin (super-admin email OR stored role === admin). */
export function isAdminProfile(p: {
  email: string | null | undefined;
  role: Role | null | undefined;
}): boolean {
  return isSuperAdmin(p.email) || p.role === 'admin';
}

export type AccessReason =
  | 'admin' // unlimited (admin / super-admin)
  | 'active' // within an active paid window
  | 'no-membership' // never activated by an admin
  | 'not-started' // activated but startAt is in the future
  | 'expired' // past expiresAt
  | 'suspended'; // admin-suspended

export type AccessState = {
  allowed: boolean;
  reason: AccessReason;
  /** Whole days remaining until expiry (null = no expiry / not applicable). */
  daysLeft: number | null;
  expiresAt: string | null;
  startAt: string | null;
};

const DAY_MS = 86_400_000;

/**
 * Decide whether an account may use the app right now. Admins always pass.
 * `nowMs` is injected for testability (defaults to Date.now()).
 */
export function accessState(
  p: {
    email: string | null | undefined;
    role: Role | null | undefined;
    membership: Membership | null | undefined;
  },
  nowMs: number = Date.now()
): AccessState {
  if (isAdminProfile(p)) {
    return { allowed: true, reason: 'admin', daysLeft: null, expiresAt: null, startAt: null };
  }

  const m = p.membership;
  if (!m || m.status !== 'active' || !m.plan) {
    if (m && m.status === 'suspended') {
      return { allowed: false, reason: 'suspended', daysLeft: null, expiresAt: m.expiresAt ?? null, startAt: m.startAt ?? null };
    }
    return { allowed: false, reason: 'no-membership', daysLeft: null, expiresAt: null, startAt: null };
  }

  const start = m.startAt ? Date.parse(m.startAt) : null;
  const end = m.expiresAt ? Date.parse(m.expiresAt) : null;

  if (start !== null && !Number.isNaN(start) && start > nowMs) {
    return { allowed: false, reason: 'not-started', daysLeft: null, expiresAt: m.expiresAt, startAt: m.startAt };
  }
  if (end !== null && !Number.isNaN(end) && end < nowMs) {
    return { allowed: false, reason: 'expired', daysLeft: 0, expiresAt: m.expiresAt, startAt: m.startAt };
  }

  const daysLeft =
    end !== null && !Number.isNaN(end) ? Math.max(0, Math.ceil((end - nowMs) / DAY_MS)) : null;
  return { allowed: true, reason: 'active', daysLeft, expiresAt: m.expiresAt, startAt: m.startAt };
}

/** Compute an expiry ISO date from a start ISO date + plan length. */
export function computeExpiry(startISO: string, plan: PlanId): string {
  const start = new Date(startISO);
  const end = new Date(start.getTime() + PLANS[plan].days * DAY_MS);
  return end.toISOString();
}

/** "2026-06-21" (date-input value) for an ISO timestamp, or '' if absent. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Thai-formatted date for display, or "—". */
export function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Short Thai label for an access reason (for blocked screens / badges). */
export function accessReasonLabel(reason: AccessReason): string {
  switch (reason) {
    case 'admin':
      return 'แอดมิน · ไม่จำกัด';
    case 'active':
      return 'ใช้งานอยู่';
    case 'no-membership':
      return 'ยังไม่เปิดใช้งาน';
    case 'not-started':
      return 'ยังไม่ถึงวันเริ่มใช้งาน';
    case 'expired':
      return 'หมดอายุแล้ว';
    case 'suspended':
      return 'ถูกระงับการใช้งาน';
  }
}
