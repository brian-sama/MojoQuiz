import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger.js';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Validation error',
            details: err.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }

    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log the error
    logger.error({ error: err }, 'Unhandled Error:');

    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
};
