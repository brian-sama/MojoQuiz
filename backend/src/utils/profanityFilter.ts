/**
 * Profanity Filter
 * Filters inappropriate words from user submissions
 */

// Common profanity words (add more as needed)
const PROFANITY_LIST = new Set([
    // Add actual profanity words here in production
    'badword1',
    'badword2',
    // This is a placeholder list - use a proper library in production
]);

// Leet speak substitutions
const LEET_MAP: { [key: string]: string } = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '@': 'a',
    '$': 's',
};

/**
 * Normalize text for profanity checking
 * - Lowercase
 * - Replace leet speak
 * - Remove non-alphabetic characters
 */
function normalizeForFilter(text: string): string {
    let normalized = text.toLowerCase();

    // Replace leet speak
    for (const [leet, letter] of Object.entries(LEET_MAP)) {
        normalized = normalized.replace(new RegExp(leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), letter);
    }

    // Remove non-alphabetic characters
    normalized = normalized.replace(/[^a-z]/g, '');

    return normalized;
}

/**
 * Calculate Levenshtein distance for bypass detection
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Check if a word is similar to any profanity
 */
function isSimilarToProfanity(word: string, threshold: number = 1): boolean {
    const normalized = normalizeForFilter(word);

    // Skip very short words
    if (normalized.length < 3) return false;

    for (const profanity of PROFANITY_LIST) {
        // Direct match
        if (normalized === profanity) return true;

        // Contains match
        if (normalized.includes(profanity)) return true;

        // Fuzzy match (allow 1 character difference for words > 4 chars)
        if (profanity.length > 4 && normalized.length > 4) {
            const distance = levenshteinDistance(normalized, profanity);
            if (distance <= threshold) return true;
        }
    }

    return false;
}

/**
 * Filter a single word
 * Returns true if the word should be filtered (blocked)
 */
export function shouldFilterWord(word: string): boolean {
    if (!word || word.length < 2) return false;
    return isSimilarToProfanity(word);
}

/**
 * Filter a text string
 * Returns true if any profanity is detected
 */
export function containsProfanity(text: string): boolean {
    const words = text.split(/\s+/);
    return words.some(word => shouldFilterWord(word));
}

/**
 * Clean text by replacing profanity with asterisks
 */
export function cleanText(text: string): string {
    const words = text.split(/\s+/);
    return words.map(word => {
        if (shouldFilterWord(word)) {
            return '*'.repeat(word.length);
        }
        return word;
    }).join(' ');
}

/**
 * Filter an array of words, returning filtered status for each
 */
export function filterWords(words: string[]): { word: string; filtered: boolean }[] {
    return words.map(word => ({
        word,
        filtered: shouldFilterWord(word),
    }));
}

export default {
    shouldFilterWord,
    containsProfanity,
    cleanText,
    filterWords,
};
