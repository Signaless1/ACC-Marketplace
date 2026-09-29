export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <span className="logo-mark logo-mark-light">A</span>
                    ACC Marketplace
                </div>

                <p className="footer-note">
                    Exclusive to Abuyog Community College students. Not a
                    public marketplace.
                </p>

                <p className="footer-copy">
                    &copy; {year} ACC Marketplace, College of Information
                    Technology.
                </p>
            </div>
        </footer>
    );
}