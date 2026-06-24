'use client';

import { useState } from 'react';
import {
  Bot,
  Check,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Link2,
  Lock,
  Plug,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Mascot,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { useStore, useHydrated } from '@/lib/store';
import { callAI, humanizeAIError } from '@/lib/ai';
import type { AISettings, Provider } from '@/lib/types';
import {
  PROVIDERS,
  defaultModelFor,
  getProviderMeta,
} from '@/components/settings/providers';
import { ProviderCard } from '@/components/settings/ProviderCard';
import { ModelPicker } from '@/components/settings/ModelPicker';

type TestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

export default function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  // Local draft so typing/selecting doesn't clobber persisted state until "Save".
  const [draft, setDraft] = useState<AISettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  // Bumped on a successful test → forces the model picker to (re)fetch the live
  // list for the just-validated key.
  const [reloadToken, setReloadToken] = useState(0);

  // Re-seed the draft from the store the moment persisted state hydrates in.
  // Adjusting state during render (with a prev-value tracker) avoids the
  // cascading renders that a setState-in-effect would cause.
  const [seededHydrated, setSeededHydrated] = useState(hydrated);
  if (hydrated && !seededHydrated) {
    setSeededHydrated(true);
    setDraft(settings);
  }

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลดการตั้งค่า…" />
      </div>
    );
  }

  const meta = getProviderMeta(draft.provider);

  const patch = (p: Partial<AISettings>) => {
    setDraft((d) => ({ ...d, ...p }));
    setSaved(false);
    setTest({ status: 'idle' });
  };

  const selectProvider = (provider: Provider) => {
    // Load THIS provider's own saved config (key/model/baseUrl) so switching
    // providers never shows another provider's key. Falls back to the provider
    // default model when nothing is saved yet.
    const saved = settings.keys?.[provider];
    setDraft((d) => ({
      ...d,
      provider,
      apiKey: saved?.apiKey || '',
      model: saved?.model ?? defaultModelFor(provider),
      baseUrl: saved?.baseUrl ?? '',
    }));
    setSaved(false);
    setTest({ status: 'idle' });
  };

  // The live model picker can fetch when: OpenRouter (public catalog) or zai
  // (curated list) need no key, OR the connection test for the typed key passed.
  const modelsEnabled =
    draft.provider === 'openrouter' ||
    draft.provider === 'zai' ||
    test.status === 'ok';

  const dirty =
    draft.provider !== settings.provider ||
    draft.apiKey !== settings.apiKey ||
    draft.model !== settings.model ||
    (draft.baseUrl || '') !== (settings.baseUrl || '');

  const onSave = () => {
    setSettings({
      provider: draft.provider,
      apiKey: draft.apiKey.trim(),
      model: draft.model.trim() || meta.defaultModel,
      baseUrl: draft.baseUrl?.trim() || '',
    });
    setSaved(true);
  };

  const onReset = () => {
    setDraft(settings);
    setSaved(false);
    setTest({ status: 'idle' });
  };

  const onTest = async () => {
    if (!draft.apiKey.trim()) {
      setTest({ status: 'error', message: 'กรุณากรอก API Key ก่อนทดสอบการเชื่อมต่อ' });
      return;
    }
    setTest({ status: 'loading' });
    try {
      const text = await callAI(
        { prompt: 'ตอบกลับสั้นๆ ว่า OK' },
        {
          provider: draft.provider,
          apiKey: draft.apiKey.trim(),
          model: draft.model.trim() || meta.defaultModel,
          baseUrl: draft.baseUrl?.trim() || undefined,
        }
      );
      const reply = text.trim().slice(0, 120) || 'OK';
      setTest({
        status: 'ok',
        message: `เชื่อมต่อสำเร็จ! AI ตอบกลับว่า: "${reply}"`,
      });
      // Key validated → (re)load the live model list for this provider.
      setReloadToken((t) => t + 1);
    } catch (e) {
      setTest({
        status: 'error',
        message: humanizeAIError(
          e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
        ),
      });
    }
  };

  const inputBase =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ' +
    'focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-colors';

  const keyConfigured = settings.apiKey.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<Sparkles className="h-3 w-3" />}>
            ตั้งค่า AI
          </Badge>
        }
        title="ตั้งค่า AI"
        subtitle="เลือกผู้ให้บริการ AI และเชื่อมต่อ API Key เพื่อให้ Story AI ช่วยคิดและเขียนคอนเทนต์ให้คุณ"
        action={
          <div className="flex items-center gap-2">
            {dirty && (
              <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={onReset}>
                ยกเลิก
              </Button>
            )}
            <Button icon={<Save className="h-4 w-4" />} onClick={onSave} disabled={!dirty && saved}>
              บันทึกการตั้งค่า
            </Button>
          </div>
        }
      />

      {/* Current status banner */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Mascot size={52} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">สถานะการเชื่อมต่อ</span>
              {keyConfigured ? (
                <Badge color="emerald" icon={<Check className="h-3 w-3" />}>
                  พร้อมใช้งาน
                </Badge>
              ) : (
                <Badge color="amber" icon={<KeyRound className="h-3 w-3" />}>
                  ยังไม่ได้ตั้งค่า
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {keyConfigured ? (
                <>
                  ใช้งาน{' '}
                  <span className="font-medium text-slate-700">
                    {getProviderMeta(settings.provider).label}
                  </span>{' '}
                  · โมเดล{' '}
                  <span className="font-medium text-slate-700">{settings.model}</span>
                </>
              ) : (
                'กรอก API Key แล้วกดบันทึก เพื่อเริ่มให้ AI ช่วยสร้างคอนเทนต์'
              )}
            </p>
          </div>
        </div>
        <Button
          variant="soft"
          icon={<Plug className="h-4 w-4" />}
          loading={test.status === 'loading'}
          onClick={onTest}
        >
          ทดสอบการเชื่อมต่อ
        </Button>
      </Card>

      {/* Provider selection */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-600" />
          <h2 className="text-base font-semibold text-slate-900">เลือกผู้ให้บริการ AI</h2>
        </div>
        <div
          role="radiogroup"
          aria-label="ผู้ให้บริการ AI"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              meta={p}
              selected={draft.provider === p.id}
              onSelect={() => selectProvider(p.id)}
            />
          ))}
        </div>
      </Card>

      {/* Connection details */}
      <Card>
        <div className="mb-5 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-violet-600" />
          <h2 className="text-base font-semibold text-slate-900">รายละเอียดการเชื่อมต่อ</h2>
        </div>

        <div className="space-y-5">
          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => patch({ apiKey: e.target.value })}
                placeholder="วาง API Key ของคุณที่นี่"
                autoComplete="off"
                spellCheck={false}
                className={inputBase + ' pr-11 font-mono'}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'ซ่อน API Key' : 'แสดง API Key'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              ยังไม่มีคีย์?{' '}
              <a
                href={meta.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-violet-600 hover:text-violet-700 hover:underline"
              >
                ขอ API Key ของ {meta.label}
              </a>
            </p>
          </div>

          {/* Sync keys to the account (Firestore) — opt-in, default OFF */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <input
              type="checkbox"
              checked={!!settings.syncKeys}
              onChange={(e) => setSettings({ syncKeys: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-violet-600"
            />
            <span className="text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-700">ซิงค์ API key ข้ามอุปกรณ์</span> —
              เก็บคีย์ไว้ในบัญชีของคุณ (Firestore) ให้ตามไปทุกเครื่องที่ล็อกอินบัญชีนี้
              <span className="mt-0.5 block text-[11px] text-slate-400">
                ปิด (แนะนำ) = คีย์อยู่ในเครื่องนี้เท่านั้น ปลอดภัยสุด · เปิด =
                เก็บคีย์ในฐานข้อมูลบัญชี (สะดวกข้ามเครื่อง)
              </span>
            </span>
          </label>

          {/* Model */}
          <div>
            <label
              htmlFor="model"
              className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"
            >
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              โมเดล (Model)
              <Badge color="violet" variant="soft">
                {meta.label}
              </Badge>
            </label>
            <p className="mb-2 text-xs text-slate-500">
              {modelsEnabled
                ? 'เลือกจากโมเดลที่ใช้ได้จริงของผู้ให้บริการนี้ — แสดงราคาต่อ 1 ล้าน tokens (ถ้ามี)'
                : 'รายการโมเดลจะดึงให้อัตโนมัติเมื่อ “ทดสอบการเชื่อมต่อ” สำเร็จ'}
            </p>

            <ModelPicker
              provider={draft.provider}
              apiKey={draft.apiKey.trim()}
              baseUrl={draft.baseUrl?.trim() || undefined}
              value={draft.model}
              onChange={(id) => patch({ model: id })}
              enabled={modelsEnabled}
              reloadToken={reloadToken}
            />

            {/* Manual override / offline fallback */}
            <div className="mt-3">
              <label
                htmlFor="model"
                className="mb-1 block text-xs font-medium text-slate-500"
              >
                หรือพิมพ์ชื่อโมเดลเอง
              </label>
              <input
                id="model"
                type="text"
                value={draft.model}
                onChange={(e) => patch({ model: e.target.value })}
                placeholder={meta.defaultModel}
                autoComplete="off"
                spellCheck={false}
                className={inputBase + ' font-mono'}
                list="model-suggestions"
              />
              <datalist id="model-suggestions">
                {meta.models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              เลือกแล้ว:{' '}
              <span className="font-mono text-slate-600">
                {draft.model || '— ยังไม่ได้เลือก —'}
              </span>
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label htmlFor="baseUrl" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Link2 className="h-3.5 w-3.5 text-slate-400" />
              Base URL
              <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
            </label>
            <input
              id="baseUrl"
              type="text"
              value={draft.baseUrl ?? ''}
              onChange={(e) => patch({ baseUrl: e.target.value })}
              placeholder={meta.baseUrlPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className={inputBase + ' font-mono'}
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              ปล่อยว่างไว้เพื่อใช้ค่าเริ่มต้น — กรอกเฉพาะเมื่อใช้ proxy / gateway / self-host
            </p>
          </div>
        </div>

        {/* Test result */}
        {test.status !== 'idle' && (
          <div className="mt-5">
            {test.status === 'loading' && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Spinner size={16} />
                <span className="text-sm text-slate-600">กำลังทดสอบการเชื่อมต่อ…</span>
              </div>
            )}
            {test.status === 'ok' && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <p className="text-sm font-medium text-emerald-800">{test.message}</p>
              </div>
            )}
            {test.status === 'error' && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                  <X className="h-3 w-3" strokeWidth={3} />
                </span>
                <p className="text-sm font-medium text-rose-800">{test.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Action footer */}
        <div className="mt-6 flex flex-col-reverse items-stretch gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[1.25rem] text-sm">
            {saved && !dirty && (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                <Check className="h-4 w-4" /> บันทึกการตั้งค่าแล้ว
              </span>
            )}
            {dirty && (
              <span className="inline-flex items-center gap-1.5 text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Plug className="h-4 w-4" />}
              loading={test.status === 'loading'}
              onClick={onTest}
            >
              ทดสอบการเชื่อมต่อ
            </Button>
            <Button icon={<Save className="h-4 w-4" />} onClick={onSave} disabled={!dirty && saved}>
              บันทึก
            </Button>
          </div>
        </div>
      </Card>

      {/* Privacy / security note */}
      <Card className="border-violet-100 bg-gradient-to-br from-violet-50/60 to-blue-50/40">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">ความเป็นส่วนตัว & ความปลอดภัย</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              API Key ของคุณถูกเก็บไว้ใน{' '}
              <span className="font-medium text-slate-800">localStorage บนเครื่องของคุณเท่านั้น</span>{' '}
              — ไม่ถูกส่งหรือบันทึกไว้บนเซิร์ฟเวอร์ของเรา เมื่อเรียกใช้ AI คีย์จะถูกส่งผ่าน
              proxy ของแอปไปยังผู้ให้บริการที่คุณเลือกโดยตรงเท่านั้น หากใช้เครื่องสาธารณะ
              แนะนำให้ลบคีย์ออกหลังใช้งาน
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
