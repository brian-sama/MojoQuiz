/**
 * Socket.IO Event Handler
 * Handles all real-time WebSocket events
 */

import { Server, Socket } from 'socket.io';
import db from '../services/database.js';
import {
    sanitizeNickname,
    normalizeWord,
    calculateQuizScore,
    fuzzyMatch,
} from '../utils/helpers.js';
import { shouldFilterWord, containsProfanity } from '../utils/profanityFilter.js';
import { ErrorCodes } from '../types/index.js';

interface SocketData {
    sessionId: string;
    participantId: string;
    cookieId: string;
    nickname?: string;
    isPresenter: boolean;
}

/**
 * Initialize Socket.IO handlers
 */
export function initializeSocketHandlers(io: Server): void {
    io.on('connection', (socket: Socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Store socket data
        const socketData: SocketData = {
            sessionId: '',
            participantId: '',
            cookieId: '',
            isPresenter: false,
        };

        // ============================================
        // JOIN EVENTS
        // ============================================

        /**
         * Participant joins a session
         */
        socket.on('join_session', async (payload: {
            join_code: string;
            cookie_id: string;
            nickname?: string;
        }) => {
            try {
                const { join_code, cookie_id, nickname } = payload;

                // Validate session
                const session = await db.getSessionByCode(join_code.toUpperCase());
                if (!session) {
                    socket.emit('error', {
                        code: ErrorCodes.SESSION_NOT_FOUND,
                        message: 'Session not found or has ended',
                    });
                    return;
                }

                if (session.status !== 'active') {
                    socket.emit('error', {
                        code: ErrorCodes.SESSION_ENDED,
                        message: 'Session has ended',
                    });
                    return;
                }

                // Sanitize and filter nickname
                let cleanNickname = nickname ? sanitizeNickname(nickname) : undefined;
                if (cleanNickname && containsProfanity(cleanNickname)) {
                    socket.emit('error', {
                        code: ErrorCodes.PROFANITY_DETECTED,
                        message: 'Please choose a different nickname',
                    });
                    return;
                }

                // Get or create participant
                const participant = await db.getOrCreateParticipant(
                    session.id,
                    cookie_id,
                    socket.id,
                    cleanNickname
                );

                // Check if participant was removed by presenter
                if (participant.is_removed) {
                    socket.emit('error', {
                        code: ErrorCodes.PARTICIPANT_REMOVED,
                        message: 'You have been removed from this session',
                    });
                    return;
                }

                // Store data on socket
                socketData.sessionId = session.id;
                socketData.participantId = participant.id;
                socketData.cookieId = cookie_id;
                socketData.nickname = cleanNickname;
                socketData.isPresenter = false;

                // Join session room
                socket.join(`session:${session.id}`);

                // Get active question if any
                const activeQuestion = await db.getActiveQuestion(session.id);

                // Get participant count
                const participantCount = await db.getConnectedParticipantCount(session.id);

                // Send confirmation to participant
                socket.emit('session_joined', {
                    session_id: session.id,
                    session_title: session.title,
                    participant_id: participant.id,
                    active_question: activeQuestion,
                    participant_count: participantCount,
                });

                // Broadcast to room that someone joined
                socket.to(`session:${session.id}`).emit('participant_joined', {
                    participant_id: participant.id,
                    nickname: cleanNickname,
                    participant_count: participantCount,
                });

                console.log(`Participant ${participant.id} joined session ${session.id}`);

            } catch (error) {
                console.error('Error joining session:', error);
                socket.emit('error', {
                    code: 'JOIN_ERROR',
                    message: 'Failed to join session',
                });
            }
        });

        /**
         * Presenter joins a session
         */
        socket.on('presenter_join', async (payload: {
            session_id: string;
            presenter_id: string;
        }) => {
            try {
                const { session_id, presenter_id } = payload;

                const session = await db.getSessionById(session_id);
                if (!session) {
                    socket.emit('error', {
                        code: ErrorCodes.SESSION_NOT_FOUND,
                        message: 'Session not found',
                    });
                    return;
                }

                // Verify presenter (simple check - in production use proper auth)
                if (session.presenter_id !== presenter_id) {
                    socket.emit('error', {
                        code: 'UNAUTHORIZED',
                        message: 'Not authorized as presenter',
                    });
                    return;
                }

                socketData.sessionId = session_id;
                socketData.isPresenter = true;

                // Join session room and presenter room
                socket.join(`session:${session_id}`);
                socket.join(`presenter:${session_id}`);

                const participantCount = await db.getConnectedParticipantCount(session_id);
                const questions = await db.getQuestionsBySession(session_id);
                const activeQuestion = await db.getActiveQuestion(session_id);

                socket.emit('presenter_joined', {
                    session,
                    questions,
                    active_question: activeQuestion,
                    participant_count: participantCount,
                });

                console.log(`Presenter joined session ${session_id}`);

            } catch (error) {
                console.error('Error presenter join:', error);
                socket.emit('error', { code: 'JOIN_ERROR', message: 'Failed to join' });
            }
        });

        // ============================================
        // RESPONSE EVENTS
        // ============================================

        /**
         * Submit a response (poll, scale, quiz)
         */
        socket.on('submit_response', async (payload: {
            question_id: string;
            response_data: any;
        }) => {
            try {
                const { question_id, response_data } = payload;

                if (!socketData.participantId) {
                    socket.emit('error', { code: ErrorCodes.INVALID_SESSION, message: 'Not in a session' });
                    return;
                }

                const question = await db.getQuestionById(question_id);
                if (!question) {
                    socket.emit('error', { code: 'QUESTION_NOT_FOUND', message: 'Question not found' });
                    return;
                }

                if (question.is_locked) {
                    socket.emit('error', { code: ErrorCodes.QUESTION_LOCKED, message: 'Voting is closed' });
                    return;
                }

                // Calculate score for quiz questions
                let isCorrect: boolean | undefined;
                let score = 0;
                let responseTimeMs: number | undefined;

                if (question.question_type.startsWith('quiz_')) {
                    responseTimeMs = response_data.response_time_ms;
                    const timeLimitMs = (question.time_limit || 30) * 1000;

                    // Determine correctness based on question type
                    switch (question.question_type) {
                        case 'quiz_mc':
                        case 'quiz_tf':
                            isCorrect = response_data.option_index === question.correct_answer;
                            break;
                        case 'quiz_typed':
                            isCorrect = fuzzyMatch(
                                response_data.answer,
                                question.correct_answer,
                                question.settings?.tolerance || 0.8
                            );
                            break;
                        case 'quiz_slider':
                            const tolerance = question.settings?.tolerance || 5;
                            isCorrect = Math.abs(response_data.value - question.correct_answer) <= tolerance;
                            break;
                        case 'quiz_order':
                            isCorrect = JSON.stringify(response_data.order) === JSON.stringify(question.correct_answer);
                            break;
                    }

                    score = calculateQuizScore(isCorrect || false, responseTimeMs || timeLimitMs, timeLimitMs);
                }

                // Submit response
                const result = await db.submitResponse(
                    question_id,
                    socketData.participantId,
                    socketData.sessionId,
                    response_data,
                    isCorrect,
                    score,
                    responseTimeMs
                );

                if (result.isDuplicate) {
                    socket.emit('error', {
                        code: ErrorCodes.DUPLICATE_RESPONSE,
                        message: 'You have already responded to this question',
                    });
                    return;
                }

                // Send confirmation
                socket.emit('response_submitted', {
                    success: true,
                    question_id,
                    is_correct: isCorrect,
                    score,
                });

                // Broadcast updated count to room
                const responseCount = await db.getResponseCount(question_id);
                socket.to(`session:${socketData.sessionId}`).emit('response_count_updated', {
                    question_id,
                    response_count: responseCount,
                });

                // Send updated results to presenter
                let results: any;

                switch (question.question_type) {
                    case 'poll':
                    case 'quiz_mc':
                    case 'quiz_tf':
                        results = await db.getPollResults(question_id);
                        break;
                    case 'scale':
                        results = await db.getScaleStatistics(question_id);
                        break;
                    case 'ranking':
                        results = await db.getRankingResults(question_id);
                        break;
                    case 'pin_image':
                        results = await db.getPinImageResults(question_id);
                        break;
                    case 'nps':
                        results = await db.getNpsResults(question_id);
                        break;
                    case 'quiz_slider':
                        results = await db.getScaleStatistics(question_id);
                        break;
                    default:
                        results = await db.getPollResults(question_id);
                }

                io.to(`presenter:${socketData.sessionId}`).emit('results_updated', {
                    question_id,
                    response_count: responseCount,
                    results,
                });

            } catch (error) {
                console.error('Error submitting response:', error);
                socket.emit('error', { code: 'SUBMIT_ERROR', message: 'Failed to submit response' });
            }
        });

        /**
         * Submit words for word cloud
         */
        socket.on('submit_words', async (payload: {
            question_id: string;
            words: string[];
        }) => {
            try {
                const { question_id, words } = payload;

                if (!socketData.participantId) {
                    socket.emit('error', { code: ErrorCodes.INVALID_SESSION, message: 'Not in a session' });
                    return;
                }

                const question = await db.getQuestionById(question_id);
                if (!question || question.is_locked) {
                    socket.emit('error', { code: ErrorCodes.QUESTION_LOCKED, message: 'Submissions closed' });
                    return;
                }

                // Process and filter words
                const maxWords = question.settings?.max_words || 5;
                const processedWords = words
                    .slice(0, maxWords)
                    .map(word => ({
                        original: word.substring(0, 50),
                        normalized: normalizeWord(word),
                        filtered: shouldFilterWord(word),
                    }))
                    .filter(w => w.normalized.length >= 2);

                await db.submitWords(question_id, socketData.participantId, processedWords);

                socket.emit('words_submitted', { success: true, question_id });

                // Send updated word cloud to presenter
                const wordCloud = await db.getWordCloudData(question_id);
                const responseCount = await db.getResponseCount(question_id);
                io.to(`presenter:${socketData.sessionId}`).emit('word_cloud_updated', {
                    question_id,
                    words: wordCloud,
                    response_count: responseCount,
                });

            } catch (error) {
                console.error('Error submitting words:', error);
                socket.emit('error', { code: 'SUBMIT_ERROR', message: 'Failed to submit words' });
            }
        });

        /**
         * Submit text response (open-ended)
         */
        socket.on('submit_text', async (payload: {
            question_id: string;
            content: string;
        }) => {
            try {
                const { question_id, content } = payload;

                if (!socketData.participantId) {
                    socket.emit('error', { code: ErrorCodes.INVALID_SESSION, message: 'Not in a session' });
                    return;
                }

                const question = await db.getQuestionById(question_id);
                if (!question || question.is_locked) {
                    socket.emit('error', { code: ErrorCodes.QUESTION_LOCKED, message: 'Submissions closed' });
                    return;
                }

                // Check for profanity (but still allow - will be moderated)
                const cleanContent = content.substring(0, 500).trim();

                const result = await db.submitTextResponse(question_id, socketData.participantId, cleanContent);

                if (result.isDuplicate) {
                    socket.emit('error', {
                        code: ErrorCodes.DUPLICATE_RESPONSE,
                        message: 'You have already submitted a response',
                    });
                    return;
                }

                socket.emit('text_submitted', { success: true, question_id });

                // Notify presenter of new pending response
                const responseCount = await db.getResponseCount(question_id);
                io.to(`presenter:${socketData.sessionId}`).emit('text_response_received', {
                    question_id,
                    response: result.response,
                    response_count: responseCount,
                });

            } catch (error) {
                console.error('Error submitting text:', error);
                socket.emit('error', { code: 'SUBMIT_ERROR', message: 'Failed to submit text' });
            }
        });

        // ============================================
        // PRESENTER CONTROL EVENTS
        // ============================================

        /**
         * Activate a question
         */
        socket.on('activate_question', async (payload: { question_id: string }) => {
            try {
                if (!socketData.isPresenter) {
                    socket.emit('error', { code: 'UNAUTHORIZED', message: 'Not a presenter' });
                    return;
                }

                const { question_id } = payload;

                await db.activateQuestion(socketData.sessionId, question_id);

                const question = await db.getQuestionById(question_id);
                const responseCount = await db.getResponseCount(question_id);

                // Broadcast to all participants
                io.to(`session:${socketData.sessionId}`).emit('question_activated', {
                    question,
                    response_count: responseCount,
                    server_time: new Date(),
                });

            } catch (error) {
                console.error('Error activating question:', error);
                socket.emit('error', { code: 'ACTIVATE_ERROR', message: 'Failed to activate' });
            }
        });

        /**
         * Lock/unlock voting
         */
        socket.on('lock_question', async (payload: { question_id: string; locked: boolean }) => {
            try {
                if (!socketData.isPresenter) return;

                const { question_id, locked } = payload;

                if (locked) {
                    await db.lockQuestion(question_id);
                } else {
                    await db.unlockQuestion(question_id);
                }

                io.to(`session:${socketData.sessionId}`).emit('question_locked', {
                    question_id,
                    is_locked: locked,
                });

            } catch (error) {
                console.error('Error locking question:', error);
            }
        });

        /**
         * Show results
         */
        socket.on('show_results', async (payload: { question_id: string }) => {
            try {
                if (!socketData.isPresenter) return;

                const { question_id } = payload;

                await db.showResults(question_id);

                const question = await db.getQuestionById(question_id);
                let results: any;

                switch (question?.question_type) {
                    case 'poll':
                    case 'quiz_mc':
                    case 'quiz_tf':
                        results = await db.getPollResults(question_id);
                        break;
                    case 'scale':
                        results = await db.getScaleStatistics(question_id);
                        break;
                    case 'word_cloud':
                        results = await db.getWordCloudData(question_id);
                        break;
                    case 'open_ended':
                        results = await db.getTextResponses(question_id, 'approved');
                        break;
                    case 'nps':
                        results = await db.getNpsResults(question_id);
                        break;
                    case 'brainstorm':
                        results = await db.getBrainstormIdeas(question_id);
                        break;
                    case 'ranking':
                        results = await db.getRankingResults(question_id);
                        break;
                    case 'pin_image':
                        results = await db.getPinImageResults(question_id);
                        break;
                    case 'quiz_slider':
                        results = await db.getScaleStatistics(question_id);
                        break;
                }

                io.to(`session:${socketData.sessionId}`).emit('results_revealed', {
                    question_id,
                    results,
                    correct_answer: question?.correct_answer,
                });

                // Update leaderboard for quiz questions
                if (question?.question_type.startsWith('quiz_')) {
                    const leaderboard = await db.getLeaderboard(socketData.sessionId);
                    io.to(`session:${socketData.sessionId}`).emit('leaderboard_updated', {
                        leaderboard,
                    });
                }

            } catch (error) {
                console.error('Error showing results:', error);
            }
        });

        /**
         * Remove a participant
         */
        socket.on('remove_participant', async (payload: { participant_id: string }) => {
            try {
                if (!socketData.isPresenter) return;

                const { participant_id } = payload;

                await db.removeParticipant(participant_id);

                io.to(`session:${socketData.sessionId}`).emit('participant_removed', {
                    participant_id,
                });

            } catch (error) {
                console.error('Error removing participant:', error);
            }
        });

        /**
         * End session
         */
        socket.on('end_session', async () => {
            try {
                if (!socketData.isPresenter) return;

                await db.updateSessionStatus(socketData.sessionId, 'ended');

                io.to(`session:${socketData.sessionId}`).emit('session_ended', {
                    message: 'The session has ended',
                });

            } catch (error) {
                console.error('Error ending session:', error);
            }
        });

        // ============================================
        // BRAINSTORM EVENTS
        // ============================================

        /**
         * Submit an idea for brainstorming
         */
        socket.on('submit_idea', async (payload: {
            question_id: string;
            content: string;
        }) => {
            try {
                const { question_id, content } = payload;

                if (!socketData.participantId) {
                    socket.emit('error', { code: ErrorCodes.INVALID_SESSION, message: 'Not in a session' });
                    return;
                }

                const question = await db.getQuestionById(question_id);
                if (!question || question.is_locked) {
                    socket.emit('error', { code: ErrorCodes.QUESTION_LOCKED, message: 'Submissions closed' });
                    return;
                }

                const cleanContent = content.substring(0, 280).trim();
                if (!cleanContent) return;

                const result = await db.submitIdea(question_id, socketData.participantId, cleanContent);

                if (!result.success) {
                    socket.emit('error', { code: 'MAX_IDEAS', message: 'Maximum ideas reached' });
                    return;
                }

                socket.emit('idea_submitted', { success: true, idea: result.idea });

                // Broadcast updated ideas to everyone in the session
                const ideas = await db.getBrainstormIdeas(question_id);
                io.to(`session:${socketData.sessionId}`).emit('ideas_updated', {
                    question_id,
                    ideas,
                });

            } catch (error) {
                console.error('Error submitting idea:', error);
                socket.emit('error', { code: 'SUBMIT_ERROR', message: 'Failed to submit idea' });
            }
        });

        /**
         * Vote/unvote an idea in brainstorming
         */
        socket.on('vote_idea', async (payload: { idea_id: string }) => {
            try {
                if (!socketData.participantId) {
                    socket.emit('error', { code: ErrorCodes.INVALID_SESSION, message: 'Not in a session' });
                    return;
                }

                const { idea_id } = payload;
                const result = await db.voteIdea(idea_id, socketData.participantId);

                socket.emit('vote_toggled', { idea_id, action: result.action });

                // Get parent question for room broadcast
                // We need to find the question_id from the idea
                // Small optimization: we broadcast all ideas
                io.to(`session:${socketData.sessionId}`).emit('vote_updated', {
                    idea_id,
                    action: result.action,
                });

            } catch (error) {
                console.error('Error voting on idea:', error);
                socket.emit('error', { code: 'VOTE_ERROR', message: 'Failed to vote' });
            }
        });

        // ============================================
        // DISCONNECT
        // ============================================

        socket.on('disconnect', async () => {
            console.log(`Socket disconnected: ${socket.id}`);

            try {
                const participant = await db.disconnectParticipant(socket.id);

                if (participant && socketData.sessionId) {
                    const participantCount = await db.getConnectedParticipantCount(socketData.sessionId);

                    io.to(`session:${socketData.sessionId}`).emit('participant_left', {
                        participant_id: participant.id,
                        participant_count: participantCount,
                    });
                }
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
    });
}

export default initializeSocketHandlers;
