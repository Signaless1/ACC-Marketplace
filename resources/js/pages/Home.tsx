import { Head, Link, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Flag,
    MessageCircle,
    ShieldCheck,
    ShoppingBag,
    Star,
    Tag,
    Users,
} from 'lucide-react';
import {
    CSSProperties,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import SiteImage from '../components/ui/SiteImage';
import { logo, siteImages } from '../config/siteImages';
import type { SharedProps } from '../types/shared';

/** Stagger delay for entrance and reveal animations. */
const d = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties;

const h2 =
    'font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-6xl';

/** The sections the header links to, in the order the links are shown. */
const navLinks = [
    { id: 'categories', label: 'Categories' },
    { id: 'how', label: 'How it works' },
    { id: 'trust', label: 'Safety' },
];

const categories = [
    {
        name: 'Electronics',
        note: 'Phones, laptops, calculators and accessories',
        image: siteImages.categories.electronics,
    },
    {
        name: 'Clothing',
        note: 'Uniforms, shoes and bags',
        image: siteImages.categories.clothing,
    },
    {
        name: 'School Supplies',
        note: 'Books, notebooks and tools',
        image: siteImages.categories.schoolSupplies,
    },
    {
        name: 'Food & Drinks',
        note: 'Snacks and homemade treats',
        image: siteImages.categories.food,
    },
    {
        name: 'Home & Living',
        note: 'Dorm and room essentials',
        image: siteImages.categories.home,
    },
    {
        name: 'Services',
        note: 'Tutoring, printing, repairs and more',
        image: siteImages.categories.services,
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

const perks = [
    { icon: Tag, label: 'Free to list' },
    { icon: Users, label: 'Only ACC students' },
    { icon: Star, label: 'Rated sellers' },
];

const tips = [
    'Meet on campus during the day.',
    'Check the item before you pay.',
    'Keep the conversation in the app.',
];

function Brand() {
    return (
        <Link href="/" className="group flex items-center gap-3">
            <img
                src={`/images/${logo}`}
                alt=""
                className="h-11 w-11 rounded-full bg-white transition-transform duration-500 group-hover:rotate-[14deg]"
            />
            <span className="font-display text-xl font-extrabold text-white">
                ACC Marketplace
            </span>
        </Link>
    );
}

export default function Home() {
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user;
    const root = useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(0);
    const [slide, setSlide] = useState(0);

    // The header link for the section you are in keeps its yellow underline until
    // you move to another section. Clicking a link marks it at once and holds it
    // while the page scrolls there, so it does not flicker through the sections
    // in between.
    const [active, setActive] = useState<string | null>(null);
    const holdUntil = useRef(0);
    const Current = trust[slide].icon;

    // Scroll reveals. Only elements that start below the fold are hidden,
    // and only until they scroll into view, so nothing can stay invisible.
    useLayoutEffect(() => {
        const el = root.current;

        if (
            !el ||
            !('IntersectionObserver' in window) ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return undefined;
        }

        const below = Array.from(
            el.querySelectorAll<HTMLElement>('[data-rv]'),
        ).filter((node) => node.getBoundingClientRect().top > window.innerHeight * 0.9);

        below.forEach((node) => node.classList.add('rv-hide'));

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.remove('rv-hide');
                        entry.target.classList.add('rv-show');
                        io.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: '0px 0px -8% 0px' },
        );

        below.forEach((node) => io.observe(node));

        return () => io.disconnect();
    }, []);

    useEffect(() => {
        // The "reading line" sits just under the fixed header.
        const READING_LINE = 120;

        const follow = () => {
            if (Date.now() < holdUntil.current) return;

            let current: string | null = null;

            for (const { id } of navLinks) {
                const section = document.getElementById(id);
                if (!section) continue;

                const box = section.getBoundingClientRect();
                if (box.top <= READING_LINE && box.bottom > READING_LINE) {
                    current = id;
                    break;
                }
            }

            // Only re-render when the section actually changes.
            setActive((previous) => (previous === current ? previous : current));
        };

        const onScroll = () => {
            setScrolled(window.scrollY > 24);
            follow();
        };

        // The moment the person scrolls by hand, stop holding the clicked link.
        const release = () => {
            holdUntil.current = 0;
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        window.addEventListener('wheel', release, { passive: true });
        window.addEventListener('touchstart', release, { passive: true });
        window.addEventListener('keydown', release);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            window.removeEventListener('wheel', release);
            window.removeEventListener('touchstart', release);
            window.removeEventListener('keydown', release);
        };
    }, []);

    return (
        <div
            ref={root}
            className="site overflow-x-clip bg-mist-50 font-body text-pine-950"
        >
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

            {/* Navigation: transparent over the hero, frosted green after scrolling */}
            <header
                className={`hx-drop fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
                    scrolled
                        ? 'bg-pine-950/85 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl'
                        : 'bg-transparent'
                }`}
            >
                <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
                    <Brand />

                    <nav
                        className="hidden items-center gap-9 text-[15px] font-medium text-white/80 md:flex"
                        aria-label="Sections"
                    >
                        {navLinks.map(({ id, label }) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                aria-current={active === id ? 'location' : undefined}
                                onClick={() => {
                                    // Underline it now and keep it while the page scrolls there.
                                    setActive(id);
                                    holdUntil.current = Date.now() + 1200;
                                }}
                                className="nv transition hover:text-white"
                            >
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="bt bt-yellow !h-10 !px-5 !text-sm"
                            >
                                Go to dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="inline-flex h-10 items-center rounded-full px-4 font-display text-sm font-bold text-white transition hover:bg-white/10"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/register"
                                    className="bt bt-yellow !h-10 !px-5 !text-sm"
                                >
                                    Create account
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main id="main">
                {/* Hero: deep green, with the campus on a slanted panel */}
                <section className="relative isolate min-h-[100svh] overflow-hidden bg-pine-950 text-white">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:26px_26px]"
                    />

                    <div className="hx-photo absolute inset-0 lg:left-auto lg:w-[50%]">
                        <SiteImage
                            name={siteImages.hero}
                            alt="Abuyog Community College campus"
                            eager
                            className="absolute inset-0"
                            imageClassName="hx-zoom object-[66%_45%]"
                        />
                        <div className="absolute inset-0 bg-pine-950/75 lg:bg-pine-950/10" />

                        <div className="hx-card absolute bottom-14 right-8 hidden w-56 md:block">
                            <div className="rounded-3xl bg-white p-2.5 text-pine-950 shadow-2xl shadow-pine-950/40">
                                <SiteImage
                                    name={siteImages.heroListing}
                                    alt="Example listing: scientific calculator"
                                    className="aspect-[4/3] rounded-2xl"
                                />
                                <div className="px-1.5 pb-1 pt-3">
                                    <p className="truncate text-sm font-semibold">
                                        Scientific calculator
                                    </p>
                                    <div className="mt-1 flex items-center justify-between">
                                        <span className="font-display text-lg font-extrabold text-pine-900">
                                            ₱350
                                        </span>
                                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                                            Available
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-pine-900/60">
                                        Example listing
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        aria-hidden="true"
                        className="hx-stripe absolute inset-y-0 right-0 hidden w-[50%] bg-sun-400 lg:block"
                    />

                    <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pb-24 pt-32 sm:px-8">
                        <div className="max-w-2xl lg:max-w-[46%]">
                            <h1 className="font-display text-[clamp(2.75rem,5.4vw,5.2rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-white">
                                {['Buy, sell and', 'trade right', 'on campus.'].map(
                                    (line, i) => (
                                        <span key={line} className="hl block">
                                            <span style={d(0.15 + i * 0.12)}>
                                                {line}
                                            </span>
                                        </span>
                                    ),
                                )}
                            </h1>

                            <p
                                className="hx-l mt-7 max-w-lg text-lg leading-relaxed text-white/75"
                                style={d(0.6)}
                            >
                                Textbooks, uniforms, gadgets, snacks and
                                services, listed by Abuyog Community College
                                students and handed over between classes.
                            </p>

                            <div
                                className="hx-l mt-9 flex flex-wrap gap-3"
                                style={d(0.75)}
                            >
                                {user ? (
                                    <Link
                                        href="/marketplace"
                                        className="bt bt-yellow"
                                    >
                                        <ShoppingBag size={18} />
                                        Open the marketplace
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href="/register"
                                            className="bt bt-yellow"
                                        >
                                            Create free account
                                        </Link>
                                        <Link
                                            href="/marketplace"
                                            className="bt bt-ghost"
                                        >
                                            Browse listings
                                        </Link>
                                    </>
                                )}
                            </div>

                            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-white/80">
                                {perks.map(({ icon: Icon, label }, i) => (
                                    <li
                                        key={label}
                                        className="hx-l flex items-center gap-2"
                                        style={d(0.95 + i * 0.1)}
                                    >
                                        <Icon
                                            size={16}
                                            className="text-sun-400"
                                        />
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div
                        aria-hidden="true"
                        className="hx-cue absolute bottom-8 left-5 h-14 w-[2px] overflow-hidden bg-white/20 sm:left-8"
                    >
                        <span className="block h-1/3 w-full bg-sun-400" />
                    </div>
                </section>

                {/* Categories: panels slide open on hover or focus */}
                <section
                    id="categories"
                    className="scroll-mt-20 py-20 lg:py-28"
                >
                    <div className="mx-auto max-w-7xl px-5 sm:px-8">
                        <div className="grid gap-5 md:grid-cols-[1.3fr_0.7fr] md:items-end md:gap-12">
                            <h2
                                data-rv
                                className={`rv-l ${h2} text-pine-950`}
                            >
                                Find what you need between classes
                            </h2>
                            <p
                                data-rv
                                className="rv-r text-lg leading-relaxed text-pine-900/70"
                                style={d(0.1)}
                            >
                                Everything is posted by students on the same
                                campus, so pick-up is a short walk away.
                            </p>
                        </div>

                        <div className="mt-12 grid grid-cols-2 gap-3 md:flex md:h-[30rem]">
                            {categories.map((category, i) => {
                                const on = open === i;

                                return (
                                    <Link
                                        key={category.name}
                                        href={`/marketplace?q=${encodeURIComponent(category.name)}`}
                                        onMouseEnter={() => setOpen(i)}
                                        onFocus={() => setOpen(i)}
                                        className="pn relative isolate min-h-44 overflow-hidden rounded-[2rem] md:min-h-0 md:basis-0 md:[flex-grow:var(--g)]"
                                        style={
                                            {
                                                '--g': on ? 5 : 1,
                                            } as CSSProperties
                                        }
                                    >
                                        <SiteImage
                                            name={category.image}
                                            alt={category.name}
                                            className="absolute inset-0 -z-10"
                                            imageClassName={`transition-transform duration-[1400ms] ease-out ${
                                                on
                                                    ? 'md:scale-100'
                                                    : 'md:scale-125'
                                            }`}
                                        />
                                        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-pine-950/90 via-pine-950/25 to-pine-950/10" />

                                        <span
                                            aria-hidden="true"
                                            className={`absolute bottom-6 left-1/2 hidden -translate-x-1/2 rotate-180 font-display text-lg font-bold text-white transition-opacity duration-500 [writing-mode:vertical-rl] md:block ${
                                                on ? 'opacity-0' : 'opacity-100'
                                            }`}
                                        >
                                            {category.name}
                                        </span>

                                        <div
                                            className={`absolute inset-x-0 bottom-0 p-5 transition-all duration-700 md:w-[26rem] md:p-8 ${
                                                on
                                                    ? ''
                                                    : 'md:translate-y-6 md:opacity-0'
                                            }`}
                                        >
                                            <h3 className="font-display text-xl font-extrabold text-white md:text-3xl">
                                                {category.name}
                                            </h3>
                                            <p className="mt-1 max-w-xs text-sm leading-snug text-white/80">
                                                {category.note}
                                            </p>
                                            <span className="mt-4 hidden w-fit rounded-full bg-sun-400 px-4 py-2 font-display text-sm font-bold text-pine-950 md:inline-flex">
                                                Browse
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="mt-8 flex justify-center md:justify-end">
                            <Link href="/marketplace" className="bt bt-pine">
                                <ShoppingBag size={18} />
                                Browse everything
                            </Link>
                        </div>
                    </div>
                </section>

                {/* How it works: a yellow band with a pinned heading */}
                <section
                    id="how"
                    className="scroll-mt-20 overflow-x-clip bg-sun-400 py-24 lg:py-32"
                >
                    <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
                        <div className="lg:sticky lg:top-32 lg:self-start">
                            <h2
                                data-rv
                                className={`rv-l ${h2} text-pine-950`}
                            >
                                Selling takes three steps
                            </h2>
                        </div>

                        <ol className="divide-y divide-pine-900/20">
                            {steps.map((step, i) => (
                                <li
                                    key={step.title}
                                    data-rv
                                    className="rv-r grid grid-cols-[auto_1fr] items-start gap-6 py-10 first:pt-0 md:gap-10"
                                    style={d(i * 0.08)}
                                >
                                    <span className="st-num font-display text-7xl font-extrabold leading-none md:text-9xl">
                                        {i + 1}
                                    </span>
                                    <div className="pt-2">
                                        <h3 className="font-display text-2xl font-extrabold text-pine-950 md:text-3xl">
                                            {step.title}
                                        </h3>
                                        <p className="mt-3 max-w-md text-lg leading-relaxed text-pine-950/75">
                                            {step.text}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Safety: slides advance by themselves; hover or tap to take over */}
                <section
                    id="trust"
                    className="scroll-mt-20 bg-pine-900 px-3 py-16 sm:px-6 lg:py-24"
                >
                    <div
                        data-rv
                        className="st rv-u relative isolate mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-pine-950 sm:rounded-[3rem]"
                    >
                        <SiteImage
                            name={siteImages.community}
                            alt="Students meeting on campus"
                            className="absolute inset-0 -z-10"
                            imageClassName="object-[70%_40%]"
                        />
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-pine-950 via-pine-950/85 to-pine-950/20" />

                        <div className="grid gap-10 p-7 sm:p-12 lg:grid-cols-[1.15fr_0.85fr] lg:p-16">
                            <div className="flex flex-col">
                                <h2 className={`${h2} max-w-xl text-white`}>
                                    A marketplace where people know each other
                                </h2>

                                <div className="mt-10 min-h-[11rem]">
                                    <div key={slide} className="st-in max-w-md">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-400 text-pine-950">
                                            <Current size={22} />
                                        </span>
                                        <h3 className="mt-4 font-display text-2xl font-bold text-white">
                                            {trust[slide].title}
                                        </h3>
                                        <p className="mt-2 text-lg leading-relaxed text-white/75">
                                            {trust[slide].text}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    {trust.map(({ icon: Icon, title }, i) => (
                                        <button
                                            key={title}
                                            type="button"
                                            onClick={() => setSlide(i)}
                                            aria-label={title}
                                            aria-current={i === slide}
                                            className="group flex-1 text-left"
                                        >
                                            <span className="relative block h-1 overflow-hidden rounded-full bg-white/20">
                                                <span
                                                    key={`${i}-${slide}`}
                                                    className={`st-bar ${
                                                        i === slide
                                                            ? 'st-run'
                                                            : i < slide
                                                              ? 'st-done'
                                                              : ''
                                                    }`}
                                                    onAnimationEnd={
                                                        i === slide
                                                            ? () =>
                                                                  setSlide(
                                                                      (s) =>
                                                                          (s +
                                                                              1) %
                                                                          trust.length,
                                                                  )
                                                            : undefined
                                                    }
                                                />
                                            </span>
                                            <Icon
                                                size={18}
                                                className={`mt-3 transition-colors ${
                                                    i === slide
                                                        ? 'text-sun-400'
                                                        : 'text-white/50 group-hover:text-white'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div
                                data-rv
                                className="rv-r self-end rounded-[2rem] bg-sun-400 p-7 text-pine-950 lg:ml-auto lg:max-w-sm"
                                style={d(0.15)}
                            >
                                <h3 className="font-display text-xl font-extrabold text-pine-950">
                                    Meet-up tips
                                </h3>
                                <ul className="mt-4 space-y-3 text-[15px] font-medium">
                                    {tips.map((tip) => (
                                        <li
                                            key={tip}
                                            className="flex items-start gap-2.5"
                                        >
                                            <CheckCircle2
                                                size={18}
                                                className="mt-0.5 shrink-0 text-pine-800"
                                            />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final call to action */}
                {!user && (
                    <section className="relative isolate overflow-hidden bg-pine-800 py-24 text-white lg:py-32">
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 select-none overflow-hidden"
                        >
                            <div className="hx-ghost flex w-max whitespace-nowrap font-display text-[9rem] font-extrabold leading-none text-transparent [-webkit-text-stroke:1.5px_rgb(255_255_255/0.14)] lg:text-[13rem]">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <span key={i} className="pr-16">
                                        ACC Marketplace
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
                            <h2
                                data-rv
                                className="rv-u font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.025em] text-white sm:text-6xl"
                            >
                                Got something you don't use anymore?
                            </h2>
                            <p
                                data-rv
                                className="rv-u mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/80"
                                style={d(0.1)}
                            >
                                List it for free and give it a second life
                                with another ACC student.
                            </p>
                            <div
                                data-rv
                                className="rv-u mt-9 flex flex-wrap justify-center gap-3"
                                style={d(0.2)}
                            >
                                <Link
                                    href="/register"
                                    className="bt bt-yellow"
                                >
                                    Create free account
                                </Link>
                                <Link href="/login" className="bt bt-ghost">
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
                        <Brand />
                        <p className="mt-3 max-w-sm text-sm leading-relaxed">
                            The student marketplace of Abuyog Community
                            College.
                        </p>
                    </div>

                    <nav
                        className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium"
                        aria-label="Footer"
                    >
                        <Link
                            href="/marketplace"
                            className="nv transition hover:text-white"
                        >
                            Marketplace
                        </Link>
                        <Link
                            href="/login"
                            className="nv transition hover:text-white"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/register"
                            className="nv transition hover:text-white"
                        >
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
