'use client';

import type { ReactNode } from 'react';
import type { Platform } from '@/lib/types';
import { Card, Button, Badge, PlatformIcon } from '@/components/ui';
import { CheckCircle2, Circle, Link2, Unlink } from 'lucide-react';

export type PlatformCardProps = {
  platform: Platform;
  name: string;
  /** Short Thai description of what the platform connection unlocks. */
  description: string;
  /** Bullet benefits shown under the description. */
  benefits: string[];
  connected: boolean;
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
};

/** One connectable platform: status + connect/disconnect action + benefits. */
export function PlatformCard({
  platform,
  name,
  description,
  benefits,
  connected,
  onConnect,
  onDisconnect,
}: PlatformCardProps) {
  return (
    <Card hoverable className="flex flex-col">
      {/* Header: icon + name + status chip */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
            <PlatformIcon platform={platform} size={34} />
          </span>
          <div>
            <div className="text-base font-bold text-slate-900">{name}</div>
            <StatusPill connected={connected} />
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-4 text-sm leading-relaxed text-slate-600">{description}</p>

      {/* Benefits */}
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* Action */}
      <div className="mt-5 pt-1">
        {connected ? (
          <Button
            variant="outline"
            className="w-full"
            icon={<Unlink className="h-4 w-4" />}
            onClick={() => onDisconnect(platform)}
          >
            ตัดการเชื่อมต่อ
          </Button>
        ) : (
          <Button
            variant="gradient"
            className="w-full"
            icon={<Link2 className="h-4 w-4" />}
            onClick={() => onConnect(platform)}
          >
            เชื่อมต่อ
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatusPill({ connected }: { connected: boolean }): ReactNode {
  return connected ? (
    <Badge color="emerald" icon={<CheckCircle2 className="h-3 w-3" />}>
      เชื่อมต่อแล้ว
    </Badge>
  ) : (
    <Badge color="slate" icon={<Circle className="h-3 w-3" />}>
      ยังไม่เชื่อมต่อ
    </Badge>
  );
}
