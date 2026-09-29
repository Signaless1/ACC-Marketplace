import { ReactNode } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({
    children,
}: AppLayoutProps) {
    return (
        <div className="dashboard-page">
            <div className="dashboard-shell">
                <Sidebar />

                <div className="dashboard-main">
                    <Header />

                    <main className="dashboard-content">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}