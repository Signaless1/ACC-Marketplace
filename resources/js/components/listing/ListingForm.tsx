import { Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Briefcase,
    ImagePlus,
    Lightbulb,
    Minus,
    Package,
    Plus,
    Star,
    X,
} from 'lucide-react';
import {
    ChangeEvent,
    DragEvent,
    ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { formatPrice } from '../../types/shared';

/** Mirrors the server-side rules in ListingController. */
export const LIMITS = {
    title: { min: 5, max: 80 },
    description: { min: 20, max: 2000 },
    price: { min: 1, max: 500000, integerDigits: 6, decimals: 2 },
    quantity: { min: 1, max: 999 },
    images: 5,
    imageMb: 5,
} as const;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface Category {
    id: number;
    name: string;
}

interface ExistingImage {
    id: number;
    path: string;
}

export interface ListingFormInitial {
    id?: number;
    title: string;
    category_id: number | '';
    type: 'item' | 'service';
    condition: string | null;
    price: string | number;
    quantity: number;
    description: string;
    images?: ExistingImage[];
}

interface ListingFormProps {
    mode: 'create' | 'edit';
    categories: Category[];
    conditions: string[];
    initial?: ListingFormInitial;
    /** Server-side validation errors, keyed by field. */
    serverErrors?: Record<string, string>;
    banner?: ReactNode;
}

type FieldName =
    | 'title'
    | 'category_id'
    | 'price'
    | 'quantity'
    | 'description'
    | 'images';

const inputBase =
    'w-full rounded-xl border bg-white text-[15px] text-ink-900 outline-none transition placeholder:text-ink-500 focus:ring-4';

const inputClass = (invalid: boolean) =>
    `${inputBase} ${
        invalid
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
            : 'border-sand-300 focus:border-brand-700 focus:ring-brand-700/15'
    }`;

function Section({
    step,
    title,
    description,
    children,
}: {
    step: number;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-extrabold text-white">
                    {step}
                </span>
                <div>
                    <h2 className="text-lg font-bold text-ink-900">{title}</h2>
                    <p className="text-sm text-ink-600">{description}</p>
                </div>
            </div>

            <div className="space-y-5">{children}</div>
        </section>
    );
}

function Field({
    id,
    label,
    error,
    hint,
    counter,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    counter?: string;
    children: ReactNode;
}) {
    return (
        <div data-field={id}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor={id} className="text-sm font-bold text-ink-900">
                    {label}
                </label>
                {counter && <span className="text-xs text-ink-600">{counter}</span>}
            </div>

            {children}

            {error ? (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700"
                >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1.5 text-sm text-ink-600">{hint}</p>
            ) : null}
        </div>
    );
}

/** Keeps only a valid money amount: digits, one dot, limited length. */
function cleanPrice(raw: string) {
    let value = raw.replace(/[^\d.]/g, '');
    const firstDot = value.indexOf('.');

    if (firstDot !== -1) {
        value =
            value.slice(0, firstDot + 1) +
            value.slice(firstDot + 1).replace(/\./g, '');
    }

    const [whole, fraction] = value.split('.');
    const limitedWhole = whole.slice(0, LIMITS.price.integerDigits);

    return fraction !== undefined
        ? `${limitedWhole}.${fraction.slice(0, LIMITS.price.decimals)}`
        : limitedWhole;
}

export default function ListingForm({
    mode,
    categories,
    conditions,
    initial,
    serverErrors = {},
    banner,
}: ListingFormProps) {
    const [title, setTitle] = useState(initial?.title ?? '');
    const [categoryId, setCategoryId] = useState<number | ''>(
        initial?.category_id ?? '',
    );
    const [type, setType] = useState<'item' | 'service'>(initial?.type ?? 'item');
    const [condition, setCondition] = useState(initial?.condition ?? '');
    const [price, setPrice] = useState(
        initial?.price !== undefined ? String(Number(initial.price)) : '',
    );
    const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
    const [description, setDescription] = useState(initial?.description ?? '');

    const [newImages, setNewImages] = useState<File[]>([]);
    const [removedIds, setRemovedIds] = useState<number[]>([]);
    const [imageProblem, setImageProblem] = useState('');
    const [dragging, setDragging] = useState(false);

    const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>(serverErrors);

    const fileInput = useRef<HTMLInputElement>(null);

    const existing = (initial?.images ?? []).filter(
        (image) => !removedIds.includes(image.id),
    );
    const imageCount = existing.length + newImages.length;

    const previewUrls = useMemo(
        () => newImages.map((file) => URL.createObjectURL(file)),
        [newImages],
    );

    useEffect(
        () => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)),
        [previewUrls],
    );

    // ---- validation (same limits as the server) ----
    const clientErrors = useMemo(() => {
        const found: Partial<Record<FieldName, string>> = {};
        const trimmedTitle = title.trim();

        if (trimmedTitle.length < LIMITS.title.min) {
            found.title = `Give it a title of at least ${LIMITS.title.min} characters.`;
        }

        if (categoryId === '') {
            found.category_id = 'Choose a category.';
        }

        const priceNumber = Number(price);

        if (price === '' || Number.isNaN(priceNumber)) {
            found.price = 'Enter a price.';
        } else if (priceNumber < LIMITS.price.min) {
            found.price = `The price must be at least ₱${LIMITS.price.min}.`;
        } else if (priceNumber > LIMITS.price.max) {
            found.price = `The price cannot be more than ₱${LIMITS.price.max.toLocaleString()}.`;
        }

        const quantityNumber = Number(quantity);

        if (
            quantity === '' ||
            !Number.isInteger(quantityNumber) ||
            quantityNumber < LIMITS.quantity.min
        ) {
            found.quantity = `Quantity must be a whole number from ${LIMITS.quantity.min} to ${LIMITS.quantity.max}.`;
        } else if (quantityNumber > LIMITS.quantity.max) {
            found.quantity = `Quantity cannot be more than ${LIMITS.quantity.max}.`;
        }

        if (description.trim().length < LIMITS.description.min) {
            found.description = `Describe it in at least ${LIMITS.description.min} characters so buyers know what to expect.`;
        }

        return found;
    }, [title, categoryId, price, quantity, description]);

    const showError = (field: FieldName) =>
        (submitted || touched[field] ? clientErrors[field] : undefined) ??
        errors[field] ??
        (field === 'images'
            ? imageProblem ||
              errors.images ||
              Object.entries(errors).find(([key]) => key.startsWith('images.'))?.[1]
            : undefined);

    const touch = (field: FieldName) =>
        setTouched((current) => ({ ...current, [field]: true }));

    const clearServerError = (field: FieldName) =>
        setErrors((current) => {
            if (!(field in current)) {
                return current;
            }

            const { [field]: _removed, ...rest } = current;

            return rest;
        });

    // ---- images ----
    const addImages = (incoming: File[]) => {
        const accepted: File[] = [];
        let problem = '';

        for (const file of incoming) {
            if (!IMAGE_TYPES.includes(file.type)) {
                problem = `“${file.name}” is not a JPG, PNG or WebP image.`;
            } else if (file.size > LIMITS.imageMb * 1024 * 1024) {
                problem = `“${file.name}” is larger than ${LIMITS.imageMb} MB.`;
            } else if (existing.length + newImages.length + accepted.length >= LIMITS.images) {
                problem = `A listing can have at most ${LIMITS.images} photos.`;
                break;
            } else {
                accepted.push(file);
            }
        }

        setImageProblem(problem);

        if (accepted.length > 0) {
            setNewImages((current) => [...current, ...accepted]);
            clearServerError('images');
        }
    };

    const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            addImages(Array.from(event.target.files));
        }

        event.target.value = '';
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        addImages(Array.from(event.dataTransfer.files));
    };

    const makeCover = (index: number) =>
        setNewImages((current) => [
            current[index],
            ...current.filter((_, i) => i !== index),
        ]);

    // ---- submit ----
    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        setSubmitted(true);

        const firstInvalid = (
            ['title', 'category_id', 'price', 'quantity', 'description'] as FieldName[]
        ).find((field) => clientErrors[field]);

        if (firstInvalid) {
            document
                .querySelector(`[data-field="${firstInvalid}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            return;
        }

        const form = new FormData();

        form.append('title', title.trim());
        form.append('category_id', String(categoryId));
        form.append('type', type);
        form.append('price', price);
        form.append('quantity', quantity);
        form.append('description', description.trim());

        if (type === 'item' && condition) {
            form.append('condition', condition);
        }

        newImages.forEach((image) => form.append('images[]', image));

        if (mode === 'edit' && initial?.id) {
            form.append('_method', 'PUT');
            removedIds.forEach((id) => form.append('remove_images[]', String(id)));
        }

        router.post(
            mode === 'edit' && initial?.id ? `/listings/${initial.id}` : '/listings',
            form,
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => {
                    setProcessing(true);
                    setErrors({});
                },
                onFinish: () => setProcessing(false),
                onError: (serverSide) => {
                    setErrors(serverSide as Record<string, string>);

                    const first = Object.keys(serverSide)[0]?.split('.')[0];

                    document
                        .querySelector(`[data-field="${first}"]`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                },
            },
        );
    };

    const quantityNumber = Number(quantity) || 1;
    const stockLabel = type === 'item' ? 'Stock available' : 'Slots available';
    const coverSrc = existing[0]
        ? `/storage/${existing[0].path}`
        : previewUrls[0];
    const categoryName = categories.find((c) => c.id === categoryId)?.name;

    return (
        <div className="mx-auto max-w-6xl">
            <Link
                href={mode === 'edit' && initial?.id ? `/listings/${initial.id}` : '/marketplace'}
                className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-700 transition hover:text-brand-700"
            >
                <ArrowLeft size={18} />
                {mode === 'edit' ? 'Back to listing' : 'Back to marketplace'}
            </Link>

            <div className="mb-7">
                <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">
                    {mode === 'edit' ? 'Edit your listing' : 'Sell something'}
                </h1>
                <p className="mt-2 max-w-2xl text-ink-600">
                    {mode === 'edit'
                        ? 'Update the details buyers see. Changes go live as soon as you save.'
                        : 'Post an item or a service for other ACC students. Good photos and an honest description sell faster.'}
                </p>
            </div>

            {banner}

            <form
                onSubmit={submit}
                noValidate
                className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]"
            >
                <div className="space-y-6">
                    <Section
                        step={1}
                        title="What are you offering?"
                        description="Pick the type and tell buyers what it is."
                    >
                        <div role="group" aria-label="Listing type" className="grid grid-cols-2 gap-3">
                            {(
                                [
                                    ['item', 'Item', 'Something physical to sell', Package],
                                    ['service', 'Service', 'Tutoring, design, repairs…', Briefcase],
                                ] as const
                            ).map(([value, label, hint, Icon]) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={type === value}
                                    onClick={() => setType(value)}
                                    className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                                        type === value
                                            ? 'border-brand-700 bg-brand-50'
                                            : 'border-sand-200 bg-white hover:border-brand-200'
                                    }`}
                                >
                                    <span
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                            type === value
                                                ? 'bg-brand-700 text-white'
                                                : 'bg-sand-100 text-ink-600'
                                        }`}
                                    >
                                        <Icon size={22} />
                                    </span>
                                    <span>
                                        <span className="block text-base font-bold text-ink-900">
                                            {label}
                                        </span>
                                        <span className="block text-sm text-ink-600">{hint}</span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        <Field
                            id="title"
                            label="Title"
                            counter={`${title.length}/${LIMITS.title.max}`}
                            error={showError('title')}
                        >
                            <input
                                id="title"
                                type="text"
                                value={title}
                                maxLength={LIMITS.title.max}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    clearServerError('title');
                                }}
                                onBlur={() => touch('title')}
                                aria-invalid={Boolean(showError('title'))}
                                aria-describedby={showError('title') ? 'title-error' : undefined}
                                placeholder="e.g. Casio fx-991ES scientific calculator"
                                className={`${inputClass(Boolean(showError('title')))} h-12 px-4`}
                            />
                        </Field>

                        <Field id="category_id" label="Category" error={showError('category_id')}>
                            <select
                                id="category_id"
                                value={categoryId}
                                onChange={(e) => {
                                    setCategoryId(e.target.value ? Number(e.target.value) : '');
                                    clearServerError('category_id');
                                }}
                                onBlur={() => touch('category_id')}
                                aria-invalid={Boolean(showError('category_id'))}
                                className={`${inputClass(Boolean(showError('category_id')))} h-12 px-4`}
                            >
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        {type === 'item' && (
                            <div>
                                <p className="mb-1.5 text-sm font-bold text-ink-900">
                                    Condition{' '}
                                    <span className="font-medium text-ink-600">(optional)</span>
                                </p>
                                <div className="flex flex-wrap gap-2" role="group" aria-label="Condition">
                                    {conditions.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            aria-pressed={condition === option}
                                            onClick={() =>
                                                setCondition(condition === option ? '' : option)
                                            }
                                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                                condition === option
                                                    ? 'border-brand-700 bg-brand-700 text-white'
                                                    : 'border-sand-300 bg-white text-ink-700 hover:border-brand-700'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section
                        step={2}
                        title="Price and quantity"
                        description="How much, and how many are available."
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                id="price"
                                label="Price (each)"
                                error={showError('price')}
                                hint={`₱${LIMITS.price.min} to ₱${LIMITS.price.max.toLocaleString()}`}
                            >
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-ink-700">
                                        ₱
                                    </span>
                                    <input
                                        id="price"
                                        type="text"
                                        inputMode="decimal"
                                        autoComplete="off"
                                        value={price}
                                        onChange={(e) => {
                                            setPrice(cleanPrice(e.target.value));
                                            clearServerError('price');
                                        }}
                                        onBlur={() => touch('price')}
                                        aria-invalid={Boolean(showError('price'))}
                                        aria-describedby={showError('price') ? 'price-error' : undefined}
                                        placeholder="0.00"
                                        className={`${inputClass(Boolean(showError('price')))} h-12 pl-9 pr-4 text-lg font-semibold`}
                                    />
                                </div>
                            </Field>

                            <Field
                                id="quantity"
                                label={stockLabel}
                                error={showError('quantity')}
                                hint={`Whole number, ${LIMITS.quantity.min} to ${LIMITS.quantity.max}`}
                            >
                                <div className="flex">
                                    <button
                                        type="button"
                                        aria-label="Decrease quantity"
                                        onClick={() =>
                                            setQuantity(String(Math.max(LIMITS.quantity.min, quantityNumber - 1)))
                                        }
                                        className="flex h-12 w-12 items-center justify-center rounded-l-xl border border-r-0 border-sand-300 bg-sand-100 text-ink-800 transition hover:bg-brand-50"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <input
                                        id="quantity"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        value={quantity}
                                        onChange={(e) => {
                                            setQuantity(e.target.value.replace(/\D/g, '').slice(0, 3));
                                            clearServerError('quantity');
                                        }}
                                        onBlur={() => touch('quantity')}
                                        aria-invalid={Boolean(showError('quantity'))}
                                        className={`${inputClass(Boolean(showError('quantity')))} h-12 rounded-none px-2 text-center text-lg font-semibold`}
                                    />
                                    <button
                                        type="button"
                                        aria-label="Increase quantity"
                                        onClick={() =>
                                            setQuantity(String(Math.min(LIMITS.quantity.max, quantityNumber + 1)))
                                        }
                                        className="flex h-12 w-12 items-center justify-center rounded-r-xl border border-l-0 border-sand-300 bg-sand-100 text-ink-800 transition hover:bg-brand-50"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </Field>
                        </div>

                        {mode === 'edit' && (
                            <p className="rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-700">
                                This is how many are still available. Units in
                                pending or confirmed orders are already set aside.
                            </p>
                        )}
                    </Section>

                    <Section
                        step={3}
                        title="Description"
                        description="What is it, how has it been used, and where can buyers meet you?"
                    >
                        <Field
                            id="description"
                            label="Details"
                            counter={`${description.length}/${LIMITS.description.max}`}
                            error={showError('description')}
                        >
                            <textarea
                                id="description"
                                rows={7}
                                value={description}
                                maxLength={LIMITS.description.max}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    clearServerError('description');
                                }}
                                onBlur={() => touch('description')}
                                aria-invalid={Boolean(showError('description'))}
                                aria-describedby={showError('description') ? 'description-error' : undefined}
                                placeholder="Brand, size, how long you used it, any flaws, and a good place on campus to meet."
                                className={`${inputClass(Boolean(showError('description')))} resize-y px-4 py-3 leading-6`}
                            />
                        </Field>
                    </Section>

                    <Section
                        step={4}
                        title="Photos"
                        description={`Up to ${LIMITS.images} photos (JPG, PNG or WebP, ${LIMITS.imageMb} MB each). The first one is the cover.`}
                    >
                        <div data-field="images">
                            <input
                                ref={fileInput}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="hidden"
                                onChange={onFileChange}
                                tabIndex={-1}
                            />

                            <button
                                type="button"
                                onClick={() => fileInput.current?.click()}
                                disabled={imageCount >= LIMITS.images}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={onDrop}
                                className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                    dragging
                                        ? 'border-coral-600 bg-coral-50'
                                        : 'border-sand-300 bg-sand-100/60 hover:border-brand-700 hover:bg-brand-50'
                                }`}
                            >
                                <ImagePlus size={30} className="text-brand-700" />
                                <span className="text-base font-bold text-ink-900">
                                    Drag photos here or click to browse
                                </span>
                                <span className="text-sm text-ink-600">
                                    {imageCount}/{LIMITS.images} added
                                </span>
                            </button>

                            {showError('images') && (
                                <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-700">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    {showError('images')}
                                </p>
                            )}

                            {imageCount > 0 && (
                                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                                    {existing.map((image, index) => (
                                        <li
                                            key={`old-${image.id}`}
                                            className="group relative aspect-square overflow-hidden rounded-xl bg-sand-100 ring-1 ring-black/10"
                                        >
                                            <img
                                                src={`/storage/${image.path}`}
                                                alt={`Current photo ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                            {index === 0 && (
                                                <span className="absolute left-2 top-2 rounded-full bg-brand-700 px-2 py-0.5 text-xs font-bold text-white">
                                                    Cover
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setRemovedIds((c) => [...c, image.id])}
                                                aria-label={`Remove photo ${index + 1}`}
                                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/80 text-white transition hover:bg-coral-600"
                                            >
                                                <X size={16} />
                                            </button>
                                        </li>
                                    ))}

                                    {newImages.map((file, index) => {
                                        const isCover = existing.length === 0 && index === 0;

                                        return (
                                            <li
                                                key={`${file.name}-${file.size}-${index}`}
                                                className="group relative aspect-square overflow-hidden rounded-xl bg-sand-100 ring-1 ring-black/10"
                                            >
                                                <img
                                                    src={previewUrls[index]}
                                                    alt={`New photo ${index + 1}`}
                                                    className="h-full w-full object-cover"
                                                />
                                                {isCover ? (
                                                    <span className="absolute left-2 top-2 rounded-full bg-brand-700 px-2 py-0.5 text-xs font-bold text-white">
                                                        Cover
                                                    </span>
                                                ) : (
                                                    existing.length === 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => makeCover(index)}
                                                            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-bold text-ink-800 opacity-0 shadow transition focus:opacity-100 group-hover:opacity-100"
                                                        >
                                                            <Star size={12} /> Make cover
                                                        </button>
                                                    )
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setNewImages((c) => c.filter((_, i) => i !== index))
                                                    }
                                                    aria-label={`Remove new photo ${index + 1}`}
                                                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/80 text-white transition hover:bg-coral-600"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </Section>

                    <div className="flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
                        <Link
                            href={mode === 'edit' && initial?.id ? `/listings/${initial.id}` : '/marketplace'}
                            className="rounded-xl px-5 py-3 text-center text-sm font-bold text-ink-700 transition hover:bg-sand-100"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-coral-600 px-8 py-3.5 text-base font-extrabold text-white shadow-[0_10px_24px_rgba(201,81,44,0.28)] transition hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing
                                ? mode === 'edit'
                                    ? 'Saving…'
                                    : 'Publishing…'
                                : mode === 'edit'
                                  ? 'Save changes'
                                  : 'Publish listing'}
                        </button>
                    </div>
                </div>

                {/* Live preview + tips */}
                <aside className="space-y-5 lg:sticky lg:top-24">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-600">
                            Preview
                        </p>

                        <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm">
                            <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-50 to-sand-100">
                                {coverSrc ? (
                                    <img src={coverSrc} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 text-brand-700/60">
                                        <Package size={44} strokeWidth={1.4} />
                                        <span className="text-xs font-semibold">Your cover photo</span>
                                    </div>
                                )}
                                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-brand-800 shadow-sm">
                                    {type === 'item' ? 'Item' : 'Service'}
                                </span>
                                {type === 'item' && quantityNumber > 0 && quantityNumber <= 3 && (
                                    <span className="absolute bottom-3 left-3 rounded-full bg-coral-600 px-3 py-1 text-xs font-bold text-white">
                                        Only {quantityNumber} left
                                    </span>
                                )}
                            </div>
                            <div className="p-4">
                                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                                    {categoryName ?? 'Category'}
                                </p>
                                <p className="mt-1.5 line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-ink-900">
                                    {title.trim() || 'Your title appears here'}
                                </p>
                                <p className="mt-2 text-xs font-medium text-ink-500">No ratings yet</p>
                                <p className="mt-2 text-xl font-extrabold text-brand-800">
                                    {price && !Number.isNaN(Number(price))
                                        ? formatPrice(price)
                                        : '₱0.00'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-coral-100 bg-coral-50 p-5">
                        <p className="flex items-center gap-2 text-sm font-extrabold text-ink-900">
                            <Lightbulb size={18} className="text-coral-700" />
                            Tips for a quick sale
                        </p>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
                            <li>• Use bright, natural light and show any flaws.</li>
                            <li>• Say how long you have used it.</li>
                            <li>• Suggest a public meet-up spot on campus.</li>
                            <li>• Reply quickly. Fast sellers get better reviews.</li>
                        </ul>
                    </div>
                </aside>
            </form>
        </div>
    );
}
