<?php

namespace App\Http\Requests;

use App\Models\Listing;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Ownership is enforced by ListingPolicy in the controller.
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'title' => is_string($this->title)
                ? trim(preg_replace('/\s+/u', ' ', $this->title))
                : $this->title,
            'description' => is_string($this->description)
                ? trim(str_replace("\r\n", "\n", $this->description))
                : $this->description,
            // Services have no "condition".
            'condition' => $this->input('type') === 'service'
                ? null
                : $this->input('condition'),
        ]);
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH')
            || $this->input('_method') === 'put';

        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'title' => ['required', 'string', 'min:3', 'max:100'],
            'description' => ['required', 'string', 'min:10', 'max:3000'],
            'price' => [
                'required',
                'numeric',
                'decimal:0,2',
                'min:0',
                'max:'.Listing::MAX_PRICE,
            ],
            // On edit a seller may set stock to 0 to mark it as out of stock.
            'quantity' => [
                'required',
                'integer',
                'min:'.($isUpdate ? 0 : 1),
                'max:'.Listing::MAX_QUANTITY,
            ],
            'type' => ['required', Rule::in(Listing::TYPES)],
            'condition' => ['nullable', 'string', Rule::in(Listing::CONDITIONS)],

            'remove_images' => ['nullable', 'array'],
            'remove_images.*' => ['integer', 'exists:listing_images,id'],

            'images' => ['nullable', 'array', 'max:'.Listing::MAX_IMAGES],
            'images.*' => [
                'image',
                'mimes:jpeg,png,jpg,webp',
                'max:5120',
                'dimensions:max_width=10000,max_height=10000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'title.min' => 'The title must be at least 3 characters.',
            'title.max' => 'The title must be 100 characters or fewer.',
            'description.min' => 'Please describe your listing in at least 10 characters.',
            'description.max' => 'The description must be 3,000 characters or fewer.',
            'price.max' => 'The price cannot be more than ₱999,999.99.',
            'price.decimal' => 'The price can have at most 2 decimal places.',
            'price.numeric' => 'Enter the price as a number.',
            'quantity.integer' => 'Quantity must be a whole number.',
            'quantity.min' => 'Quantity must be at least 1.',
            'quantity.max' => 'You can list at most '.Listing::MAX_QUANTITY.' units at a time.',
            'images.max' => 'You can upload up to '.Listing::MAX_IMAGES.' photos.',
            'images.*.image' => 'Each photo must be an image.',
            'images.*.mimes' => 'Photos must be JPG, PNG or WEBP.',
            'images.*.max' => 'Each photo must be 5 MB or smaller.',
            'images.*.uploaded' => 'A photo could not be uploaded. It may be larger than the server allows.',
        ];
    }
}
