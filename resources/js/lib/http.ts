/**
 * Small fetch helpers for background (non-navigation) requests such as
 * message polling. They use the XSRF cookie Laravel already sets, so no
 * extra setup is needed, and they never trigger an Inertia page visit.
 */

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        signal,
    });

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }

    return response.json() as Promise<T>;
}

export class ValidationError extends Error {
    errors: Record<string, string>;

    constructor(errors: Record<string, string>) {
        super(Object.values(errors)[0] ?? 'Please check your input.');
        this.errors = errors;
    }
}

/** POST a FormData body and return the JSON reply. */
export async function postForm<T>(url: string, body: FormData): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        credentials: 'same-origin',
    });

    if (response.status === 422) {
        const data = await response.json();
        const flat: Record<string, string> = {};

        for (const [key, value] of Object.entries(
            (data.errors ?? {}) as Record<string, string[]>,
        )) {
            flat[key] = value[0];
        }

        throw new ValidationError(flat);
    }

    if (response.status === 413) {
        throw new Error('That file is too large to upload.');
    }

    if (!response.ok) {
        throw new Error(`Something went wrong (${response.status}). Please try again.`);
    }

    return response.json() as Promise<T>;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
