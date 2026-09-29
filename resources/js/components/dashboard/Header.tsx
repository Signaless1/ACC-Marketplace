import { Bell, ChevronDown, Search } from 'lucide-react';

export default function Header() {
    return (
        <header className="dashboard-header">
            <div className="dashboard-header-left">
                <img
                    src="/images/logo.png"
                    alt="Abuyog Community College"
                    className="dashboard-header-logo"
                />

                <div className="dashboard-header-divider" />

                <div>
                    <div className="dashboard-brand-title">
                        ACC Marketplace
                    </div>

                    <div className="dashboard-brand-subtitle">
                        BUY • SELL • CONNECT
                    </div>
                </div>
            </div>

            <div className="dashboard-search">
                <Search size={17} strokeWidth={1.8} />

                <input
                    type="search"
                    placeholder="Search products, name, or category..."
                />
            </div>

            <div className="dashboard-header-actions">
                <button
                    type="button"
                    className="dashboard-icon-button"
                    aria-label="Notifications"
                >
                    <Bell size={18} strokeWidth={1.8} />

                    <span className="dashboard-notification-dot" />
                </button>

                <button
                    type="button"
                    className="dashboard-icon-button"
                    aria-label="Profile"
                >
                    <span
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background:
                                'linear-gradient(135deg, #176B4D, #063B2A)',
                        }}
                    />
                </button>

                <ChevronDown
                    size={15}
                    strokeWidth={1.8}
                    color="#52665d"
                />
            </div>
        </header>
    );
}