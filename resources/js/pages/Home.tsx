import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Flag,
    MessageCircle,
    ShieldCheck,
    ShoppingBag,
    Star,
    Tag,
    Users,
} from 'lucide-react';
import SiteImage from '../components/ui/SiteImage';
import { logo, siteImages } from '../config/siteImages';
import type { SharedProps } from '../types/shared';

const gold =
    'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sun-400 px-6 font-display text-[15px] font-bold text-pine-950 shadow-sm transition hover:bg-sun-500';
const outlineOnLight =
    'inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-pine-900/25 px-6 font-display text-[15px] font-bold text-pine-900 transition hover:border-pine-900 hover:bg-white';

const categories = [
    {
        name: 'Electronics',
        note: 'Phones, laptops, calculators and accessories',
        image: siteImages.categories.electronics,
        className: 'col-span-2 row-span-2 min-h-[300px]',
    },
    {
        name: 'Clothing',
        note: 'Uniforms, shoes and bags',
        image: siteImages.categories.clothing,
        className: 'min-h-[150px]',
    },
    {
        name: 'School Supplies',
        note: 'Books, notebooks and tools',
        image: siteImages.categories.schoolSupplies,
        className: 'min-h-[150px]',
    },
    {
        name: 'Food & Drinks',
        note: 'Snacks and homemade treats',
        image: siteImages.categories.food,
        className: 'min-h-[150px]',
    },
    {
        name: 'Home & Living',
        note: 'Dorm and room essentials',
        image: siteImages.categories.home,
        className: 'min-h-[150px]',
    },
    {
        name: 'Services',
        note: 'Tutoring, printing, repairs and more',
        image: siteImages.categories.services,
        className: 'col-span-2 min-h-[150px]',
    },
];

const steps = [
    {
        title: 'List what you have',
        text: 'Add photos, a price and a short description. Choose whether it is an item or a service.',
    },
    {
        title: 'Chat and agree on a meet-up',
        text: 'Buyers message you inside the app. Pick a safe spot on campus and a time that works.',
    },
    {
        title: 'Hand over and get rated',
        text: 'Mark the order complete. The buyer leaves a review that appears on your profile.',
    },
];

const trust = [
    {
        icon: Star,
        title: 'Reviews you can rely on',
        text: 'Only buyers with a completed order can rate a seller.',
    },
    {
        icon: MessageCircle,
        title: 'Chat inside the app',
        text: 'Talk to buyers and sellers without sharing your phone number.',
    },
    {
        icon: Flag,
        title: 'Report in a few taps',
        text: 'Scams, spam and prohibited items go straight to the admins.',
    },
    {
        icon: ShieldCheck,
        title: 'Admins keep watch',
        text: 'Listings can be hidden and accounts suspended when rules are broken.',
    },
];

function Brand({ light = false }: { light?: boolean }) {
    return (
        <Link href="/" className="flex items-center gap-3">
            <img
                src={`/images/${logo}`}
                alt=""
                className="h-11 w-11 rounded-full bg-white"
            />
            <span
                className={`font-display text-xl font-extrabold ${
                    light ? 'text-white' : 'text-pine-900'
                }`}
            >
                ACC Marketplace
            </span>
        </Link>
    );
}

export default function Home() {
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user;

    return (
        <div className="site bg-white font-body text-pine-950">
            <Head title="Buy, sell and trade on campus">
                <meta
                    name="description"
                    content="ACC Marketplace is where Abuyog Community College students buy, sell and trade items and services on campus."
                />
            </Head>

            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
            >
                Skip to content
            </a>

            {/* Navigation */}
            <header className="sticky top-0 z-50 border-b border-pine-900/10 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
                    <Brand />

                    <nav
                        className="hidden items-center gap-8 text-[15px] font-medium text-pine-900/75 md:flex"
                        aria-label="Sections"
                    >
                        <a href="#how" className="transition hover:text-pine-700">
                            How it works
                        </a>
                        <a href="#categories" className="transition hover:text-pine-700">
                            Categories
                        </a>
                        <a href="#trust" className="transition hover:text-pine-700">
                            Safety
                        </a>
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="inline-flex h-10 items-center rounded-lg bg-pine-800 px-5 font-display text-sm font-bold text-white transition hover:bg-pine-900"
                            >
                                Go to dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="inline-flex h-10 items-center rounded-lg px-4 font-display text-sm font-bold text-pine-900 transition hover:bg-mist-100"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/register"
                                    className="inline-flex h-10 items-center rounded-lg bg-sun-400 px-4 font-display text-sm font-bold text-pine-950 transition hover:bg-sun-500 sm:px-5"
                                >
                                    Create account
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main id="main">
                {/* Hero */}
                <section className="relative overflow-hidden bg-mist-50">
                    <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-20">
                        <div>
                            <h1 className="site-rise font-display text-[2.75rem] font-extrabold leading-[1.02] text-pine-950 sm:text-6xl lg:text-[4.25rem]">
                                Buy, sell and trade right on campus.
                            </h1>

                            <p className="site-rise site-rise-2 mt-6 max-w-xl text-lg leading-relaxed text-pine-900/75">
                                Textbooks, uniforms, gadgets, snacks and
                                services, listed by Abuyog Community College
                                students and handed over between classes.
                            </p>

                            <div className="site-rise site-rise-3 mt-9 flex flex-wrap gap-3">
                                {user ? (
                                    <Link href="/marketplace" className={gold}>
                                        <ShoppingBag size={18} />
                                        Open the marketplace
                                    </Link>
                                ) : (
                                    <>
                                        <Link href="/register" className={gold}>
                                            Create free account
                                            <ArrowRight size={18} />
                                        </Link>
                                        <Link href="/marketplace" className={outlineOnLight}>
                                            Browse listings
                                        </Link>
                                    </>
                                )}
                            </div>

                            <ul className="site-rise site-rise-4 mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-pine-900/75">
                                <li className="flex items-center gap-2">
                                    <Tag size={17} className="text-sun-600" />
                                    Free to list
                                </li>
                                <li className="flex items-center gap-2">
                                    <Users size={17} className="text-sun-600" />
                                    Only ACC students
                                </li>
                                <li className="flex items-center gap-2">
                                    <Star size={17} className="text-sun-600" />
                                    Rated sellers
                                </li>
                            </ul>
                        </div>

                        {/* Arch photo */}
                        <div className="site-rise site-rise-2 relative mx-auto w-full max-w-[420px] pb-8 lg:mx-0 lg:ml-auto">
                            <div
                                aria-hidden="true"
                                className="absolute -right-10 top-10 h-72 w-72 rounded-full bg-sun-300/60 sm:h-96 sm:w-96"
                            />

                            <SiteImage
                                name={siteImages.hero}
                                alt="Abuyog Community College campus"
                                eager
                                className="aspect-[4/5] rounded-t-[999px] rounded-b-[2rem] shadow-2xl shadow-pine-950/25"
                                imageClassName="object-[66%_45%]"
                            />

                            <div className="absolute -left-3 bottom-0 rounded-full bg-white p-1.5 shadow-xl sm:-left-8">
                                <img
                                    src={`/images/${logo}`}
                                    alt="ACC Marketplace"
                                    className="h-24 w-24 rounded-full sm:h-28 sm:w-28"
                                />
                            </div>

                            <div className="absolute -right-2 bottom-16 w-44 rounded-2xl bg-white p-2 shadow-xl sm:-right-8 sm:w-52">
                                <SiteImage
                                    name={siteImages.heroListing}
                                    alt="Example listing: scientific calculator"
                                    className="aspect-[4/3] rounded-xl"
                                />
                                <div className="px-1.5 pb-1 pt-2.5">
                                    <p className="truncate text-sm font-semibold text-pine-950">
                                        Scientific calculator
                                    </p>
                                    <div className="mt-1 flex items-center justify-between">
                                        <span className="font-display text-base font-extrabold text-pine-900">
                                            ₱350
                                        </span>
                                        <span className="rounded-full bg-mist-100 px-2 py-0.5 text-xs font-semibold text-pine-700">
                                            Available
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-pine-900/50">
                                        Example listing
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Categories */}
                <section id="categories" className="scroll-mt-20 bg-white py-20 lg:py-28">
                    <div className="mx-auto max-w-7xl px-5 sm:px-8">
                        <div className="max-w-2xl">
                            <h2 className="font-display text-4xl font-extrabold leading-tight text-pine-950 sm:text-5xl">
                                Find what you need between classes
                            </h2>
                            <p className="mt-4 text-lg leading-relaxed text-pine-900/70">
                                Everything is posted by students on the same
                                campus, so pick-up is a short walk away.
                            </p>
                        </div>

                        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
                            {categories.map((category) => (
                                <Link
                                    key={category.name}
                                    href={`/marketplace?q=${encodeURIComponent(category.name)}`}
                                    className={`group relative isolate flex items-end overflow-hidden rounded-2xl ${category.className}`}
                                >
                                    <SiteImage
                                        name={category.image}
                                        alt={category.name}
                                        className="absolute inset-0 -z-10"
                                        imageClassName="transition duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-pine-950/90 via-pine-950/35 to-transparent" />

                                    <div className="p-5">
                                        <h3 className="font-display text-xl font-bold text-white sm:text-2xl">
                                            {category.name}
                                        </h3>
                                        <p className="mt-1 text-sm leading-snug text-white/80">
                                            {category.note}
                                        </p>
                                    </div>
                                </Link>
                            ))}

                            <Link
                                href="/marketplace"
                                className="col-span-2 flex min-h-[150px] flex-col justify-between rounded-2xl bg-sun-400 p-5 text-pine-950 transition hover:bg-sun-500"
                            >
                                <ShoppingBag size={28} />
                                <div>
                                    <h3 className="font-display text-xl font-bold sm:text-2xl">
                                        Browse everything
                                    </h3>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                                        See all listings
                                        <ArrowRight size={16} />
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section id="how" className="scroll-mt-20 bg-mist-50 py-20 lg:py-28">
                    <div className="mx-auto max-w-7xl px-5 sm:px-8">
                        <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-tight text-pine-950 sm:text-5xl">
                            Selling takes three steps
                        </h2>

                        <ol className="mt-12 grid gap-6 md:grid-cols-3">
                            {steps.map((step, index) => (
                                <li
                                    key={step.title}
                                    className="rounded-2xl border-t-[6px] border-sun-400 bg-white p-7 shadow-sm"
                                >
                                    <span className="font-display text-5xl font-extrabold text-pine-700">
                                        {index + 1}
                                    </span>
                                    <h3 className="mt-4 font-display text-xl font-bold text-pine-950">
                                        {step.title}
                                    </h3>
                                    <p className="mt-2 leading-relaxed text-pine-900/70">
                                        {step.text}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Trust & safety */}
                <section id="trust" className="scroll-mt-20 bg-pine-900 py-20 text-white lg:py-28">
                    <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
                        <div>
                            <h2 className="max-w-xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">
                                A marketplace where people know each other
                            </h2>

                            <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
                                {trust.map(({ icon: Icon, title, text }) => (
                                    <div key={title}>
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sun-400 text-pine-950">
                                            <Icon size={22} />
                                        </span>
                                        <h3 className="mt-4 font-display text-lg font-bold">
                                            {title}
                                        </h3>
                                        <p className="mt-1.5 leading-relaxed text-white/75">
                                            {text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
                            <SiteImage
                                name={siteImages.community}
                                alt="Students meeting on campus"
                                className="aspect-[4/5] rounded-3xl"
                            />

                            <div className="absolute -bottom-6 left-4 right-4 rounded-2xl bg-white p-5 text-pine-950 shadow-xl sm:-left-8 sm:right-8">
                                <h3 className="font-display text-base font-bold">
                                    Meet-up tips
                                </h3>
                                <ul className="mt-2.5 space-y-1.5 text-sm text-pine-900/75">
                                    <li>Meet on campus during the day.</li>
                                    <li>Check the item before you pay.</li>
                                    <li>Keep the conversation in the app.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final call to action */}
                {!user && (
                    <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
                        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-3xl bg-sun-400 p-8 sm:p-12 lg:flex-row lg:items-center">
                            <div className="max-w-xl">
                                <h2 className="font-display text-3xl font-extrabold leading-tight text-pine-950 sm:text-4xl">
                                    Got something you don't use anymore?
                                </h2>
                                <p className="mt-3 text-lg leading-relaxed text-pine-950/80">
                                    List it for free and give it a second life
                                    with another ACC student.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/register"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-pine-900 px-6 font-display text-[15px] font-bold text-white transition hover:bg-pine-950"
                                >
                                    Create free account
                                    <ArrowRight size={18} />
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-pine-950/40 px-6 font-display text-[15px] font-bold text-pine-950 transition hover:border-pine-950"
                                >
                                    Log in
                                </Link>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <footer className="bg-pine-950 py-12 text-white/70">
                <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Brand light />
                        <p className="mt-3 max-w-sm text-sm leading-relaxed">
                            The student marketplace of Abuyog Community
                            College.
                        </p>
                    </div>

                    <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium" aria-label="Footer">
                        <Link href="/marketplace" className="transition hover:text-white">
                            Marketplace
                        </Link>
                        <Link href="/login" className="transition hover:text-white">
                            Log in
                        </Link>
                        <Link href="/register" className="transition hover:text-white">
                            Create account
                        </Link>
                    </nav>
                </div>

                <p className="mx-auto mt-10 max-w-7xl px-5 text-xs text-white/50 sm:px-8">
                    © {new Date().getFullYear()} ACC Marketplace. All rights
                    reserved.
                </p>
            </footer>
        </div>
    );
}
