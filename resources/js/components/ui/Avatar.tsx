interface AvatarProps {
    name: string;
    url?: string | null;
    size?: number;
}

// Calm, on-brand initials colours (all pass contrast with their text).
const palettes = [
    'bg-pine-800 text-white',
    'bg-sun-400 text-pine-950',
    'bg-mist-200 text-pine-800',
    'bg-pine-600 text-white',
    'bg-sun-300 text-pine-950',
];

export default function Avatar({ name, url, size = 40 }: AvatarProps) {
    const style = { width: size, height: size, fontSize: Math.max(11, size * 0.4) };

    if (url) {
        return (
            <img
                src={url}
                alt={name}
                style={style}
                className="shrink-0 rounded-full object-cover"
            />
        );
    }

    const hash = Array.from(name).reduce((n, ch) => n + ch.charCodeAt(0), 0);

    return (
        <span
            style={style}
            aria-hidden="true"
            className={`flex shrink-0 select-none items-center justify-center rounded-full font-display font-extrabold ${palettes[hash % palettes.length]}`}
        >
            {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
    );
}
