<?php
/**
 * Responses API Endpoint
 * Handles response submission and retrieval
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/pusher.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getResponses();
        break;
    case 'POST':
        submitResponse();
        break;
    default:
        errorResponse('Method not allowed', 405);
}

// Get responses for a question
function getResponses()
{
    $questionId = sanitize($_GET['question_id'] ?? '');
    if (!$questionId)
        errorResponse('Question ID required');

    $responses = db()->fetchAll(
        "SELECT * FROM responses WHERE question_id = ? ORDER BY created_at DESC",
        [$questionId]
    );

    foreach ($responses as &$r) {
        $r['selected_options'] = json_decode($r['selected_options'], true);
        $r['word_responses'] = json_decode($r['word_responses'], true);
    }

    // Get word cloud aggregation
    $wordCloud = db()->fetchAll(
        "SELECT word, count FROM word_submissions WHERE question_id = ? ORDER BY count DESC",
        [$questionId]
    );

    jsonResponse([
        'responses' => $responses,
        'wordCloud' => $wordCloud,
        'total' => count($responses)
    ]);
}

// Submit a response
function submitResponse()
{
    $data = getJsonBody();

    $sessionId = sanitize($data['session_id'] ?? '');
    $questionId = sanitize($data['question_id'] ?? '');
    $participantId = sanitize($data['participant_id'] ?? '');
    $token = sanitize($data['token'] ?? '');

    if (!$sessionId || !$questionId || !$participantId) {
        errorResponse('Missing required fields');
    }

    // Verify participant
    $participant = db()->fetchOne(
        "SELECT * FROM participants WHERE id = ? AND participant_token = ? AND status = 'active'",
        [$participantId, $token]
    );

    if (!$participant) {
        errorResponse('Invalid participant', 401);
    }

    // Check question status
    $question = db()->fetchOne(
        "SELECT * FROM questions WHERE id = ? AND status = 'active'",
        [$questionId]
    );

    if (!$question) {
        errorResponse('Question not accepting responses', 400);
    }

    // Check for existing response
    $existing = db()->fetchOne(
        "SELECT id FROM responses WHERE question_id = ? AND participant_id = ?",
        [$questionId, $participantId]
    );

    if ($existing) {
        errorResponse('Already submitted response');
    }

    $answerType = sanitize($data['answer_type'] ?? 'choice');
    $responseId = generateUuid();
    $isCorrect = null;
    $pointsEarned = 0;
    $responseTimeMs = (int) ($data['response_time_ms'] ?? 0);

    // Process based on answer type
    $selectedOptions = null;
    $textResponse = null;
    $wordResponses = null;
    $scaleValue = null;

    switch ($answerType) {
        case 'choice':
            $selectedOptions = json_encode($data['selected_options'] ?? []);
            $options = json_decode($question['options'], true) ?? [];

            // Check if correct (for quiz)
            if (in_array($question['type'], ['quiz_mc', 'quiz_tf'])) {
                $correctOptions = array_filter($options, fn($o) => $o['is_correct'] ?? false);
                $correctIds = array_column($correctOptions, 'id');
                $selectedIds = $data['selected_options'] ?? [];
                $isCorrect = count($correctIds) === count($selectedIds) &&
                    empty(array_diff($correctIds, $selectedIds));

                if ($isCorrect) {
                    $settings = json_decode($question['settings'], true) ?? [];
                    $maxTime = ($settings['time_limit'] ?? 30) * 1000;
                    $pointsEarned = calculateScore(true, $responseTimeMs, $maxTime);
                }
            }
            break;

        case 'text':
            $textResponse = sanitize($data['text_response'] ?? '');
            if (containsProfanity($textResponse)) {
                errorResponse('Please use appropriate language');
            }
            break;

        case 'word_cloud':
            $words = $data['word_responses'] ?? [];
            $cleanWords = [];
            foreach ($words as $word) {
                $clean = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $word)));
                if ($clean && strlen($clean) >= 2 && !containsProfanity($clean)) {
                    $cleanWords[] = $clean;
                }
            }
            $wordResponses = json_encode($cleanWords);

            // Update word aggregation
            foreach ($cleanWords as $word) {
                db()->query(
                    "INSERT INTO word_submissions (id, session_id, question_id, word, count) 
                     VALUES (?, ?, ?, ?, 1)
                     ON DUPLICATE KEY UPDATE count = count + 1",
                    [generateUuid(), $sessionId, $questionId, $word]
                );
            }
            break;

        case 'scale':
            $scaleValue = (int) ($data['scale_value'] ?? 0);
            break;
    }

    // Insert response
    db()->query(
        "INSERT INTO responses (id, session_id, question_id, participant_id, participant_nickname, 
         answer_type, selected_options, text_response, word_responses, scale_value, 
         is_correct, points_earned, response_time_ms) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            $responseId,
            $sessionId,
            $questionId,
            $participantId,
            $participant['nickname'],
            $answerType,
            $selectedOptions,
            $textResponse,
            $wordResponses,
            $scaleValue,
            $isCorrect,
            $pointsEarned,
            $responseTimeMs
        ]
    );

    // Update response count
    db()->query("UPDATE questions SET response_count = response_count + 1 WHERE id = ?", [$questionId]);

    // Update participant score
    if ($pointsEarned > 0) {
        db()->query(
            "UPDATE participants SET total_score = total_score + ?, correct_answers = correct_answers + 1, 
             total_answers = total_answers + 1, streak = streak + 1, 
             best_streak = GREATEST(best_streak, streak + 1) WHERE id = ?",
            [$pointsEarned, $participantId]
        );
    } elseif ($isCorrect === false) {
        db()->query(
            "UPDATE participants SET total_answers = total_answers + 1, streak = 0 WHERE id = ?",
            [$participantId]
        );
    } else {
        db()->query(
            "UPDATE participants SET total_answers = total_answers + 1 WHERE id = ?",
            [$participantId]
        );
    }

    // Get updated question response count
    $updatedQuestion = db()->fetchOne("SELECT response_count FROM questions WHERE id = ?", [$questionId]);

    // Notify presenter via Pusher
    $responseData = [
        'questionId' => $questionId,
        'participantId' => $participantId,
        'nickname' => $participant['nickname'],
        'answerType' => $answerType,
        'responseCount' => $updatedQuestion['response_count']
    ];

    if ($answerType === 'choice') {
        $responseData['selectedOptions'] = $data['selected_options'] ?? [];
    } elseif ($answerType === 'word_cloud') {
        $responseData['words'] = $cleanWords ?? [];
        // Get updated word cloud
        $wordCloud = db()->fetchAll(
            "SELECT word, count FROM word_submissions WHERE question_id = ? ORDER BY count DESC LIMIT 50",
            [$questionId]
        );
        $responseData['wordCloud'] = $wordCloud;
    } elseif ($answerType === 'scale') {
        $responseData['scaleValue'] = $scaleValue;
    }

    pusher()->trigger("session-{$sessionId}", 'response-received', $responseData);

    jsonResponse([
        'success' => true,
        'responseId' => $responseId,
        'isCorrect' => $isCorrect,
        'pointsEarned' => $pointsEarned
    ], 201);
}
