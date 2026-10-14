import { Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Camera,
    Check,
    ImagePlus,
    Lightbulb,
    Minus,
    Package,
    Plus,
    Star,
    Wrench,
    X,
} from 'lucide-react';
import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import SiteImage from '../ui/SiteImage';
import { siteImages } from '../../config/siteImages';
import { formatPrice } from '../../types/shared';

interface Category {
    id: number;
    name: string;
}

export interface FormLimits {
    title: number;
    description: number;
    maxPrice: number;
    maxQuantity: number;
    maxImages: number;
    conditions: string[];
}

interface ExistingImage {
    id: number;
    path: string;
}

interface ListingFormProps {
    mode: 'create' | 'edit';
    categories: Category[];
    limits: FormLimits;
    listing?: {
        id: number;
        category_id: number;
        title: string;
        description: string;
        price: string | number;
        quantity: number;
        type: 'item' | 'service';
        condition: string | null;
        images: ExistingImage[];
    };
}

const MAX_IMAGE_MB = 5;
const IMAGE_TYPES = /\.(jpe?g|png|webp)$/i;

function Section({
    step,
    title,
    hint,
    children,
}: {
    step: number;
    title: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="ui-card p-6">
            <div className="mb-5 flex items-start gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-800 text-sm font-extrabold text-white">
                    {step}
                </span>
                <div>
                    <h2 className="font-display text-lg font-extrabold text-pine-950">{title}</h2>
                    {hint && <p className="text-[13px] text-ink-2">{hint}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

function FieldError({ message }: { message?: string }) {
    return message ? (
        <p role="alert" className="ui-error flex items-start gap-1.5">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {message}
        </p>
    ) : null;
}

export default function ListingForm({ mode, categories, limits, listing }: ListingFormProps) {
    const editing = mode === 'edit';

    const form = useForm<{
        _method: string;
        category_id: number | '';
        title: string;
        description: string;
        price: string;
        quantity: number;
        type: 'item' | 'service';
        condition: string;
        images: File[];
        remove_images: number[];
    }>({
        _method: editing ? 'put' : 'post',
        category_id: listing?.category_id ?? '',
        title: listing?.title ?? '',
        description: listing?.description ?? '',
        price: listing ? String(Number(listing.price)) : '',
        quantity: listing?.quantity ?? 1,
        type: listing?.type ?? 'item',
        condition: listing?.condition ?? '',
        images: [],
        remove_images: [],
    });

    const [dragging, setDragging] = useState(false);
    const [photoProblem, setPhotoProblem] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const keptExisting = (listing?.images ?? []).filter((i) => !form.data.remove_images.includes(i.id));
    const totalPhotos = keptExisting.length + form.data.images.length;

    // Local preview URLs for the files the user just picked.
    const previews = useMemo(
        () => form.data.images.map((file) => URL.createObjectURL(file)),
        [form.data.images],
    );
    useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

    const isService = form.data.type === 'service';
    const priceNumber = Number(form.data.price);
    const categoryName = categories.find((c) => c.id === form.data.category_id)?.name;

    const addFiles = (incoming: FileList | File[]) => {
        const next = [...form.data.images];
        let problem: string | null = null;

        for (const file of Array.from(incoming)) {
            if (!IMAGE_TYPES.test(file.name)) {
                problem = `“${file.name}” is not a JPG, PNG or WEBP image.`;
            } else if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
                problem = `“${file.name}” is larger than ${MAX_IMAGE_MB} MB.`;
            } else if (keptExisting.length + next.length >= limits.maxImages) {
                problem = `You can add up to ${limits.maxImages} photos.`;
            } else {
                next.push(file);
            }
        }

        form.setData('images', next);
        setPhotoProblem(problem);
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        addFiles(event.dataTransfer.files);
    };

    const makeCover = (index: number) => {
        const next = [...form.data.images];
        const [file] = next.splice(index, 1);
        form.setData('images', [file, ...next]);
    };

    const toggleExisting = (id: number) =>
        form.setData(
            'remove_images',
            form.data.remove_images.includes(id)
                ? form.data.remove_images.filter((x) => x !== id)
                : [...form.data.remove_images, id],
        );

    const setQuantity = (value: number) =>
        form.setData('quantity', Math.min(limits.maxQuantity, Math.max(editing ? 0 : 1, Math.round(value) || 0)));

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            title: data.title.trim(),
            description: data.description.trim(),
            condition: data.type === 'service' ? '' : data.condition,
        }));

        // File uploads need POST; the hidden _method field turns it into PUT on edit.
        form.post(editing ? `/listings/${listing!.id}` : '/listings', {
            forceFormData: true,
            preserveScroll: true,
            // On a long form the error can be off-screen: bring it into view.
            onError: () =>
                window.setTimeout(
                    () =>
                        document
                            .querySelector('[role="alert"]')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
                    60,
                ),
        });
    };

    const photoError =
        photoProblem ??
        form.errors.images ??
        Object.entries(form.errors).find(([key]) => key.startsWith('images.'))?.[1];

    const coverUrl = previews[0] ?? (keptExisting[0] ? `/storage/${keptExisting[0].path}` : null);

    return (
        <form onSubmit={submit} noValidate className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
                {/* 1. Basics */}
                <Section step={1} title="What are you offering?" hint="Pick what fits best, then describe it clearly.">
                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Listing type">
                        {(
                            [
                                ['item', 'An item', 'Something you can hand over', Package],
                                ['service', 'A service', 'Tutoring, printing, repairs…', Wrench],
                            ] as const
                        ).map(([value, label, hint, Icon]) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={form.data.type === value}
                                onClick={() => form.setData('type', value)}
                                className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                                    form.data.type === value
                                        ? 'border-pine-700 bg-mist-100'
                                        : 'border-mist-200 bg-white hover:border-pine-700/50'
                                }`}
                            >
                                <span
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                        form.data.type === value ? 'bg-pine-800 text-white' : 'bg-mist-100 text-pine-700'
                                    }`}
                                >
                                    <Icon size={22} />
                                </span>
                                <span>
                                    <span className="block text-[15px] font-extrabold text-ink">{label}</span>
                                    <span className="block text-xs text-ink-3">{hint}</span>
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-6">
                        <label htmlFor="title" className="ui-label">Title</label>
                        <input
                            id="title"
                            value={form.data.title}
                            maxLength={limits.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder={isService ? 'e.g. Math tutoring for Grade 11' : 'e.g. Casio FX-991 scientific calculator'}
                            className={`ui-input ${form.errors.title ? 'ui-input-error' : ''}`}
                            aria-invalid={Boolean(form.errors.title)}
                        />
                        <div className="mt-1 flex justify-between gap-3">
                            <FieldError message={form.errors.title} />
                            <span className="ml-auto text-xs text-ink-3">
                                {form.data.title.length}/{limits.title}
                            </span>
                        </div>
                    </div>

                    <div className="mt-5">
                        <span className="ui-label">Category</span>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
                            {categories.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.data.category_id === c.id}
                                    onClick={() => form.setData('category_id', c.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                        form.data.category_id === c.id
                                            ? 'border-pine-800 bg-pine-800 text-white'
                                            : 'border-mist-200 bg-white text-ink-2 hover:border-pine-700 hover:text-pine-800'
                                    }`}
                                >
                                    {form.data.category_id === c.id && <Check size={14} strokeWidth={3} />}
                                    {c.name}
                                </button>
                            ))}
                        </div>
                        <FieldError message={form.errors.category_id} />
                    </div>

                    {!isService && (
                        <div className="mt-5">
                            <span className="ui-label">
                                Condition <span className="font-normal text-ink-3">(optional)</span>
                            </span>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Condition">
                                {limits.conditions.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        role="radio"
                                        aria-checked={form.data.condition === c}
                                        onClick={() => form.setData('condition', form.data.condition === c ? '' : c)}
                                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                            form.data.condition === c
                                                ? 'border-sun-500 bg-sun-300/50 text-sun-800'
                                                : 'border-mist-200 bg-white text-ink-2 hover:border-sun-500'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                            <FieldError message={form.errors.condition} />
                        </div>
                    )}

                    <div className="mt-5">
                        <label htmlFor="description" className="ui-label">Description</label>
                        <textarea
                            id="description"
                            rows={7}
                            value={form.data.description}
                            maxLength={limits.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder="What is it, how old is it, any flaws, where on campus can buyers meet you?"
                            className={`ui-input ${form.errors.description ? 'ui-input-error' : ''}`}
                            aria-invalid={Boolean(form.errors.description)}
                        />
                        <div className="mt-1 flex justify-between gap-3">
                            <FieldError message={form.errors.description} />
                            <span className="ml-auto text-xs text-ink-3">
                                {form.data.description.length}/{limits.description}
                            </span>
                        </div>
                    </div>
                </Section>

                {/* 2. Price & stock */}
                <Section step={2} title="Price and quantity">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="price" className="ui-label">
                                {isService ? 'Price per session' : 'Price per unit'}
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-extrabold text-ink-2">
                                    ₱
                                </span>
                                <input
                                    id="price"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={limits.maxPrice}
                                    step="0.01"
                                    value={form.data.price}
                                    onChange={(e) => form.setData('price', e.target.value)}
                                    placeholder="0.00"
                                    className={`ui-input !pl-9 ${form.errors.price ? 'ui-input-error' : ''}`}
                                    aria-invalid={Boolean(form.errors.price)}
                                />
                            </div>
                            {form.errors.price || priceNumber > limits.maxPrice ? (
                                <FieldError
                                    message={
                                        form.errors.price ??
                                        `The price cannot be more than ${formatPrice(limits.maxPrice)}.`
                                    }
                                />
                            ) : (
                                <p className="ui-hint">
                                    Up to {formatPrice(limits.maxPrice)}. Enter 0 for free.
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="quantity" className="ui-label">
                                {isService ? 'Available slots' : 'Quantity in stock'}
                            </label>
                            <div className="flex items-center overflow-hidden rounded-xl border border-pine-900/20 bg-white focus-within:border-pine-700 focus-within:ring-4 focus-within:ring-pine-700/15">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(form.data.quantity - 1)}
                                    aria-label="Decrease quantity"
                                    className="flex h-11 w-12 items-center justify-center text-ink-2 transition hover:bg-mist-100"
                                >
                                    <Minus size={16} />
                                </button>
                                <input
                                    id="quantity"
                                    type="number"
                                    inputMode="numeric"
                                    min={editing ? 0 : 1}
                                    max={limits.maxQuantity}
                                    value={form.data.quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="h-11 w-full min-w-0 border-0 bg-transparent text-center text-[15px] font-extrabold text-ink outline-none"
                                    aria-invalid={Boolean(form.errors.quantity)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setQuantity(form.data.quantity + 1)}
                                    aria-label="Increase quantity"
                                    className="flex h-11 w-12 items-center justify-center text-ink-2 transition hover:bg-mist-100"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            {form.errors.quantity ? (
                                <FieldError message={form.errors.quantity} />
                            ) : (
                                <p className="ui-hint">
                                    {editing
                                        ? 'Units still available to order. Set 0 to mark it sold out.'
                                        : `Whole numbers, up to ${limits.maxQuantity}.`}
                                </p>
                            )}
                        </div>
                    </div>
                </Section>

                {/* 3. Photos */}
                <Section
                    step={3}
                    title="Add photos"
                    hint={`Listings with clear photos sell faster. Up to ${limits.maxImages} photos, ${MAX_IMAGE_MB} MB each. The first is the cover.`}
                >
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
                            dragging ? 'border-pine-700 bg-mist-100' : 'border-mist-300 bg-mist-50'
                        }`}
                    >
                        <input
                            ref={fileInput}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files) addFiles(e.target.files);
                                e.target.value = '';
                            }}
                        />
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-pine-700 shadow-sm">
                            <ImagePlus size={24} />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-ink">
                            Drag photos here, or{' '}
                            <button
                                type="button"
                                onClick={() => fileInput.current?.click()}
                                disabled={totalPhotos >= limits.maxImages}
                                className="font-bold text-pine-700 underline decoration-sun-500 decoration-2 underline-offset-4 hover:text-pine-900 disabled:opacity-50"
                            >
                                browse your device
                            </button>
                        </p>
                        <p className="mt-1 text-xs text-ink-3">
                            {totalPhotos}/{limits.maxImages} photos · JPG, PNG or WEBP
                        </p>
                    </div>

                    {photoError && <FieldError message={photoError} />}

                    {(keptExisting.length > 0 || form.data.images.length > 0 || (listing?.images.length ?? 0) > 0) && (
                        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                            {(listing?.images ?? []).map((image) => {
                                const removed = form.data.remove_images.includes(image.id);

                                return (
                                    <li
                                        key={`old-${image.id}`}
                                        className={`group relative aspect-square overflow-hidden rounded-xl bg-mist-100 ring-1 ring-mist-200 ${
                                            removed ? 'opacity-40' : ''
                                        }`}
                                    >
                                        <img src={`/storage/${image.path}`} alt="" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => toggleExisting(image.id)}
                                            aria-label={removed ? 'Keep this photo' : 'Remove this photo'}
                                            className={`absolute right-1.5 top-1.5 flex h-7 items-center justify-center rounded-full px-2 text-[11px] font-bold text-white ${
                                                removed ? 'bg-pine-800' : 'bg-pine-950/75 hover:bg-red-600'
                                            }`}
                                        >
                                            {removed ? 'Undo' : <X size={14} />}
                                        </button>
                                    </li>
                                );
                            })}

                            {form.data.images.map((file, index) => (
                                <li
                                    key={`new-${file.name}-${index}`}
                                    className="group relative aspect-square overflow-hidden rounded-xl bg-mist-100 ring-2 ring-pine-600/50"
                                >
                                    <img src={previews[index]} alt={file.name} className="h-full w-full object-cover" />
                                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-pine-800 px-2 py-0.5 text-[10px] font-bold text-white">
                                        New
                                    </span>
                                    <div className="absolute right-1.5 top-1.5 flex gap-1">
                                        {index > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => makeCover(index)}
                                                aria-label="Make this the cover photo"
                                                title="Make cover"
                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-pine-950/75 text-white hover:bg-sun-500 hover:text-pine-950"
                                            >
                                                <Star size={13} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                form.setData('images', form.data.images.filter((_, i) => i !== index))
                                            }
                                            aria-label={`Remove ${file.name}`}
                                            className="flex h-7 w-7 items-center justify-center rounded-full bg-pine-950/75 text-white hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <div className="flex flex-wrap items-center justify-end gap-3">
                    <Link
                        href={editing ? `/listings/${listing!.id}` : '/listings'}
                        className="ui-btn ui-btn-outline ui-btn-lg"
                    >
                        Cancel
                    </Link>
                    <button type="submit" disabled={form.processing} className="ui-btn ui-btn-primary ui-btn-lg min-w-[11rem]">
                        {form.processing
                            ? editing ? 'Saving…' : 'Publishing…'
                            : editing ? 'Save changes' : 'Publish listing'}
                    </button>
                </div>
            </div>

            {/* Live preview + tips */}
            <aside className="space-y-5 xl:sticky xl:top-[92px]">
                <div>
                    <p className="mb-2 text-[13px] font-extrabold uppercase tracking-wider text-ink-2">
                        Live preview
                    </p>

                    <div className="ui-card overflow-hidden">
                        <div className="relative aspect-[4/3] bg-mist-100">
                            {coverUrl ? (
                                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-3">
                                    <Camera size={34} strokeWidth={1.4} />
                                    <span className="text-xs font-medium">Your cover photo</span>
                                </div>
                            )}
                            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-pine-800 shadow-sm">
                                {isService ? 'Service' : (categoryName ?? 'Category')}
                            </span>
                        </div>
                        <div className="p-4">
                            <h3 className="line-clamp-2 min-h-[2.75rem] font-display text-[15px] font-bold leading-snug text-pine-950">
                                {form.data.title || 'Your listing title'}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-ink-3">
                                <Star size={13} className="text-mist-300" /> New
                            </div>
                            <div className="mt-3 flex items-end justify-between">
                                <p className="font-display text-xl font-extrabold text-pine-900">
                                    {form.data.price !== '' && priceNumber >= 0 && priceNumber <= limits.maxPrice
                                        ? priceNumber === 0 ? 'Free' : formatPrice(priceNumber)
                                        : '₱0.00'}
                                </p>
                                {form.data.quantity > 0 && form.data.quantity <= 3 && (
                                    <span className="ui-chip bg-sun-300/45 text-sun-800">
                                        Only {form.data.quantity} left
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <SiteImage
                    name={siteImages.sell}
                    alt="Students trading on campus"
                    className="hidden aspect-[16/10] rounded-2xl xl:block"
                />

                <div className="rounded-2xl bg-mist-100 p-5">
                    <p className="flex items-center gap-2 font-display text-sm font-extrabold text-pine-950">
                        <Lightbulb size={17} className="text-sun-600" />
                        Tips for a quick sale
                    </p>
                    <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-2">
                        <li>Use natural light and show any scratches or flaws.</li>
                        <li>Put brand, model and size in the title.</li>
                        <li>Price fairly. Check similar listings first.</li>
                        <li>Say where on campus you can meet.</li>
                    </ul>
                </div>
            </aside>
        </form>
    );
}
