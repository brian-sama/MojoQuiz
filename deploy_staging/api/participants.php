<?php
/**
 * Participants API Endpoint
 * Handles participant management and leaderboard
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
        if ($path === 'leaderboard') {
            getLeaderboard();
        } else {
            getParticipants();
        }
        break;
    case 'POST':
        if ($path === 'remove') {
            removeParticipant();
        }
        break;
    default:
        errorResponse('Method not allowed', 405);
}

// Get all participants for a session
function getParticipants()
{
    $sessionId = sanitize($_GET['session_id'] ?? '');
    if (!$sessionId)
        errorResponse('Session ID required');

    $participants = db()->fetchAll(
        "SELECT id, nickname, total_score, correct_answers, total_answers, streak, best_streak, avatar_color, status 
         FROM participants WHERE session_id = ? ORDER BY total_score DESC",
        [$sessionId]
    );

    jsonResponse($participants);
}

// Get leaderboard
function getLeaderboard()
{
    $sessionId = sanitize($_GET['session_id'] ?? '');
    $limit = (int) ($_GET['limit'] ?? 10);
    if (!$sessionId)
        errorResponse('Session ID required');

    $participants = db()->fetchAll(
        "SELECT id, nickname, total_score, correct_answers, streak, avatar_color 
         FROM participants 
         WHERE session_id = ? AND status = 'active' 
         ORDER BY total_score DESC, correct_answers DESC 
         LIMIT ?",
        [$sessionId, $limit]
    );

    jsonResponse($participants);
}

// Remove participant from session
function removeParticipant()
{
    $data = getJsonBody();
    $participantId = sanitize($data['participant_id'] ?? '');
    if (!$participantId)
        errorResponse('Participant ID required');

    $participant = db()->fetchOne(
        "SELECT session_id, nickname FROM participants WHERE id = ?",
        [$participantId]
    );

    if (!$participant)
        errorResponse('Participant not found', 404);

    db()->query("UPDATE participants SET status = 'removed' WHERE id = ?", [$participantId]);

    db()->query(
        "UPDATE sessions SET participant_count = participant_count - 1 WHERE id = ?",
        [$participant['session_id']]
    );

    pusher()->trigger("session-{$participant['session_id']}", 'participant-removed', [
        'participantId' => $participantId,
        'nickname' => $participant['nickname']
    ]);

    jsonResponse(['success' => true]);
}
