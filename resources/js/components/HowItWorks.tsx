const steps = [
    {
        title: 'List your item',
        text: 'Add photos, set a price, and choose a category — available, reserved, or sold.',
    },
    {
        title: 'Chat & agree',
        text: 'Message the buyer or seller in-app to settle on a price and a place to meet on campus.',
    },
    {
        title: 'Meet & verify',
        text: 'Meet in person at ACC so the buyer can inspect the item before paying — every time.',
    },
    {
        title: 'Rate the exchange',
        text: 'Leave a rating so the next student knows what to expect.',
    },
];

export default function HowItWorks() {
    return (
        <section className="how-it-works" id="how-it-works">
            <div className="section-inner">
                <h2>How it works</h2>

                <p className="section-sub">
                    Four steps, always ending with a face-to-face meetup on
                    campus.
                </p>

                <div className="steps">
                    {steps.map((step, index) => (
                        <div className="step" key={step.title}>
                            <span className="step-number">
                                {index + 1}
                            </span>

                            <h3>{step.title}</h3>
                            <p>{step.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}