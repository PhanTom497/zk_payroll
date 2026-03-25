export const ANALYTICS_STORAGE_KEY = 'zkp_admin_analytics_v1';

export type AnalyticsCurrency = 'credits' | 'usdcx' | 'usad';
export type AnalyticsActionType = 'issue_salary' | 'issue_vested_salary' | 'claim_salary' | 'batch_issue';
export type AnalyticsTimePreset = 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'all_time';

export interface AdminAnalyticsEvent {
  id: string;
  txId: string;
  timestamp: number; // ms epoch
  payrollId: string;
  recipient: string;
  currency: AnalyticsCurrency;
  amountMicro: number;
  actionType: AnalyticsActionType;
}

interface TimeRange {
  start: number;
  end: number;
}

interface SeriesPoint {
  key: string;
  label: string;
  totalMicro: number;
}

interface TokenBreakdownPoint {
  currency: AnalyticsCurrency;
  label: string;
  totalMicro: number;
  percentage: number;
}

function isAnalyticsEvent(value: unknown): value is AdminAnalyticsEvent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.txId === 'string' &&
    typeof v.timestamp === 'number' &&
    typeof v.payrollId === 'string' &&
    typeof v.recipient === 'string' &&
    (v.currency === 'credits' || v.currency === 'usdcx' || v.currency === 'usad') &&
    typeof v.amountMicro === 'number' &&
    Number.isFinite(v.amountMicro) &&
    (v.actionType === 'issue_salary' ||
      v.actionType === 'issue_vested_salary' ||
      v.actionType === 'claim_salary' ||
      v.actionType === 'batch_issue')
  );
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readRawEvents(): AdminAnalyticsEvent[] {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(ANALYTICS_STORAGE_KEY);
      console.warn('[analytics] Corrupt payload reset: expected array');
      return [];
    }

    const valid = parsed.filter(isAnalyticsEvent);
    if (valid.length !== parsed.length) {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(valid));
      console.warn('[analytics] Sanitized malformed analytics rows');
    }

    return valid.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    console.warn('[analytics] Corrupt JSON reset', error);
    return [];
  }
}

function writeRawEvents(events: AdminAnalyticsEvent[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events));
}

export function readAnalyticsEvents(): AdminAnalyticsEvent[] {
  return readRawEvents();
}

export function appendAnalyticsEvent(
  payload: Omit<AdminAnalyticsEvent, 'id'> & { id?: string }
): AdminAnalyticsEvent[] {
  try {
    const existing = readRawEvents();

    const duplicate = existing.find(
      (e) =>
        e.txId === payload.txId &&
        e.actionType === payload.actionType &&
        e.recipient === payload.recipient &&
        e.currency === payload.currency &&
        e.amountMicro === payload.amountMicro
    );

    if (duplicate) return existing;

    const next: AdminAnalyticsEvent = {
      id: payload.id || makeId(),
      ...payload,
      amountMicro: Math.max(0, Math.floor(payload.amountMicro)),
      timestamp: Math.floor(payload.timestamp),
    };

    const merged = [...existing, next].sort((a, b) => a.timestamp - b.timestamp);
    writeRawEvents(merged);
    return merged;
  } catch (error) {
    console.warn('[analytics] Failed to append event', error);
    return readRawEvents();
  }
}

export function microToCredits(amountMicro: number): number {
  return amountMicro / 1_000_000;
}

function startOfDay(d: Date): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

function endOfDay(d: Date): Date {
  const t = new Date(d);
  t.setHours(23, 59, 59, 999);
  return t;
}

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dt);
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(dt);
}

export function getTimeRange(preset: AnalyticsTimePreset, now = new Date()): TimeRange {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (preset) {
    case 'today':
      return { start: todayStart.getTime(), end: todayEnd.getTime() };
    case 'last_7_days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start: start.getTime(), end: todayEnd.getTime() };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: start.getTime(), end: todayEnd.getTime() };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    }
    case 'all_time':
    default:
      return { start: 0, end: Number.MAX_SAFE_INTEGER };
  }
}

export function filterEventsByPreset(
  events: AdminAnalyticsEvent[],
  preset: AnalyticsTimePreset
): AdminAnalyticsEvent[] {
  const range = getTimeRange(preset);
  return events.filter((e) => e.timestamp >= range.start && e.timestamp <= range.end);
}

export function buildPayoutSeries(
  filteredEvents: AdminAnalyticsEvent[],
  preset: AnalyticsTimePreset
): SeriesPoint[] {
  if (preset === 'all_time') {
    const monthMap = new Map<string, number>();

    for (const ev of filteredEvents) {
      const key = toMonthKey(new Date(ev.timestamp));
      monthMap.set(key, (monthMap.get(key) || 0) + ev.amountMicro);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, totalMicro]) => ({ key, label: formatMonthLabel(key), totalMicro }));
  }

  const { start, end } = getTimeRange(preset);
  const dayMap = new Map<string, number>();

  const cursor = new Date(start);
  const endDate = new Date(end);

  while (cursor <= endDate) {
    const key = toDayKey(cursor);
    dayMap.set(key, 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const ev of filteredEvents) {
    const key = toDayKey(new Date(ev.timestamp));
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) || 0) + ev.amountMicro);
    }
  }

  return Array.from(dayMap.entries()).map(([key, totalMicro]) => ({
    key,
    label: formatDayLabel(key),
    totalMicro,
  }));
}

export function buildTokenBreakdown(filteredEvents: AdminAnalyticsEvent[]): TokenBreakdownPoint[] {
  const sums: Record<AnalyticsCurrency, number> = {
    credits: 0,
    usdcx: 0,
    usad: 0,
  };

  for (const ev of filteredEvents) {
    sums[ev.currency] += ev.amountMicro;
  }

  const grandTotal = sums.credits + sums.usdcx + sums.usad;

  const base: Array<{ currency: AnalyticsCurrency; label: string }> = [
    { currency: 'credits', label: 'ALEO' },
    { currency: 'usdcx', label: 'USDCx' },
    { currency: 'usad', label: 'USAD' },
  ];

  return base.map(({ currency, label }) => {
    const totalMicro = sums[currency];
    const percentage = grandTotal > 0 ? (totalMicro / grandTotal) * 100 : 0;
    return { currency, label, totalMicro, percentage };
  });
}

export function getLatestPayoutTimestamp(events: AdminAnalyticsEvent[]): number | null {
  if (!events.length) return null;
  return Math.max(...events.map((e) => e.timestamp));
}

export function getUniqueRecipientCount(events: AdminAnalyticsEvent[]): number {
  return new Set(events.map((e) => e.recipient)).size;
}

export function getTotalPayoutMicro(events: AdminAnalyticsEvent[]): number {
  return events.reduce((sum, e) => sum + e.amountMicro, 0);
}
