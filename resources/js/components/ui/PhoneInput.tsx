import FormField, { textInputClass } from './FormField';
import { normalizePhone, phoneError, sanitizePhoneInput } from '../../lib/phone';

interface PhoneInputProps {
    id?: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    /** An error from the server (for example "already registered"). */
    error?: string;
    required?: boolean;
    autoFocus?: boolean;
}

/** +639171234567 -> "+63 917 123 4567" */
const international = (canonical: string) =>
    canonical.replace(/^\+63(\d{3})(\d{3})(\d{4})$/, '+63 $1 $2 $3');

/**
 * A Philippine mobile number field. People can type it any usual way (0917…,
 * +63 917…, 917…); it tells them straight away if it is not a mobile number
 * and shows how it will be saved. The server makes the final decision.
 */
export default function PhoneInput({
    id = 'phone',
    label = 'Mobile number',
    value,
    onChange,
    error,
    required = true,
    autoFocus = false,
}: PhoneInputProps) {
    const canonical = normalizePhone(value);
    // What is typed right now beats an older message from the server.
    const shownError = phoneError(value) ?? error ?? undefined;

    return (
        <FormField
            id={id}
            label={label}
            error={shownError}
            hint={
                canonical
                    ? `We'll save it as ${international(canonical)}. It stays private: other members never see your number.`
                    : 'A Philippine mobile number, like 0917 123 4567. It stays private: other members never see it.'
            }
        >
            <input
                id={id}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus={autoFocus}
                maxLength={20}
                value={value}
                onChange={(event) => onChange(sanitizePhoneInput(event.target.value))}
                placeholder="0917 123 4567"
                aria-invalid={Boolean(shownError)}
                aria-describedby={shownError ? `${id}-error` : undefined}
                className={textInputClass(Boolean(shownError))}
                required={required}
            />
        </FormField>
    );
}
