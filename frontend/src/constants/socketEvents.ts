export const SOCKET_EVENTS = {
    PRESENTER_JOIN: 'presenter_join',
    PRESENTER_JOINED: 'presenter_joined',
    SESSION_JOINED: 'session_joined',
    SESSION_STARTED: 'session_started',
    SESSION_ENDED: 'session_ended',
    QUESTION_ADDED: 'question_added',
    QUESTION_ACTIVATED: 'question_activated',
    QUESTION_LOCKED: 'question_locked',
    RESULTS_REVEALED: 'results_revealed',
    RESULTS_UPDATED: 'results_updated',
    WORD_CLOUD_UPDATED: 'word_cloud_updated',
    TEXT_RESPONSE_RECEIVED: 'text_response_received',
    LEADERBOARD_UPDATED: 'leaderboard_updated',
    PARTICIPANT_JOINED: 'participant_joined',
    PARTICIPANT_LEFT: 'participant_left',
    PARTICIPANT_REMOVED: 'participant_removed',
    END_SESSION: 'end_session',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
