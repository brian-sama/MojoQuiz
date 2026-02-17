<?php
/**
 * Sessions API Endpoint
 * Handles session creation, joining, and management
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/pusher.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'GET':
        if ($path === 'validate') {
            validateSession();
        } elseif ($path === 'details') {
            getSessionDetails();
        } else {
            getSession();
        }
        break;
    case 'POST':
        if ($path === 'join') {
            joinSession();
        } else {
            createSession();
        }
        break;
    case 'PUT':
        updateSession();
        break;
    case 'DELETE':
        endSession();
        break;
    default:
        errorResponse('Method not allowed', 405);
}

// Create a new session
function createSession()
{
    $data = getJsonBody();
    $title = sanitize($data['title'] ?? 'Untitled Session');
    $mode = in_array($data['mode'] ?? '', ['mentimeter', 'kahoot']) ? $data['mode'] : 'mentimeter';

    // Generate unique join code
    $joinCode = generateJoinCode();
    $attempts = 0;
    while ($attempts < 10) {
        $existing = db()->fetchOne("SELECT id FROM sessions WHERE join_code = ?", [$joinCode]);
        if (!$existing)
            break;
        $joinCode = generateJoinCode();
        $attempts++;
    }

    $id = generateUuid();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    db()->query(
        "INSERT INTO sessions (id, title, join_code, status, mode, expires_at) VALUES (?, ?, ?, 'active', ?, ?)",
        [$id, $title, $joinCode, $mode, $expiresAt]
    );

    jsonResponse([
        'id' => $id,
        'title' => $title,
        'join_code' => $joinCode,
        'mode' => $mode,
        'status' => 'active'
    ], 201);
}

// Validate join code
function validateSession()
{
    $code = strtoupper(sanitize($_GET['code'] ?? ''));
    if (strlen($code) !== 6) {
        errorResponse('Invalid code format');
    }

    $session = db()->fetchOne(
        "SELECT id, title, status, mode FROM sessions WHERE join_code = ? AND status IN ('active', 'paused')",
        [$code]
    );

    if (!$session) {
        errorResponse('Session not found', 404);
    }

    jsonResponse($session);
}

// Join a session as participant
function joinSession()
{
    $data = getJsonBody();
    $code = strtoupper(sanitize($data['code'] ?? ''));
    $nickname = sanitize($data['nickname'] ?? '');

    if (strlen($code) !== 6)
        errorResponse('Invalid code');
    if (strlen($nickname) < 2 || strlen($nickname) > 20)
        errorResponse('Nickname must be 2-20 characters');
    if (containsProfanity($nickname))
        errorResponse('Please choose appropriate nickname');

    $session = db()->fetchOne(
        "SELECT id, title, status, mode FROM sessions WHERE join_code = ? AND status IN ('active', 'paused')",
        [$code]
    );

    if (!$session)
        errorResponse('Session not found', 404);

    // Check for existing participant with same nickname
    $existing = db()->fetchOne(
        "SELECT id FROM participants WHERE session_id = ? AND nickname = ? AND status = 'active'",
        [$session['id'], $nickname]
    );

    if ($existing)
        errorResponse('Nickname already taken');

    // Create participant
    $participantId = generateUuid();
    $token = generateToken();
    $colors = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
    $avatarColor = $colors[array_rand($colors)];

    db()->query(
        "INSERT INTO participants (id, session_id, nickname, participant_token, avatar_color) VALUES (?, ?, ?, ?, ?)",
        [$participantId, $session['id'], $nickname, $token, $avatarColor]
    );

    // Update participant count
    db()->query(
        "UPDATE sessions SET participant_count = participant_count + 1 WHERE id = ?",
        [$session['id']]
    );

    // Notify via Pusher
    $count = db()->fetchOne("SELECT participant_count FROM sessions WHERE id = ?", [$session['id']]);
    pusher()->trigger("session-{$session['id']}", 'participant-joined', [
        'participantId' => $participantId,
        'nickname' => $nickname,
        'avatarColor' => $avatarColor,
        'count' => $count['participant_count']
    ]);

    jsonResponse([
        'participantId' => $participantId,
        'token' => $token,
        'sessionId' => $session['id'],
        'sessionTitle' => $session['title'],
        'mode' => $session['mode']
    ], 201);
}

// Get session details
function getSessionDetails()
{
    $sessionId = sanitize($_GET['id'] ?? '');
    if (!$sessionId)
        errorResponse('Session ID required');

    $session = db()->fetchOne("SELECT * FROM sessions WHERE id = ?", [$sessionId]);
    if (!$session)
        errorResponse('Session not found', 404);

    $questions = db()->fetchAll(
        "SELECT * FROM questions WHERE session_id = ? ORDER BY order_index",
        [$sessionId]
    );

    // Parse JSON fields
    foreach ($questions as &$q) {
        $q['options'] = json_decode($q['options'], true);
        $q['settings'] = json_decode($q['settings'], true);
    }

    $participants = db()->fetchAll(
        "SELECT id, nickname, total_score, avatar_color, status FROM participants WHERE session_id = ? AND status = 'active' ORDER BY total_score DESC",
        [$sessionId]
    );

    jsonResponse([
        'session' => $session,
        'questions' => $questions,
        'participants' => $participants
    ]);
}

// Get single session
function getSession()
{
    $sessionId = sanitize($_GET['id'] ?? '');
    if (!$sessionId)
        errorResponse('Session ID required');

    $session = db()->fetchOne("SELECT * FROM sessions WHERE id = ?", [$sessionId]);
    if (!$session)
        errorResponse('Session not found', 404);

    jsonResponse($session);
}

// Update session
function updateSession()
{
    $data = getJsonBody();
    $sessionId = sanitize($data['id'] ?? '');
    if (!$sessionId)
        errorResponse('Session ID required');

    $updates = [];
    $params = [];

    if (isset($data['status'])) {
        $updates[] = 'status = ?';
        $params[] = $data['status'];
    }
    if (isset($data['current_question_index'])) {
        $updates[] = 'current_question_index = ?';
        $params[] = (int) $data['current_question_index'];
    }
    if (isset($data['mode'])) {
        $updates[] = 'mode = ?';
        $params[] = $data['mode'];
    }

    if (empty($updates))
        errorResponse('No updates provided');

    $params[] = $sessionId;
    db()->query("UPDATE sessions SET " . implode(', ', $updates) . " WHERE id = ?", $params);

    // Notify via Pusher
    pusher()->trigger("session-{$sessionId}", 'session-updated', $data);

    jsonResponse(['success' => true]);
}

// End session
function endSession()
{
    $sessionId = sanitize($_GET['id'] ?? '');
    if (!$sessionId)
        errorResponse('Session ID required');

    db()->query("UPDATE sessions SET status = 'completed' WHERE id = ?", [$sessionId]);
    pusher()->trigger("session-{$sessionId}", 'session-ended', []);

    jsonResponse(['success' => true]);
}
