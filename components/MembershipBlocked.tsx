'use client';

// components/MembershipBlocked.tsx — full-screen screen shown to signed-in users
// who don't currently have access (new/awaiting-activation, expired, suspended,
// or not-yet-started). Admins never see this. Offers plan info + a way out
// (contact admin / sign out).

import { Clock, Lock, LogOut, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { PLAN_LIST, SUPER_ADMIN_EMAILS, formatThaiDate } from '@/lib/membership';
import type { AccessReason } from '@/lib/membership';

const ADMIN_CONTACT = SUPER_ADMIN_EMAILS[0];

function copy(reason: AccessReason): { title: string; body: string; icon: typeof Lock } {
  switch (reason) {
    case 'expired':
      return {
        title: 'การใช้งานหมดอายุแล้ว',
        body: 'สมาชิกของคุณหมดอายุ กรุณาต่ออายุการใช้งานกับแอดมินเพื่อกลับเข้าใช้ Story AI ต่อ',
        icon: Clock,
      };
    case 'suspended':
      return {
        title: 'บัญชีถูกระงับการใช้งาน',
        body: 'บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อแอดมินเพื่อสอบถามรายละเอียด',
        icon: ShieldAlert,
      };
    case 'not-started':
      return {
        title: 'ยังไม่ถึงวันเริ่มใช้งาน',
        body: 'แอดมินกำหนดวันเริ่มใช้งานของคุณไว้ในอนาคต โปรดกลับมาอีกครั้งเมื่อถึงวันเริ่ม',
        icon: Clock,
      };
    case 'no-membership':
    default:
      return {
        title: 'บัญชีของคุณยังไม่เปิดใช้งาน',
        body: 'ยินดีต้อนรับ! บัญชีของคุณถูกสร้างแล้ว แต่ต้องให้แอดมินเปิดสิทธิ์การใช้งานก่อน — เลือกแพ็กเกจด้านล่างแล้วแจ้งแอดมินเพื่อเริ่มใช้งาน',
        icon: Lock,
      };
  }
}

export function MembershipBlocked({
  reason,
  email,
  expiresAt,
}: {
  reason: AccessReason;
  email: string;
  expiresAt?: string | null;
}) {
  const router = useRouter();
  const { signOutUser } = useAuth();
  const c = copy(reason);
  const Icon = c.icon;

  async function handleSignOut() {
    try {
      await signOutUser();
      router.replace('/login');
    } catch {
      /* AuthGate will redirect on state change anyway */
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/40 to-blue-50/40 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg">
              <Icon className="h-8 w-8" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-slate-900">{c.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.body}</p>
            {reason === 'expired' && expiresAt && (
              <p className="mt-1 text-xs text-slate-400">
                หมดอายุเมื่อ {formatThaiDate(expiresAt)}
              </p>
            )}
          </div>

          {/* Plans */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {PLAN_LIST.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-center"
              >
                <div className="text-sm font-semibold text-slate-700">{p.label}</div>
                <div className="mt-1 text-2xl font-bold text-violet-700">
                  {p.price.toLocaleString('th-TH')}
                  <span className="text-sm font-medium text-slate-400"> บาท</span>
                </div>
                <div className="text-xs text-slate-400">{p.per}</div>
              </div>
            ))}
          </div>

          {/* Contact admin */}
          <a
            href={`mailto:${ADMIN_CONTACT}?subject=${encodeURIComponent(
              'ขอเปิด/ต่ออายุการใช้งาน Story AI'
            )}&body=${encodeURIComponent(`บัญชี: ${email}\nต้องการแพ็กเกจ: (รายเดือน/รายปี)\n`)}`}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            <Mail className="h-4 w-4" />
            ติดต่อแอดมินเพื่อเปิดใช้งาน
          </a>
          <p className="mt-2 text-center text-xs text-slate-400">
            แอดมิน: <span className="font-medium text-slate-500">{ADMIN_CONTACT}</span>
          </p>

          {/* Account + sign out */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
            <div className="min-w-0">
              <div className="text-xs text-slate-400">เข้าสู่ระบบในชื่อ</div>
              <div className="truncate text-sm font-medium text-slate-700">{email}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <Sparkles className="h-3.5 w-3.5" />
          Story AI · ผู้ช่วยคอนเทนต์ประจำวัน
        </p>
      </div>
    </div>
  );
}
