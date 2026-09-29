const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');

export async function apiFetch(
    url: string,
    options: RequestInit = {},
) {
    const headers = new Headers(options.headers);

    headers.set('Accept', 'application/json');

    if (options.body) {
        headers.set('Content-Type', 'application/json');
    }

    if (csrfToken) {
        headers.set('X-CSRF-TOKEN', csrfToken);
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
    });
}