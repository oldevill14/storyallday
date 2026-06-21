// lib/admin.ts — Firestore operations for the admin member-management screen.
//
// Trust boundary: role + subscription window live in `memberships/{uid}`, a
// collection members CANNOT write (firestore.rules: write requires isAdmin).
// `users/{uid}` is member-owned (brand/email). The member list joins the two.

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { MemberProfile, Membership, Role } from './types';

/** memberships/{uid} document shape. */
type MembershipDoc = { role?: Role; membership?: Membership };

/**
 * List every account (admin only). Master list = `users` (every signed-in
 * account has one); role/membership are joined from `memberships`.
 */
export async function listMembers(): Promise<MemberProfile[]> {
  const [usersSnap, memsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'memberships')),
  ]);

  const mems = new Map<string, MembershipDoc>();
  memsSnap.forEach((d) => mems.set(d.id, d.data() as MembershipDoc));

  const rows: MemberProfile[] = usersSnap.docs.map((d) => {
    const x = d.data() as { email?: string; createdAt?: string };
    const m = mems.get(d.id);
    return {
      uid: d.id,
      email: x.email ?? '',
      role: (m?.role as Role) ?? 'member',
      membership: m?.membership ?? null,
      createdAt: x.createdAt ?? '',
    };
  });

  rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return rows;
}

/** Set/replace a member's subscription window. `updatedBy` = acting admin email. */
export async function setMembership(
  uid: string,
  membership: Membership,
  updatedBy: string
): Promise<void> {
  const payload: Membership = {
    ...membership,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await setDoc(doc(db, 'memberships', uid), { membership: payload }, { merge: true });
}

/** Grant/revoke admin role (stored in the admin-write-only memberships doc). */
export async function setRole(uid: string, role: Role): Promise<void> {
  await setDoc(doc(db, 'memberships', uid), { role }, { merge: true });
}
