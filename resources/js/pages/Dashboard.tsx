import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bell,
    BookOpen,
    BriefcaseBusiness,
    ChevronRight,
    CircleCheck,
    MessageCircle,
    Package,
    Plus,
    Search,
    ShoppingBag,
    Sparkles,
    Store,
    Tag,
    Users,
} from 'lucide-react';

import AppLayout from '../layouts/AppLayout';

interface AuthUser {
    id: number;
    name: string;
    email: string;
}

interface PageProps {
    auth: {
        user: AuthUser | null;
    };
}

export default function Dashboard() {
    const { auth } = usePage<PageProps>().props;

    const firstName = auth.user?.name?.split(' ')[0] || 'there';

    return (
        <AppLayout>
            <div className="dashboard-page">
                {/* Welcome */}
                <section className="dashboard-welcome">
                    <div>
                        <p className="dashboard-kicker">
                            <Sparkles size={15} />
                            ACC MARKETPLACE
                        </p>

                        <h1>
                            Welcome back, <span>{firstName}.</span>
                        </h1>

                        <p className="dashboard-intro">
                            Your campus marketplace is ready. Discover useful
                            things, sell what you no longer need, and connect
                            with people around ACC.
                        </p>
                    </div>

                    <div className="dashboard-welcome-badge">
                        <CircleCheck size={17} />
                        <span>Campus marketplace</span>
                    </div>
                </section>

                {/* Main Hero */}
                <section className="dashboard-hero">
                    <div className="dashboard-hero-content">
                        <div className="hero-label">
                            <Store size={15} />
                            Built for ACC students
                        </div>

                        <h2>
                            Your campus.
                            <br />
                            <em>Your marketplace.</em>
                        </h2>

                        <p>
                            Find items and services around campus without
                            digging through random social media posts.
                        </p>

                        <div className="dashboard-hero-actions">
                            <Link
                                href="/marketplace"
                                className="dashboard-primary-button"
                            >
                                <Search size={18} />
                                Browse Marketplace
                                <ArrowRight size={17} />
                            </Link>

                            <Link
                                href="/listings/create"
                                className="dashboard-secondary-button"
                            >
                                <Plus size={18} />
                                Sell Something
                            </Link>
                        </div>
                    </div>

                    <div className="dashboard-campus-image">
                        <img
                            src="/images/acc_campus.png"
                            alt="Abuyog Community College campus"
                        />

                        <div className="campus-image-caption">
                            <span className="campus-dot" />
                            Abuyog Community College
                        </div>
                    </div>
                </section>

                {/* Quick Actions */}
                <section className="dashboard-section">
                    <div className="dashboard-section-heading">
                        <div>
                            <p className="section-eyebrow">QUICK ACCESS</p>
                            <h2>What would you like to do?</h2>
                        </div>

                        <p>
                            Jump straight into the things you use most.
                        </p>
                    </div>

                    <div className="dashboard-action-grid">
                        <Link
                            href="/marketplace"
                            className="dashboard-action-card action-green"
                        >
                            <div className="action-icon">
                                <Search size={22} />
                            </div>

                            <div className="action-card-content">
                                <h3>Browse Marketplace</h3>
                                <p>
                                    Find items and services available around
                                    campus.
                                </p>
                            </div>

                            <ChevronRight className="action-arrow" size={20} />
                        </Link>

                        <Link
                            href="/listings/create"
                            className="dashboard-action-card action-gold"
                        >
                            <div className="action-icon">
                                <Tag size={22} />
                            </div>

                            <div className="action-card-content">
                                <h3>Create a Listing</h3>
                                <p>
                                    Put an item or service up for sale.
                                </p>
                            </div>

                            <ChevronRight className="action-arrow" size={20} />
                        </Link>

                        <Link
                            href="/messages"
                            className="dashboard-action-card action-blue"
                        >
                            <div className="action-icon">
                                <MessageCircle size={22} />
                            </div>

                            <div className="action-card-content">
                                <h3>Messages</h3>
                                <p>
                                    Connect with buyers and sellers.
                                </p>
                            </div>

                            <ChevronRight className="action-arrow" size={20} />
                        </Link>

                        <Link
                            href="/listings"
                            className="dashboard-action-card action-purple"
                        >
                            <div className="action-icon">
                                <ShoppingBag size={22} />
                            </div>

                            <div className="action-card-content">
                                <h3>My Listings</h3>
                                <p>
                                    Manage the things you have posted.
                                </p>
                            </div>

                            <ChevronRight className="action-arrow" size={20} />
                        </Link>
                    </div>
                </section>

                {/* Getting Started */}
                <section className="dashboard-lower-grid">
                    <div className="getting-started-card">
                        <div className="card-heading-row">
                            <div>
                                <p className="section-eyebrow">
                                    GETTING STARTED
                                </p>
                                <h2>Make the most of ACC Marketplace</h2>
                            </div>

                            <div className="heading-icon">
                                <Sparkles size={20} />
                            </div>
                        </div>

                        <div className="getting-started-list">
                            <div className="getting-started-item">
                                <div className="step-number">01</div>

                                <div>
                                    <h3>Explore the marketplace</h3>
                                    <p>
                                        Browse what students are selling or
                                        offering around campus.
                                    </p>
                                </div>

                                <ArrowRight size={18} />
                            </div>

                            <div className="getting-started-item">
                                <div className="step-number">02</div>

                                <div>
                                    <h3>List something useful</h3>
                                    <p>
                                        Have something to sell? Create a
                                        listing and let others discover it.
                                    </p>
                                </div>

                                <ArrowRight size={18} />
                            </div>

                            <div className="getting-started-item">
                                <div className="step-number">03</div>

                                <div>
                                    <h3>Connect on campus</h3>
                                    <p>
                                        Message buyers and sellers to arrange
                                        your exchange.
                                    </p>
                                </div>

                                <ArrowRight size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-side-card">
                        <div className="side-card-icon">
                            <Users size={22} />
                        </div>

                        <p className="section-eyebrow">MADE FOR CAMPUS</p>

                        <h2>
                            Buy locally.
                            <br />
                            <span>Sell confidently.</span>
                        </h2>

                        <p>
                            ACC Marketplace keeps buying and selling simple,
                            familiar, and centered around campus.
                        </p>

                        <div className="side-card-features">
                            <div>
                                <CircleCheck size={16} />
                                <span>Campus-focused</span>
                            </div>

                            <div>
                                <CircleCheck size={16} />
                                <span>Simple listings</span>
                            </div>

                            <div>
                                <CircleCheck size={16} />
                                <span>Direct messaging</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Small Promotional Banner */}
                <section className="dashboard-banner">
                    <img
                        src="/images/marketplace-banner.png"
                        alt="ACC Marketplace"
                    />

                    <div className="dashboard-banner-overlay">
                        <div>
                            <p>ACC MARKETPLACE</p>
                            <h2>Support local. Support ACC.</h2>
                        </div>

                        <Link
                            href="/marketplace"
                            className="banner-button"
                        >
                            Explore
                            <ArrowRight size={17} />
                        </Link>
                    </div>
                </section>

                {/* Bottom Info */}
                <section className="dashboard-info-grid">
                    <div className="info-card">
                        <div className="info-card-icon info-green">
                            <Package size={21} />
                        </div>

                        <div>
                            <h3>Items & services</h3>
                            <p>
                                Discover things students are offering around
                                campus.
                            </p>
                        </div>
                    </div>

                    <div className="info-card">
                        <div className="info-card-icon info-blue">
                            <MessageCircle size={21} />
                        </div>

                        <div>
                            <h3>Stay connected</h3>
                            <p>
                                Talk directly with buyers and sellers when
                                you're ready.
                            </p>
                        </div>
                    </div>

                    <div className="info-card">
                        <div className="info-card-icon info-gold">
                            <BriefcaseBusiness size={21} />
                        </div>

                        <div>
                            <h3>More than selling</h3>
                            <p>
                                Services and useful skills can have a place
                                here too.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}