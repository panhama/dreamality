/**
 * Security utilities for file upload validation and input sanitization
 */

export interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: RegExp;
}

export const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowedExtensions: /\.(jpg|jpeg|png|webp)$/i
};

/**
 * Validates file type, size, and content
 */
export async function validateFile(
  file: File,
  options: FileValidationOptions = DEFAULT_FILE_OPTIONS
): Promise<{ isValid: boolean; error?: string }> {
  // Size validation
  if (file.size > options.maxSize) {
    return {
      isValid: false,
      error: `File ${file.name} is too large. Maximum size is ${Math.round(options.maxSize / (1024 * 1024))}MB.`
    };
  }

  // Type validation
  if (!options.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File ${file.name} has invalid type. Only ${options.allowedTypes.join(', ')} are allowed.`
    };
  }

  // Extension validation
  if (!options.allowedExtensions.test(file.name.toLowerCase())) {
    return {
      isValid: false,
      error: `File ${file.name} has invalid extension.`
    };
  }

  // Content validation
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length < 4) {
      return { isValid: false, error: `File ${file.name} appears to be corrupted or too small.` };
    }

    // Check magic bytes
    const magicBytes = buffer.subarray(0, 4);
    const isValidImage = (
      // JPEG
      (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) ||
      // PNG
      (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47) ||
      // WebP
      (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46)
    );

    if (!isValidImage) {
      return { isValid: false, error: `File ${file.name} is not a valid image file.` };
    }

  } catch {
    return { isValid: false, error: `Failed to validate file ${file.name}.` };
  }

  return { isValid: true };
}

/**
 * Sanitizes text input by removing potentially harmful characters
 */
export function sanitizeTextInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';

  // Remove null bytes and other control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Rate limiting helper (basic implementation)
 * In production, use Redis or similar for distributed rate limiting
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}
