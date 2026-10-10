import { ReactNode } from 'react';

export interface ListingLimits {
    title: { min: number; max: number };
    description: { min: number; max: number };
    price: { min: number; max: number };
    quantity: { min: number; max: number };
}

export interface ListingFormValues {
    title: string;
    categoryId: string;
    type: 'item' | 'service';
    price: string;
    quantity: string;
    condition: string;
    description: string;
}

interface Props {
    values: ListingFormValues;
    onChange: (patch: Partial<ListingFormValues>) => void;
    categories: { id: number; name: string }[];
    limits: ListingLimits;
    /** Allow quantity 0 (a sold-out listing being edited). */
    allowZeroQuantity?: boolean;
}

export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];

const input =
    'w-full rounded-xl border border-[#cfdcd4] bg-white px-4 py-3 text-sm text-[#12291f] outline-none transition focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/15';

/** Returns the first problem with the form, or null when it looks fine. */
export function validateListing(v: ListingFormValues, l: ListingLimits, allowZero = false): string | null {
    const title = v.title.trim();
    const description = v.description.trim();
    const price = Number(v.price);
    const quantity = Number(v.quantity);

    if (title.length < l.title.min) return `Title needs at least ${l.title.min} characters.`;
    if (title.length > l.title.max) return `Title can be at most ${l.title.max} characters.`;
    if (!v.categoryId) return 'Please choose a category.';
    if (v.price === '' || Number.isNaN(price)) return 'Enter a price.';
    if (price < l.price.min) return `Price must be at least ₱${l.price.min}.`;
    if (price > l.price.max) return `Price can be at most ₱${l.price.max.toLocaleString()}.`;
    if (!/^\d+(\.\d{1,2})?$/.test(v.price)) return 'Price can have at most 2 decimal places.';
    if (!/^\d+$/.test(v.quantity)) return 'Quantity must be a whole number.';
    if (quantity < (allowZero ? 0 : l.quantity.min)) return `Quantity must be at least ${l.quantity.min}.`;
    if (quantity > l.quantity.max) return `Quantity can be at most ${l.quantity.max}.`;
    if (description.length < l.description.min) return `Description needs at least ${l.description.min} characters.`;
    if (description.length > l.description.max) return `Description can be at most ${l.description.max} characters.`;

    return null;
}

function Field({
    label,
    htmlFor,
    hint,
    children,
}: {
    label: string;
    htmlFor: string;
    hint?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-[#2f4a3d]">
                {label}
            </label>
            {children}
            {hint && <div className="mt-1.5 text-xs text-[#566860]">{hint}</div>}
        </div>
    );
}

// Blocks characters a number input accepts but the server rejects (e, +, -).
const blockBadKeys = (event: React.KeyboardEvent<HTMLInputElement>, allowDot: boolean) => {
    if (['e', 'E', '+', '-'].includes(event.key) || (!allowDot && event.key === '.')) {
        event.preventDefault();
    }
};

export default function ListingFormFields({ values, onChange, categories, limits, allowZeroQuantity }: Props) {
    const titleLen = values.title.length;
    const descLen = values.description.length;

    return (
        <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
                <Field
                    label="Listing title"
                    htmlFor="title"
                    hint={
                        <span className="flex justify-between">
                            <span>Be specific: brand, model, size.</span>
                            <span className={titleLen > limits.title.max ? 'font-bold text-red-600' : ''}>
                                {titleLen}/{limits.title.max}
                            </span>
                        </span>
                    }
                >
                    <input
                        id="title"
                        type="text"
                        value={values.title}
                        maxLength={limits.title.max}
                        onChange={(e) => onChange({ title: e.target.value })}
                        placeholder="e.g. Casio FX-991EX Scientific Calculator"
                        className={input}
                        required
                    />
                </Field>
            </div>

            <Field label="Category" htmlFor="category">
                <select
                    id="category"
                    value={values.categoryId}
                    onChange={(e) => onChange({ categoryId: e.target.value })}
                    className={input}
                    required
                >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Listing type" htmlFor="type">
                <select
                    id="type"
                    value={values.type}
                    onChange={(e) => onChange({ type: e.target.value as 'item' | 'service' })}
                    className={input}
                >
                    <option value="item">Item (something you sell)</option>
                    <option value="service">Service (something you do)</option>
                </select>
            </Field>

            <Field
                label={values.type === 'item' ? 'Price per unit' : 'Price per session'}
                htmlFor="price"
                hint={`₱${limits.price.min} to ₱${limits.price.max.toLocaleString()}, up to 2 decimals.`}
            >
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#43554c]">₱</span>
                    <input
                        id="price"
                        type="number"
                        inputMode="decimal"
                        min={limits.price.min}
                        max={limits.price.max}
                        step="0.01"
                        value={values.price}
                        onKeyDown={(e) => blockBadKeys(e, true)}
                        onChange={(e) => onChange({ price: e.target.value })}
                        placeholder="0.00"
                        className={`${input} pl-9`}
                        required
                    />
                </div>
            </Field>

            <Field
                label={values.type === 'item' ? 'Quantity available' : 'Slots available'}
                htmlFor="quantity"
                hint={`Whole number, ${allowZeroQuantity ? 0 : limits.quantity.min} to ${limits.quantity.max}.`}
            >
                <div className="flex items-center overflow-hidden rounded-xl border border-[#cfdcd4] bg-white focus-within:border-[#176B4D] focus-within:ring-2 focus-within:ring-[#176B4D]/15">
                    <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                            onChange({
                                quantity: String(
                                    Math.max(allowZeroQuantity ? 0 : limits.quantity.min, (Number(values.quantity) || 0) - 1),
                                ),
                            })
                        }
                        className="h-12 w-12 text-lg font-bold text-[#34483e] hover:bg-[#EAF4EF]"
                    >
                        −
                    </button>
                    <input
                        id="quantity"
                        type="number"
                        inputMode="numeric"
                        min={allowZeroQuantity ? 0 : limits.quantity.min}
                        max={limits.quantity.max}
                        step={1}
                        value={values.quantity}
                        onKeyDown={(e) => blockBadKeys(e, false)}
                        onChange={(e) => onChange({ quantity: e.target.value })}
                        className="h-12 min-w-0 flex-1 bg-transparent text-center text-sm font-bold text-[#12291f] outline-none"
                        required
                    />
                    <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                            onChange({
                                quantity: String(Math.min(limits.quantity.max, (Number(values.quantity) || 0) + 1)),
                            })
                        }
                        className="h-12 w-12 text-lg font-bold text-[#34483e] hover:bg-[#EAF4EF]"
                    >
                        +
                    </button>
                </div>
            </Field>

            <Field label="Condition" htmlFor="condition">
                <select
                    id="condition"
                    value={values.condition}
                    onChange={(e) => onChange({ condition: e.target.value })}
                    className={input}
                >
                    <option value="">Not specified</option>
                    {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </Field>

            <div className="md:col-span-2">
                <Field
                    label="Description"
                    htmlFor="description"
                    hint={
                        <span className="flex justify-between">
                            <span>Mention any flaws and where you can meet.</span>
                            <span className={descLen > limits.description.max ? 'font-bold text-red-600' : ''}>
                                {descLen}/{limits.description.max}
                            </span>
                        </span>
                    }
                >
                    <textarea
                        id="description"
                        value={values.description}
                        maxLength={limits.description.max}
                        onChange={(e) => onChange({ description: e.target.value })}
                        placeholder="Describe the item or service…"
                        rows={6}
                        className={`${input} resize-y`}
                        required
                    />
                </Field>
            </div>
        </div>
    );
}
