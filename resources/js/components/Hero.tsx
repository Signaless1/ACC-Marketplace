export default function Hero() {
    return (
        <section className="hero">
            <div className="hero-inner">
                <div className="hero-copy">
                    <p className="eyebrow-tag">
                        Abuyog Community College
                    </p>

                    <h1>
                        Buy, sell, and trade <em>right here</em> on campus.
                    </h1>

                    <p className="hero-sub">
                        A simple, trusted marketplace built just for ACC
                        students. Post a listing, message a buyer, and meet
                        on campus to close the deal — no unmoderated social
                        media groups required.
                    </p>

                    <div className="hero-actions">
                        <a href="#" className="btn btn-lime">
                            Browse listings
                        </a>

                        <a href="#how-it-works" className="btn btn-outline">
                            See how it works
                        </a>
                    </div>
                </div>

                <div className="hero-media">
                    <div className="hero-media-shape"></div>

                    <img
                        src="/images/acc_campus.png"
                        alt="ACC Campus"
                        className="hero-image"
                    />

                    <div className="floating-chip chip-verify">
                        ✓ Verified ACC students only
                    </div>

                    <div className="floating-chip chip-meet">
                        🤝 Meet & verify on campus
                    </div>
                </div>
            </div>
        </section>
    );
}