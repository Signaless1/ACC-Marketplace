import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Safety from '../components/Safety';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

import type { User } from '../types/auth';

interface HomeProps {
    user: User | null;
    onLogin: () => void;
    onRegister: () => void;
    onLogout: () => void;
}

export default function Home({
    user,
    onLogin,
    onRegister,
    onLogout,
}: HomeProps) {
    return (
        <>
            <Navbar
                user={user}
                onLogin={onLogin}
                onRegister={onRegister}
                onLogout={onLogout}
            />

            <main>
                <Hero />
                <Stats />
                <Features />
                <HowItWorks />
                <Safety />
                <CTA />
            </main>

            <Footer />
        </>
    );
}