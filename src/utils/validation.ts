/**
 * Input validation utilities
 * Requirements: 3.3 - Validate 32-character alphanumeric API key format
 * Requirements: 3.4 - Mask API key showing only last 4 characters
 */

/**
 * Validates ImgBB API key format
 * Valid format: 32 character alphanumeric string
 * @param apiKey - The API key to validate
 * @returns true if valid, false otherwise
 */
export function validateApiKey(apiKey: string): boolean {
    if (typeof apiKey !== 'string') {
        return false;
    }
    // ImgBB API keys are 32 character alphanumeric
    const apiKeyPattern = /^[a-zA-Z0-9]{32}$/;
    return apiKeyPattern.test(apiKey);
}

/**
 * Masks an API key for display, showing only the last 4 characters
 * @param apiKey - The API key to mask
 * @returns Masked API key string (e.g., "****************************abcd")
 */
export function maskApiKey(apiKey: string): string {
    if (typeof apiKey !== 'string' || apiKey.length === 0) {
        return '';
    }

    if (apiKey.length <= 4) {
        return apiKey;
    }

    const visiblePart = apiKey.slice(-4);
    const maskedLength = apiKey.length - 4;
    const maskedPart = '*'.repeat(maskedLength);

    return maskedPart + visiblePart;
}
