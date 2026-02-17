<?php
/**
 * Helper Functions
 */

// Generate UUID v4
function generateUuid()
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff)
    );
}

// Generate 6-character join code
function generateJoinCode()
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 6; $i++) {
        $code .= $chars[mt_rand(0, strlen($chars) - 1)];
    }
    return $code;
}

// Generate participant token
function generateToken()
{
    return bin2hex(random_bytes(32));
}

// Sanitize input
function sanitize($input)
{
    if (is_string($input)) {
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
    return $input;
}

// JSON response
function jsonResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Error response
function errorResponse($message, $statusCode = 400)
{
    jsonResponse(['error' => $message], $statusCode);
}

// Get JSON body
function getJsonBody()
{
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?? [];
}

// CORS headers
function setCorsHeaders()
{
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// Simple profanity filter
function containsProfanity($text)
{
    $badWords = ['fuck', 'shit', 'ass', 'bitch', 'damn', 'crap'];
    $textLower = strtolower($text);
    foreach ($badWords as $word) {
        if (strpos($textLower, $word) !== false) {
            return true;
        }
    }
    return false;
}

// Option colors
function getOptionColors()
{
    return ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];
}

// Calculate quiz score
function calculateScore($isCorrect, $responseTimeMs, $maxTime = 30000)
{
    if (!$isCorrect)
        return 0;
    $basePoints = 1000;
    $timeBonus = max(0, 1 - ($responseTimeMs / $maxTime)) * 500;
    return (int) round($basePoints + $timeBonus);
}
