/**
 * Small fetch wrapper for the background (JSON) endpoints: message
 * polling, sending messages with attachments, and so on.
 *
 * Laravel puts the CSRF token in the XSRF-TOKEN cookie; echoing it back
 * in the X-XSRF-TOKEN header is how it accepts non-form requests. The
 * cookie is read on every call so a rotated token is always picked up.
 */
function xsrfToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch(
    url: string,
    options: RequestInit = {},
): Promise<Response> {
    const headers = new Headers(options.headers);

    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');

    // Let the browser set the multipart boundary for FormData; JSON otherwise.
    if (options.body && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const token = xsrfToken();

    if (token) {
        headers.set('X-XSRF-TOKEN', token);
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
    });
}

export async function apiJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await apiFetch(url, options);

    if (!response.ok) {
        const error = new Error(`Request failed (${response.status})`) as Error & {
            status: number;
            body?: unknown;
        };

        error.status = response.status;
        error.body = await response.json().catch(() => undefined);

        throw error;
    }

    return (await response.json()) as T;
}
