import { Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ReactNode } from 'react';
import SiteImage from '../components/ui/SiteImage';
import Toast from '../components/ui/Toast';
import { logo, siteImages } from '../config/siteImages';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    asideTitle: string;
    asidePoints: string[];
    children: ReactNode;
}

export default function AuthLayout({
    title,
    subtitle,
    asideTitle,
    asidePoints,
    children,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-screen bg-mist-50 font-body text-pine-950 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Toast />

            {/* Photo side (desktop only) */}
            <aside className="relative hidden overflow-hidden text-white lg:block">
                <SiteImage
                    name={siteImages.auth}
                    alt="Abuyog Community College campus"
                    className="absolute inset-0"
                    imageClassName="object-[62%_50%]"
                    eager
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pine-950 via-pine-950/70 to-pine-900/25" />

                <div className="relative flex h-full flex-col justify-between p-12">
                    <Link
                        href="/"
                        className="flex w-fit items-center gap-3 rounded-full bg-white/95 py-1.5 pl-1.5 pr-5 text-pine-900 shadow-lg"
                    >
                        <img
                            src={`/images/${logo}`}
                            alt=""
                            className="h-10 w-10 rounded-full"
                        />
                        <span className="font-display text-lg font-bold">
                            ACC Marketplace
                        </span>
                    </Link>

                    <div className="max-w-md">
                        <h2 className="font-display text-4xl font-extrabold leading-[1.1] text-white">
                            {asideTitle}
                        </h2>

                        <ul className="mt-6 space-y-3">
                            {asidePoints.map((point) => (
                                <li
                                    key={point}
                                    className="flex items-start gap-3 text-[15px] leading-snug text-white/90"
                                >
                                    <CheckCircle2
                                        size={20}
                                        className="mt-0.5 shrink-0 text-sun-400"
                                    />
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </aside>

            {/* Form side */}
            <main className="flex flex-col px-5 py-6 sm:px-10">
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 lg:hidden"
                    >
                        <img
                            src={`/images/${logo}`}
                            alt=""
                            className="h-10 w-10 rounded-full"
                        />
                        <span className="font-display text-lg font-bold text-pine-900">
                            ACC Marketplace
                        </span>
                    </Link>

                    <Link
                        href="/"
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-pine-900/70 transition hover:bg-mist-100 hover:text-pine-900"
                    >
                        <ArrowLeft size={16} />
                        Back to home
                    </Link>
                </div>

                <div className="flex flex-1 items-center justify-center py-8">
                    <div className="w-full max-w-[440px]">
                        <h1 className="font-display text-[2rem] font-extrabold leading-tight text-pine-950">
                            {title}
                        </h1>
                        <p className="mt-2 text-[15px] leading-relaxed text-pine-900/70">
                            {subtitle}
                        </p>

                        <div className="mt-8">{children}</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
