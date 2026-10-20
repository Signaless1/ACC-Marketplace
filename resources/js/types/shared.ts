export interface SharedUser {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin';
    avatar_url: string | null;
    bio: string | null;
    /** The owner's own number (+639XXXXXXXXX), or null for accounts that predate phone numbers. */
    phone: string | null;
}

export interface LatestMessage {
    id: number;
    conversation_id: number;
    sender: string | null;
    listing: string | null;
    preview: string;
}

export interface SharedProps {
    auth: { user: SharedUser | null };
    unreadMessageCount: number;
    latestMessage: LatestMessage | null;
    pendingOrderCount: number;
    pendingReportCount: number;
    flash: { success: string | null; error: string | null };
    [key: string]: unknown;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface Attachment {
    id: number;
    url: string;
    original_name: string;
    mime: string;
    size: number;
    human_size: string;
    kind: 'image' | 'video' | 'file';
}

/** 1536 -> "1.5 KB". Used by the file pickers and galleries. */
export const formatBytes = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / 1024 ** i;

    return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

export const formatPrice = (price: string | number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(Number(price));

/** ₱1.2K / ₱3.4M style, for dashboard tiles where space is tight. */
export const formatCompactPrice = (value: number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        notation: value >= 100000 ? 'compact' : 'standard',
        maximumFractionDigits: value >= 100000 ? 1 : 0,
    }).format(value);

export const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

export const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. */
export function timeAgo(date: string | null | undefined): string {
    if (!date) return '';

    const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);

    if (seconds < 45) return 'just now';
    if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
    if (seconds < 86400 * 7) return `${Math.round(seconds / 86400)} d ago`;

    return formatDate(date);
}
