/**
 * Helper utilities for the Engagement Platform
 */

import { customAlphabet } from 'nanoid';

// ============================================
// JOIN CODE GENERATION
// ============================================

// Exclude ambiguous characters: 0, O, I, 1, L
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateCode = customAlphabet(ALPHABET, 6);

/**
 * Generate a unique 6-character join code
 */
export function generateJoinCode(): string {
    return generateCode();
}

/**
 * Validate join code format
 */
export function isValidJoinCode(code: string): boolean {
    if (!code || code.length !== 6) return false;
    return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(code.toUpperCase());
}

// ============================================
// PARTICIPANT COOKIE
// ============================================

export const PARTICIPANT_COOKIE_NAME = 'participant_id';
const COOKIE_ID_LENGTH = 32;
const cookieAlphabet = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', COOKIE_ID_LENGTH);

/**
 * Generate a participant cookie ID
 */
export function generateParticipantCookie(): string {
    return `participant_${cookieAlphabet()}`;
}

/**
 * Get or create participant cookie from request
 */
export function getOrCreateParticipantCookie(existingCookie?: string): string {
    if (existingCookie && existingCookie.startsWith('participant_')) {
        return existingCookie;
    }
    return generateParticipantCookie();
}

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize user input string
 */
export function sanitizeInput(input: string, maxLength: number = 255): string {
    if (!input) return '';
    return input
        .trim()
        .replace(/<[^>]*>/g, '')  // Remove HTML tags
        .replace(/[<>]/g, '')     // Remove angle brackets
        .substring(0, maxLength);
}

/**
 * Sanitize nickname
 */
export function sanitizeNickname(nickname: string): string {
    return sanitizeInput(nickname, 50)
        .replace(/[^\w\s\-_.]/g, '') // Only allow alphanumeric, spaces, hyphens, underscores, dots
        .trim();
}

// ============================================
// WORD NORMALIZATION
// ============================================

/**
 * Normalize a word for word cloud aggregation
 */
export function normalizeWord(word: string): string {
    return word
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .substring(0, 50);       // Limit length
}

// ============================================
// SCORING
// ============================================

/**
 * Calculate quiz score based on correctness and response time
 * - Base score: 1000 points for correct answer
 * - Time bonus: up to 500 extra points for fast answers
 */
export function calculateQuizScore(
    isCorrect: boolean,
    responseTimeMs: number,
    timeLimitMs: number
): number {
    if (!isCorrect) return 0;

    const BASE_SCORE = 1000;
    const MAX_TIME_BONUS = 500;

    // Calculate time bonus (more time left = more bonus)
    const timeRatio = Math.max(0, 1 - responseTimeMs / timeLimitMs);
    const timeBonus = Math.round(timeRatio * MAX_TIME_BONUS);

    return BASE_SCORE + timeBonus;
}

/**
 * Calculate fuzzy match score for typed answers
 * Returns value 0-1 where 1 is exact match
 */
export function fuzzyMatch(answer: string, correctAnswer: string, tolerance: number = 0.8): boolean {
    const a = answer.toLowerCase().trim();
    const c = correctAnswer.toLowerCase().trim();

    if (a === c) return true;

    // Calculate Levenshtein distance ratio
    const distance = levenshteinDistance(a, c);
    const maxLength = Math.max(a.length, c.length);
    const similarity = 1 - distance / maxLength;

    return similarity >= tolerance;
}

/**
 * Calculate Levenshtein distance between two strings
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
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// ============================================
// RANDOM COLORS
// ============================================

const AVATAR_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
];

/**
 * Get a random avatar color
 */
export function getRandomAvatarColor(): string {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ============================================
// DATE/TIME UTILITIES
// ============================================

/**
 * Get expiration date (default 24 hours from now)
 */
export function getExpirationDate(hoursFromNow: number = 24): Date {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    return date;
}
