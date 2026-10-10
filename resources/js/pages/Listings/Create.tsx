import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ImagePlus, Lightbulb, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import ListingFormFields, {
    ListingFormValues,
    ListingLimits,
    validateListing,
} from '../../components/ui/ListingFormFields';
import SiteImage from '../../components/ui/SiteImage';
import { siteImages } from '../../config/siteImages';

interface Props {
    categories: { id: number; name: string }[];
    limits: ListingLimits;
}

const MAX_IMAGES = 5;

export default function Create({ categories, limits }: Props) {
    const [values, setValues] = useState<ListingFormValues>({
        title: '',
        categoryId: '',
        type: 'item',
        price: '',
        quantity: '1',
        condition: '',
        description: '',
    });
    const [images, setImages] = useState<File[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
    useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

    const addImages = (event: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(event.target.files ?? []);
        event.target.value = '';

        const tooBig = picked.find((f) => f.size > 5 * 1024 * 1024);
        if (tooBig) {
            setError(`"${tooBig.name}" is larger than 5 MB.`);
            return;
        }

        setError('');
        setImages((current) => [...current, ...picked].slice(0, MAX_IMAGES));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const problem = validateListing(values, limits);

        if (problem) {
            setError(problem);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setError('');
        setLoading(true);

        const form = new FormData();
        form.append('title', values.title.trim());
        form.append('category_id', values.categoryId);
        form.append('type', values.type);
        form.append('price', values.price);
        form.append('quantity', values.quantity);
        form.append('condition', values.condition);
        form.append('description', values.description.trim());
        images.forEach((image) => form.append('images[]', image));

        router.post('/listings', form, {
            forceFormData: true,
            onError: (errors) => {
                setError(String(Object.values(errors)[0] ?? 'Please check the information you entered.'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onFinish: () => setLoading(false),
        });
    };

    return (
        <AppLayout>
            <Head title="Sell something" />

            <div className="mx-auto max-w-5xl">
                <Link
                    href="/marketplace"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#34483e] transition hover:text-[#176B4D]"
                >
                    <ArrowLeft size={18} />
                    Back to Marketplace
                </Link>

                <div className="relative mb-8 overflow-hidden rounded-3xl bg-[#063b2a] text-white">
                    <SiteImage
                        name={siteImages.sellBanner}
                        alt=""
                        className="absolute inset-0 opacity-25"
                    />
                    <div className="relative px-7 py-9 sm:px-10">
                        <h1 className="font-sans text-3xl font-extrabold tracking-tight !text-white">
                            Sell something
                        </h1>
                        <p className="mt-2 max-w-xl text-[#d6eadf]">
                            Turn what you don't need into cash. Good photos and an honest description sell fastest.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {error && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
                            >
                                {error}
                            </div>
                        )}

                        <section className="surface-card p-6">
                            <h2 className="mb-5 font-sans text-lg font-bold text-[#12291f]">1. The basics</h2>
                            <ListingFormFields
                                values={values}
                                onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
                                categories={categories}
                                limits={limits}
                            />
                        </section>

                        <section className="surface-card p-6">
                            <div className="mb-5 flex items-end justify-between">
                                <h2 className="font-sans text-lg font-bold text-[#12291f]">2. Photos</h2>
                                <span className="text-xs font-semibold text-[#43554c]">
                                    {images.length}/{MAX_IMAGES} · JPG, PNG, WebP · 5 MB each
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                                {previews.map((url, index) => (
                                    <div
                                        key={url}
                                        className="relative aspect-square overflow-hidden rounded-xl border border-[#dce6e0] bg-white"
                                    >
                                        <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                                        {index === 0 && (
                                            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#176B4D] px-2 py-0.5 text-[10px] font-bold text-white">
                                                Cover
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setImages((c) => c.filter((_, i) => i !== index))}
                                            aria-label={`Remove image ${index + 1}`}
                                            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-[#d4623a]"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}

                                {images.length < MAX_IMAGES && (
                                    <label
                                        htmlFor="images"
                                        className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#9db8aa] bg-[#F6FAF7] text-center text-[#176B4D] transition hover:bg-[#EAF4EF]"
                                    >
                                        <ImagePlus size={26} />
                                        <span className="text-xs font-bold">Add photo</span>
                                    </label>
                                )}
                            </div>

                            <input
                                id="images"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={addImages}
                                className="hidden"
                            />
                        </section>

                        <div className="flex justify-end gap-3">
                            <Link
                                href="/marketplace"
                                className="rounded-xl px-5 py-3 text-sm font-bold text-[#34483e] transition hover:bg-[#EAF4EF]"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="accent-btn rounded-xl px-7 py-3 text-sm font-bold"
                            >
                                {loading ? 'Publishing…' : 'Publish listing'}
                            </button>
                        </div>
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                        <div className="rounded-2xl border border-[#f0d9a0] bg-[#FBF6E8] p-5">
                            <p className="flex items-center gap-2 font-sans text-sm font-bold text-[#7a5a12]">
                                <Lightbulb size={17} />
                                Tips for a quick sale
                            </p>
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#4d3f16]">
                                <li>Use natural light and show every side.</li>
                                <li>Put the price you'd really accept.</li>
                                <li>Say where on campus you can meet.</li>
                                <li>Reply fast: buyers move on quickly.</li>
                            </ul>
                        </div>
                    </aside>
                </form>
            </div>
        </AppLayout>
    );
}
