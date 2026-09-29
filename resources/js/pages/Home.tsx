import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Safety from '../components/Safety';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

interface User {
    id: number;
    name: string;
    email: string;
}

interface HomeProps {
    auth: {
        user: User | null;
    };
}

export default function Home({ auth }: HomeProps) {
    return (
        <>
            <Navbar user={auth.user} />

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