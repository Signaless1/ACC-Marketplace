interface AvatarProps {
    name: string;
    url?: string | null;
    size?: number;
}

export default function Avatar({ name, url, size = 40 }: AvatarProps) {
    const style = { width: size, height: size, fontSize: size * 0.4 };

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

    return (
        <span
            style={style}
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center rounded-full bg-[#EAF4EF] font-bold text-[#176B4D]"
        >
            {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
    );
}
