export const SocketEvents = {
    PRESENTER_JOIN: 'presenter_join',
    SESSION_STARTED: 'session_started',
    SESSION_ENDED: 'session_ended',
    QUESTION_ADDED: 'question_added',
    PARTICIPANT_JOINED: 'participant_joined',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
