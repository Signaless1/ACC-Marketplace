import '../css/app.css';
import '../css/dashboard.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'ACC Marketplace';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),

    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },

    progress: {
        color: '#176B4D',
    },
});