export interface SharedUser {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin';
    avatar_url: string | null;
    bio: string | null;
}

export interface SharedProps {
    auth: { user: SharedUser | null };
    unreadMessageCount: number;
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

export const formatPrice = (price: string | number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(Number(price));

export const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

export interface AttachmentData {
    id: number;
    kind: 'image' | 'video' | 'file';
    original_name: string;
    mime: string | null;
    size: number;
    url: string;
}

/** Fields the marketplace adds to every listing card. */
export interface RatingFields {
    rating_average?: string | number | null;
    rating_count?: number;
}

export const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

export const timeAgo = (date: string) => {
    const seconds = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 1000));

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`;

    return formatDate(date);
};
