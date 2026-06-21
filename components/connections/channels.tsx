'use client';

// components/connections/channels.tsx — channel metadata + brand icon rendering.

import { PlaySquare, Music2, ShoppingBag } from 'lucide-react';
import { PlatformIcon } from '@/components/ui';
import type { ChannelId } from '@/lib/connections';

export type ChannelMeta = {
  id: ChannelId;
  name: string;
  tagline: string;
  benefits: string[];
  /** Tailwind gradient classes for the wizard header / accents. */
  gradient: string;
  /** Soft icon background. */
  iconBg: string;
};

export const CHANNELS: ChannelMeta[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    tagline: 'โพสต์ขึ้นเพจอัตโนมัติ',
    benefits: ['โพสต์ตามเวลาที่ตั้งไว้', 'รองรับรูปภาพ + แคปชั่น + แฮชแท็ก'],
    gradient: 'from-blue-600 to-blue-500',
    iconBg: 'bg-blue-50',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    tagline: 'ฟีด + คารูเซลอัตโนมัติ',
    benefits: ['เผยแพร่ฟีด/คารูเซลตามแผน', 'จัดคิวช่วงเวลาคนไทยออนไลน์สูง'],
    gradient: 'from-fuchsia-600 to-pink-500',
    iconBg: 'bg-pink-50',
  },
  {
    id: 'line',
    name: 'LINE OA',
    tagline: 'บรอดแคสต์ถึงผู้ติดตาม',
    benefits: ['ส่งบรอดแคสต์ได้ทันที', 'จัดการทุกช่องทางจากที่เดียว'],
    gradient: 'from-green-600 to-emerald-500',
    iconBg: 'bg-emerald-50',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    tagline: 'อัปคลิปสั้นขายของ',
    benefits: ['อัปโหลดคลิปที่สร้างจาก “สร้างคลิปขายของ”', 'ใส่แคปชั่น + แฮชแท็กเทรนด์อัตโนมัติ'],
    gradient: 'from-slate-900 to-slate-700',
    iconBg: 'bg-slate-100',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    tagline: 'Shorts + วิดีโอยาว',
    benefits: ['อัปโหลด Shorts/วิดีโอตามตาราง', 'ตั้งชื่อ + คำอธิบาย + แท็กให้อัตโนมัติ'],
    gradient: 'from-red-600 to-rose-500',
    iconBg: 'bg-red-50',
  },
  {
    id: 'shopee',
    name: 'Shopee',
    tagline: 'โพสต์ร้าน + ป้ายยาสินค้า',
    benefits: ['ลิงก์สินค้าในคลิป/โพสต์', 'ซิงก์โปรโมชัน + คอนเทนต์ขายของ'],
    gradient: 'from-orange-600 to-amber-500',
    iconBg: 'bg-orange-50',
  },
];

export function getChannel(id: ChannelId): ChannelMeta {
  return CHANNELS.find((c) => c.id === id) ?? CHANNELS[0];
}

/** Brand icon for a channel — PlatformIcon for the original 3, lucide for the rest. */
export function ChannelIcon({ id, size = 30 }: { id: ChannelId; size?: number }) {
  if (id === 'facebook' || id === 'instagram' || id === 'line') {
    return <PlatformIcon platform={id} size={size} />;
  }
  const style = { width: size, height: size };
  if (id === 'youtube') return <PlaySquare style={style} className="text-red-600" />;
  if (id === 'tiktok') return <Music2 style={style} className="text-slate-900" />;
  return <ShoppingBag style={style} className="text-orange-500" />; // shopee
}
