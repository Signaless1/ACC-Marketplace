import { FormEvent, useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ImagePlus,
    Save,
    Trash2,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import ListingFormFields, { ListingLimits, validateListing } from '../../components/ui/ListingFormFields';

interface Category {
    id: number;
    name: string;
}

interface ListingImage {
    id: number;
    path: string;
    sort_order: number;
}

interface Listing {
    id: number;
    category_id: number;
    title: string;
    description: string;
    price: string;
    quantity: number;
    type: 'item' | 'service';
    condition: string | null;
    images: ListingImage[];
}

interface Props {
    listing: Listing;
    categories: Category[];
    limits: ListingLimits;
}

export default function Edit({ listing, categories, limits }: Props) {
    const [quantity, setQuantity] = useState(String(listing.quantity));
    const [title, setTitle] = useState(listing.title);
    const [categoryId, setCategoryId] = useState(
        String(listing.category_id)
    );
    const [type, setType] = useState<'item' | 'service'>(
        listing.type
    );
    const [price, setPrice] = useState(listing.price);
    const [condition, setCondition] = useState(
        listing.condition ?? ''
    );
    const [description, setDescription] = useState(
        listing.description
    );

    const [existingImages, setExistingImages] = useState<
        ListingImage[]
    >(listing.images);

    const [removeImageIds, setRemoveImageIds] = useState<number[]>(
        []
    );

    const [newImages, setNewImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const urls = newImages.map((image) =>
            URL.createObjectURL(image)
        );

        setPreviews(urls);

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [newImages]);

    const totalImages =
        existingImages.length + newImages.length;

    const handleImageChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const files = Array.from(event.target.files ?? []);

        const availableSlots = 5 - existingImages.length;

        if (files.length > availableSlots) {
            setError(
                `You can only add ${availableSlots} more image${
                    availableSlots === 1 ? '' : 's'
                }.`
            );

            event.target.value = '';
            return;
        }

        setError('');
        setNewImages(files);
        event.target.value = '';
    };

    const removeExistingImage = (id: number) => {
        setExistingImages((current) =>
            current.filter((image) => image.id !== id)
        );

        setRemoveImageIds((current) => [...current, id]);
    };

    const removeNewImage = (index: number) => {
        setNewImages((current) =>
            current.filter((_, imageIndex) => imageIndex !== index)
        );
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (totalImages > 5) {
            setError('A listing can have a maximum of 5 images.');
            return;
        }

        const problem = validateListing(
            { title, categoryId, type, price, quantity, condition, description },
            limits,
            listing.quantity === 0,
        );

        if (problem) {
            setError(problem);
            return;
        }

        setError('');
        setLoading(true);

        const formData = new FormData();

        formData.append('_method', 'PUT');

        formData.append('category_id', categoryId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('quantity', quantity);
        formData.append('type', type);
        formData.append('condition', condition);

        removeImageIds.forEach((id) => {
            formData.append('remove_images[]', String(id));
        });

        newImages.forEach((image) => {
            formData.append('images[]', image);
        });

        router.post(`/listings/${listing.id}`, formData, {
            forceFormData: true,

            onError: (errors) => {
                setLoading(false);

                const firstError = Object.values(errors)[0];

                if (firstError) {
                    setError(String(firstError));
                } else {
                    setError('Something went wrong.');
                }
            },

            onFinish: () => {
                setLoading(false);
            },
        });
    };

    return (
        <AppLayout>
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <Link
                        href={`/listings/${listing.id}`}
                        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                    >
                        <ArrowLeft size={18} />
                        Back to Listing
                    </Link>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Edit Listing
                    </h1>

                    <p className="mt-2 text-slate-600">
                        Update your listing information and images.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="space-y-8"
                >
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-6 text-lg font-semibold text-slate-900">
                            Listing Information
                        </h2>

                        <ListingFormFields
                            values={{ title, categoryId, type, price, quantity, condition, description }}
                            onChange={(patch) => {
                                if (patch.title !== undefined) setTitle(patch.title);
                                if (patch.categoryId !== undefined) setCategoryId(patch.categoryId);
                                if (patch.type !== undefined) setType(patch.type);
                                if (patch.price !== undefined) setPrice(patch.price);
                                if (patch.quantity !== undefined) setQuantity(patch.quantity);
                                if (patch.condition !== undefined) setCondition(patch.condition);
                                if (patch.description !== undefined) setDescription(patch.description);
                            }}
                            categories={categories}
                            limits={limits}
                            allowZeroQuantity={listing.quantity === 0}
                        />
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Listing Images
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    You can have up to 5 images.
                                </p>
                            </div>

                            <span className="text-sm font-medium text-slate-600">
                                {totalImages}/5
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                            {existingImages.map((image) => (
                                <div
                                    key={image.id}
                                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                                >
                                    <img
                                        src={`/storage/${image.path}`}
                                        alt="Listing"
                                        className="h-full w-full object-cover"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeExistingImage(image.id)
                                        }
                                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}

                            {previews.map((preview, index) => (
                                <div
                                    key={preview}
                                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                                >
                                    <img
                                        src={preview}
                                        alt={`New image ${index + 1}`}
                                        className="h-full w-full object-cover"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeNewImage(index)
                                        }
                                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            ))}

                            {totalImages < 5 && (
                                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700">
                                    <ImagePlus size={28} />

                                    <span className="mt-2 text-xs font-medium">
                                        Add Images
                                    </span>

                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/jpg,image/webp"
                                        multiple
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                    </section>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Link
                            href={`/listings/${listing.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save size={18} />

                            {loading
                                ? 'Saving Changes...'
                                : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}