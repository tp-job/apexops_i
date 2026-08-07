import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { mailStatus } from '../lib/mail';

/**
 * Mail status (spec E-D4).
 *
 * One route, and it exists so that "email is not configured" is a state anyone
 * can *observe* rather than infer from messages not arriving. That is the whole
 * difference between this and the ten inert `user_settings` toggles Sprint 5
 * removed: a feature that is honest about being off is not the same as a switch
 * that pretends to be on.
 *
 * Authenticated, like `/api/ai/status`. It reveals nothing sensitive — never
 * credentials, only whether auth is in use — but it describes someone else's
 * infrastructure and has no caller who is not already signed in.
 */
const router = express.Router();

router.get('/status', authenticate, (_req: Request, res: Response) => {
    res.json(mailStatus());
});

export default router;
