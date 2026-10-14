interface Point {
    label: string;
    value: number;
}

interface BarChartProps {
    data: Point[];
    height?: number;
    format?: (value: number) => string;
    barClass?: string;
    summary: string;
}

/** Dependency-free bar chart. */
export function BarChart({ data, height = 140, format = String, barClass = 'fill-pine-700', summary }: BarChartProps) {
    const max = Math.max(1, ...data.map((d) => d.value));
    const width = 100;
    const gap = 3;
    const barWidth = (width - gap * (data.length - 1)) / data.length;

    return (
        <div>
            <svg
                viewBox={`0 0 ${width} ${height / 2}`}
                preserveAspectRatio="none"
                className="w-full"
                style={{ height }}
                role="img"
                aria-label={summary}
            >
                {data.map((d, i) => {
                    const h = (d.value / max) * (height / 2 - 4);

                    return (
                        <g key={d.label + i}>
                            <title>{`${d.label}: ${format(d.value)}`}</title>
                            <rect
                                x={i * (barWidth + gap)}
                                y={height / 2 - Math.max(h, d.value > 0 ? 1 : 0.6)}
                                width={barWidth}
                                height={Math.max(h, d.value > 0 ? 1 : 0.6)}
                                rx={1.2}
                                className={d.value > 0 ? barClass : 'fill-mist-200'}
                            />
                        </g>
                    );
                })}
            </svg>
            <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-3">
                {data.map((d, i) => (
                    <span key={d.label + i} className="flex-1 text-center">
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

interface SparklineProps {
    data: Point[];
    stroke?: string;
    fill?: string;
    summary: string;
}

/** Tiny area chart for trends. */
export function Sparkline({ data, stroke = '#166846', fill = 'rgba(22,104,70,0.14)', summary }: SparklineProps) {
    const max = Math.max(1, ...data.map((d) => d.value));
    const w = 120;
    const h = 36;
    const step = w / Math.max(1, data.length - 1);
    const points = data.map((d, i) => `${i * step},${h - 3 - (d.value / max) * (h - 8)}`);
    const area = `M0,${h} L${points.join(' L')} L${w},${h} Z`;

    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            className="h-10 w-full"
            role="img"
            aria-label={summary}
        >
            <path d={area} fill={fill} />
            <polyline
                points={points.join(' ')}
                fill="none"
                stroke={stroke}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
