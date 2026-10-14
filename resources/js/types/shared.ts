export interface SharedUser {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role: 'user' | 'admin';
    avatar_url: string | null;
    bio: string | null;
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
    flash: {
        success: string | null;
        error: string | null;
        suspended: { name: string } | null;
    };
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
