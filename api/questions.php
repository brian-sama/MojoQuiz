<?php
/**
 * Questions API Endpoint
 * Handles question CRUD and status changes
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
        getQuestions();
        break;
    case 'POST':
        if ($path === 'activate') {
            activateQuestion();
        } elseif ($path === 'lock') {
            lockQuestion();
        } elseif ($path === 'reveal') {
            revealResults();
        } else {
            createQuestion();
        }
        break;
    case 'PUT':
        updateQuestion();
        break;
    case 'DELETE':
        deleteQuestion();
        break;
    default:
        errorResponse('Method not allowed', 405);
}

// Get all questions for a session
function getQuestions()
{
    $sessionId = sanitize($_GET['session_id'] ?? '');
    if (!$sessionId)
        errorResponse('Session ID required');

    $questions = db()->fetchAll(
        "SELECT * FROM questions WHERE session_id = ? ORDER BY order_index",
        [$sessionId]
    );

    foreach ($questions as &$q) {
        $q['options'] = json_decode($q['options'], true);
        $q['settings'] = json_decode($q['settings'], true);
    }

    jsonResponse($questions);
}

// Create a new question
function createQuestion()
{
    $data = getJsonBody();
    $sessionId = sanitize($data['session_id'] ?? '');
    $type = sanitize($data['type'] ?? 'poll');
    $title = sanitize($data['title'] ?? '');

    if (!$sessionId)
        errorResponse('Session ID required');
    if (!$title)
        errorResponse('Question title required');

    // Get next order index
    $result = db()->fetchOne(
        "SELECT COALESCE(MAX(order_index), -1) + 1 as next_index FROM questions WHERE session_id = ?",
        [$sessionId]
    );
    $orderIndex = $result['next_index'];

    $id = generateUuid();
    $options = isset($data['options']) ? json_encode($data['options']) : null;
    $settings = isset($data['settings']) ? json_encode($data['settings']) : json_encode([
        'time_limit' => 30,
        'allow_multiple' => false,
        'min_value' => 1,
        'max_value' => 5
    ]);

    db()->query(
        "INSERT INTO questions (id, session_id, type, title, description, options, settings, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [$id, $sessionId, $type, $title, $data['description'] ?? '', $options, $settings, $orderIndex]
    );

    $question = db()->fetchOne("SELECT * FROM questions WHERE id = ?", [$id]);
    $question['options'] = json_decode($question['options'], true);
    $question['settings'] = json_decode($question['settings'], true);

    // Notify presenter
    pusher()->trigger("session-{$sessionId}", 'question-added', $question);

    jsonResponse($question, 201);
}

// Activate a question (make it live)
function activateQuestion()
{
    $data = getJsonBody();
    $questionId = sanitize($data['question_id'] ?? '');
    if (!$questionId)
        errorResponse('Question ID required');

    $question = db()->fetchOne("SELECT * FROM questions WHERE id = ?", [$questionId]);
    if (!$question)
        errorResponse('Question not found', 404);

    // Reset any previously active questions
    db()->query(
        "UPDATE questions SET status = 'completed' WHERE session_id = ? AND status IN ('active', 'locked')",
        [$question['session_id']]
    );

    // Activate this question
    db()->query(
        "UPDATE questions SET status = 'active', started_at = NOW(), response_count = 0 WHERE id = ?",
        [$questionId]
    );

    $question['status'] = 'active';
    $question['started_at'] = date('Y-m-d H:i:s');
    $question['options'] = json_decode($question['options'], true);
    $question['settings'] = json_decode($question['settings'], true);

    // Notify all participants
    pusher()->trigger("session-{$question['session_id']}", 'question-activated', [
        'question' => $question,
        'startedAt' => time() * 1000
    ]);

    jsonResponse(['success' => true, 'question' => $question]);
}

// Lock voting on a question
function lockQuestion()
{
    $data = getJsonBody();
    $questionId = sanitize($data['question_id'] ?? '');
    if (!$questionId)
        errorResponse('Question ID required');

    $question = db()->fetchOne("SELECT session_id FROM questions WHERE id = ?", [$questionId]);
    if (!$question)
        errorResponse('Question not found', 404);

    db()->query("UPDATE questions SET status = 'locked' WHERE id = ?", [$questionId]);

    pusher()->trigger("session-{$question['session_id']}", 'voting-locked', [
        'questionId' => $questionId
    ]);

    jsonResponse(['success' => true]);
}

// Reveal results
function revealResults()
{
    $data = getJsonBody();
    $questionId = sanitize($data['question_id'] ?? '');
    if (!$questionId)
        errorResponse('Question ID required');

    $question = db()->fetchOne("SELECT * FROM questions WHERE id = ?", [$questionId]);
    if (!$question)
        errorResponse('Question not found', 404);

    db()->query("UPDATE questions SET status = 'revealed' WHERE id = ?", [$questionId]);

    // Get responses
    $responses = db()->fetchAll(
        "SELECT * FROM responses WHERE question_id = ?",
        [$questionId]
    );

    foreach ($responses as &$r) {
        $r['selected_options'] = json_decode($r['selected_options'], true);
        $r['word_responses'] = json_decode($r['word_responses'], true);
    }

    // Get word cloud data if applicable
    $wordCloud = [];
    if ($question['type'] === 'word_cloud') {
        $wordCloud = db()->fetchAll(
            "SELECT word, count FROM word_submissions WHERE question_id = ? ORDER BY count DESC",
            [$questionId]
        );
    }

    pusher()->trigger("session-{$question['session_id']}", 'results-revealed', [
        'questionId' => $questionId,
        'responses' => $responses,
        'wordCloud' => $wordCloud
    ]);

    jsonResponse(['success' => true, 'responses' => $responses, 'wordCloud' => $wordCloud]);
}

// Update question
function updateQuestion()
{
    $data = getJsonBody();
    $questionId = sanitize($data['id'] ?? '');
    if (!$questionId)
        errorResponse('Question ID required');

    $updates = [];
    $params = [];

    if (isset($data['title'])) {
        $updates[] = 'title = ?';
        $params[] = sanitize($data['title']);
    }
    if (isset($data['options'])) {
        $updates[] = 'options = ?';
        $params[] = json_encode($data['options']);
    }
    if (isset($data['settings'])) {
        $updates[] = 'settings = ?';
        $params[] = json_encode($data['settings']);
    }
    if (isset($data['status'])) {
        $updates[] = 'status = ?';
        $params[] = $data['status'];
    }

    if (empty($updates))
        errorResponse('No updates provided');

    $params[] = $questionId;
    db()->query("UPDATE questions SET " . implode(', ', $updates) . " WHERE id = ?", $params);

    jsonResponse(['success' => true]);
}

// Delete question
function deleteQuestion()
{
    $questionId = sanitize($_GET['id'] ?? '');
    if (!$questionId)
        errorResponse('Question ID required');

    db()->query("DELETE FROM questions WHERE id = ?", [$questionId]);
    jsonResponse(['success' => true]);
}
