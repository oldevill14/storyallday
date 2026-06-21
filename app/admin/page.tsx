'use client';

// app/admin/page.tsx — member management (admin only).
//
// Admins set each member's plan + access window (start/expiry) and can grant the
// admin role. The page is client-guarded by the signed-in role; Firestore rules
// are the real boundary (members can't list users or change their own membership).

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Crown,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  Spinner,
  StatCard,
} from '@/components/ui';
import { useStore, useHydrated } from '@/lib/store';
import { listMembers, setMembership, setRole } from '@/lib/admin';
import {
  PLANS,
  PLAN_LIST,
  accessReasonLabel,
  accessState,
  formatThaiDate,
  isAdminProfile,
  isSuperAdmin,
  toDateInput,
} from '@/lib/membership';
import type {
  MemberProfile,
  Membership,
  MembershipStatus,
  PlanId,
  Role,
} from '@/lib/types';

// --- date helpers (local-tz aware) ------------------------------------------
function todayInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function addDaysInput(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function startOfDayISO(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toISOString();
}
function endOfDayISO(dateStr: string): string {
  return new Date(dateStr + 'T23:59:59').toISOString();
}

const STATUS_BADGE: Record<
  ReturnType<typeof accessState>['reason'],
  { color: 'emerald' | 'amber' | 'rose' | 'slate' | 'violet'; label: string }
> = {
  admin: { color: 'violet', label: 'แอดมิน' },
  active: { color: 'emerald', label: 'ใช้งานอยู่' },
  'no-membership': { color: 'slate', label: 'ยังไม่เปิด' },
  'not-started': { color: 'amber', label: 'ยังไม่เริ่ม' },
  expired: { color: 'rose', label: 'หมดอายุ' },
  suspended: { color: 'rose', label: 'ถูกระงับ' },
};

export default function AdminPage() {
  const hydrated = useHydrated();
  const me = useStore((s) => s.me);

  const [rows, setRows] = useState<MemberProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<MemberProfile | null>(null);

  const amAdmin = !!me && isAdminProfile(me);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setRows(await listMembers());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'โหลดรายชื่อสมาชิกไม่สำเร็จ (ตรวจสิทธิ์แอดมิน)'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (amAdmin) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amAdmin]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    let active = 0;
    let admins = 0;
    let blocked = 0;
    for (const r of list) {
      const a = accessState(r);
      if (isAdminProfile(r)) admins++;
      if (a.reason === 'active') active++;
      else if (!a.allowed) blocked++;
    }
    return { total: list.length, active, admins, blocked };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows ?? [];
    if (!q) return list;
    return list.filter(
      (r) => r.email.toLowerCase().includes(q) || r.uid.toLowerCase().includes(q)
    );
  }, [rows, query]);

  // --- guards ---------------------------------------------------------------
  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลด…" />
      </div>
    );
  }
  if (!amAdmin) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <div className="flex flex-col items-center gap-3 py-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <Lock className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-sm text-slate-500">
            หน้านี้สำหรับแอดมินเท่านั้น หากต้องการสิทธิ์ กรุณาติดต่อแอดมินระบบ
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<UserCog className="h-3 w-3" />}>
            ผู้ดูแลระบบ
          </Badge>
        }
        title="จัดการสมาชิก"
        subtitle="กำหนดแพ็กเกจ วันเริ่ม–วันหมดอายุ และสิทธิ์การใช้งานเว็บของสมาชิกแต่ละคน"
        action={
          <Button
            variant="soft"
            icon={<RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />}
            onClick={() => void refresh()}
          >
            รีเฟรช
          </Button>
        }
      />

      {/* Pricing reference */}
      <Card className="border-violet-100 bg-gradient-to-br from-violet-50/60 to-blue-50/40">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="text-sm text-slate-600">
            แพ็กเกจการเข้าใช้บริการเว็บ —{' '}
            {PLAN_LIST.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ' · '}
                <span className="font-semibold text-slate-800">
                  {p.label} {p.price.toLocaleString('th-TH')} บาท{p.per}
                </span>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="สมาชิกทั้งหมด" value={stats.total} icon={Users} color="violet" />
        <StatCard label="ใช้งานอยู่" value={stats.active} icon={Check} color="emerald" />
        <StatCard label="แอดมิน" value={stats.admins} icon={ShieldCheck} color="blue" />
        <StatCard label="ถูกบล็อก/หมดอายุ" value={stats.blocked} icon={Lock} color="amber" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาด้วยอีเมล…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pl-9 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {error && (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
        {rows === null ? (
          <div className="flex justify-center py-16">
            <Spinner label="กำลังโหลดรายชื่อสมาชิก…" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {query ? 'ไม่พบสมาชิกที่ตรงกับการค้นหา' : 'ยังไม่มีสมาชิกในระบบ'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">สมาชิก</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3">แพ็กเกจ</th>
                  <th className="px-3 py-3">เริ่ม–หมดอายุ</th>
                  <th className="px-3 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visible.map((m) => {
                  const a = accessState(m);
                  const sb = STATUS_BADGE[a.reason];
                  const isMe = me?.uid === m.uid;
                  const sa = isSuperAdmin(m.email);
                  return (
                    <tr key={m.uid} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-slate-800">
                            {m.email || '(ไม่มีอีเมล)'}
                          </span>
                          {sa && (
                            <span title="ผู้ดูแลระบบสูงสุด">
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                          {isMe && (
                            <Badge color="slate" variant="soft">
                              คุณ
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {isAdminProfile(m) && (
                            <Badge color="violet" variant="soft">
                              แอดมิน
                            </Badge>
                          )}
                          <span className="font-mono text-[11px] text-slate-400">
                            {m.uid.slice(0, 10)}…
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge color={sb.color} variant="soft">
                          {sb.label}
                        </Badge>
                        {a.allowed && a.daysLeft !== null && (
                          <div className="mt-1 text-[11px] text-slate-400">
                            เหลือ {a.daysLeft} วัน
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {m.membership?.plan ? PLANS[m.membership.plan].label : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <div className="whitespace-nowrap text-xs">
                          {formatThaiDate(m.membership?.startAt)}
                        </div>
                        <div className="whitespace-nowrap text-xs text-slate-400">
                          → {formatThaiDate(m.membership?.expiresAt)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                          จัดการ
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <MemberEditor
          member={editing}
          adminEmail={me?.email ?? ''}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

// --- Editor modal ------------------------------------------------------------

function MemberEditor({
  member,
  adminEmail,
  onClose,
  onSaved,
}: {
  member: MemberProfile;
  adminEmail: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const m = member.membership;
  const [role, setRoleState] = useState<Role>(member.role);
  const [plan, setPlan] = useState<PlanId>(m?.plan ?? 'monthly');
  const [status, setStatus] = useState<MembershipStatus>(m?.status ?? 'active');
  const [startAt, setStartAt] = useState<string>(toDateInput(m?.startAt) || todayInput());
  const [expiresAt, setExpiresAt] = useState<string>(toDateInput(m?.expiresAt) || '');
  const [note, setNote] = useState<string>(m?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const superLocked = isSuperAdmin(member.email); // can't demote the super-admin

  function applyPlanFromToday(p: PlanId) {
    const today = todayInput();
    setPlan(p);
    setStatus('active');
    setStartAt(today);
    setExpiresAt(addDaysInput(today, PLANS[p].days));
  }

  function applyPlanFromStart() {
    if (!startAt) return;
    setExpiresAt(addDaysInput(startAt, PLANS[plan].days));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const membership: Membership = {
        plan,
        status,
        startAt: startAt ? startOfDayISO(startAt) : null,
        expiresAt: expiresAt ? endOfDayISO(expiresAt) : null,
        note: note.trim() || undefined,
      };
      await setMembership(member.uid, membership, adminEmail);
      if (!superLocked && role !== member.role) {
        await setRole(member.uid, role);
      }
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      setSaving(false);
    }
  }

  const field =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">จัดการสมาชิก</h3>
            <p className="truncate text-sm text-slate-500">{member.email}</p>
          </div>
          <button onClick={onClose} aria-label="ปิด" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {/* quick actions */}
          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-500">เปิดใช้งานด่วน (จากวันนี้)</div>
            <div className="flex flex-wrap gap-2">
              {PLAN_LIST.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPlanFromToday(p.id)}
                  className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
                >
                  {p.label} · {PLANS[p.id].days} วัน
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStatus('suspended')}
                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                ระงับการใช้งาน
              </button>
            </div>
          </div>

          {/* plan + status */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">แพ็กเกจ</span>
              <select className={field} value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
                {PLAN_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.price.toLocaleString('th-TH')}฿)
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">สถานะ</span>
              <select
                className={field}
                value={status}
                onChange={(e) => setStatus(e.target.value as MembershipStatus)}
              >
                <option value="active">เปิดใช้งาน</option>
                <option value="suspended">ระงับ</option>
              </select>
            </label>
          </div>

          {/* dates */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">วันเริ่ม</span>
              <input type="date" className={field} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">วันหมดอายุ</span>
              <input type="date" className={field} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
          </div>
          <button
            type="button"
            onClick={applyPlanFromStart}
            className="text-xs font-medium text-violet-600 hover:underline"
          >
            คำนวณวันหมดอายุจากวันเริ่ม + {PLANS[plan].days} วัน
          </button>

          {/* note */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">หมายเหตุ (ไม่บังคับ)</span>
            <input
              type="text"
              className={field}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ชำระเงินแล้ว 21 มิ.ย."
            />
          </label>

          {/* role */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">สิทธิ์ (Role)</span>
            <select
              className={field}
              value={role}
              disabled={superLocked}
              onChange={(e) => setRoleState(e.target.value as Role)}
            >
              <option value="member">สมาชิก (member)</option>
              <option value="admin">แอดมิน (admin)</option>
            </select>
            {superLocked && (
              <span className="mt-1 block text-[11px] text-amber-600">
                บัญชีนี้เป็นผู้ดูแลระบบสูงสุด — เปลี่ยนสิทธิ์ไม่ได้
              </span>
            )}
          </label>

          {err && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button icon={<Check className="h-4 w-4" />} loading={saving} onClick={() => void save()}>
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
