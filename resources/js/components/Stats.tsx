const stats = [
    {
        value: '340+',
        label: 'ACC students on the marketplace',
    },
    {
        value: '120+',
        label: 'active listings this semester',
    },
    {
        value: '100%',
        label: 'meetups happen on campus',
    },
];

export default function Stats() {
    return (
        <section className="stats">
            <div className="stats-inner">
                {stats.map((stat) => (
                    <div className="stat" key={stat.label}>
                        <p className="stat-value">{stat.value}</p>
                        <p className="stat-label">{stat.label}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}