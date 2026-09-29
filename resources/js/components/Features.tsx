const features = [
    {
        title: 'Post in minutes',
        text: 'List an item or service with photos, a price, and a category — no unmoderated group posts to dig through.',
    },
    {
        title: 'Search & filter',
        text: 'Find what you need fast by keyword, category, or price range across every active listing.',
    },
    {
        title: 'Message sellers directly',
        text: 'Ask questions and agree on a time to meet, all inside the app — no need to trade numbers first.',
    },
    {
        title: 'Ratings you can trust',
        text: "Every completed exchange gets a rating, so a seller's history is visible before you buy.",
    },
    {
        title: 'Report a bad actor',
        text: 'Flag a listing or seller and admins review it — with the power to warn, restrict, or suspend an account.',
    },
    {
        title: 'ACC students only',
        text: 'The marketplace is exclusive to Abuyog Community College — not a public listing site.',
    },
];

export default function Features() {
    return (
        <section className="features" id="features">
            <div className="section-inner">
                <h2>Everything you need to trade on campus</h2>

                <p className="section-sub">
                    Built around how students actually buy and sell —
                    organized, searchable, and accountable.
                </p>

                <div className="feature-grid">
                    {features.map((feature) => (
                        <div className="feature-card" key={feature.title}>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}