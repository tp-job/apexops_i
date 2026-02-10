// api/auth.js - Authentication API
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const pool = getPool();

const SECRET_KEY = process.env.JWT_SECRET || 'mySecretKey';
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET || 'myRefreshSecretKey';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Generate access token
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role || 'user'
        },
        SECRET_KEY,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        REFRESH_SECRET_KEY,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, name } = req.body;

        // Support both formats: {firstName, lastName} or {name}
        let first = firstName;
        let last = lastName;
        
        if (!first && name) {
            first = name.split(' ')[0] || name;
            last = name.split(' ').slice(1).join(' ') || '';
        }

        // Validation
        if (!first || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, email, password)
             VALUES ($1, $2, $3, $4)
             RETURNING id, first_name, last_name, email, role, created_at`,
            [first, last || '', email, hashedPassword]
        );

        const user = result.rows[0];

        // Create default user settings
        await pool.query(
            `INSERT INTO user_settings (user_id) VALUES ($1)`,
            [user.id]
        ).catch(err => {
            console.warn('Could not create user settings:', err.message);
        });

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        ).catch(err => {
            console.warn('Could not store refresh token:', err.message);
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken,
            token: accessToken // For backward compatibility
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: err.message || 'Failed to register user' });
    }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const result = await pool.query(
            `SELECT id, first_name, last_name, email, password, role, is_active
             FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Check if user is active
        if (user.is_active === false) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Verify password
        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        ).catch(err => {
            console.warn('Could not store refresh token:', err.message);
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken,
            token: accessToken // For backward compatibility
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message || 'Failed to login' });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET_KEY);

        // Check if token exists in database
        const tokenResult = await pool.query(
            'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
            [refreshToken]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Get user
        const userResult = await pool.query(
            'SELECT id, first_name, last_name, email, role FROM users WHERE id = $1',
            [decoded.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Generate new access token
        const accessToken = generateAccessToken(user);

        res.json({
            accessToken,
            token: accessToken, // For backward compatibility
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
        console.error('Refresh token error:', err);
        res.status(500).json({ error: err.message || 'Failed to refresh token' });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        }

        res.json({ message: 'Logout successful' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: err.message || 'Failed to logout' });
    }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, first_name, last_name, email, phone, company, position,
                    location, timezone, bio, avatar_url, role, gender, birth_date, 
                    language, is_active, email_verified, created_at, updated_at
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Get user settings
        const settingsResult = await pool.query(
            'SELECT * FROM user_settings WHERE user_id = $1',
            [req.user.id]
        ).catch(() => ({ rows: [] }));

        // Map settings to camelCase
        const settingsRow = settingsResult.rows[0];
        const settings = settingsRow ? {
            emailNotifications: settingsRow.email_notifications,
            pushNotifications: settingsRow.push_notifications,
            bugAlerts: settingsRow.bug_alerts,
            weeklyReports: settingsRow.weekly_reports,
            teamUpdates: settingsRow.team_updates,
            twoFactorAuth: settingsRow.two_factor_auth,
            sessionTimeout: settingsRow.session_timeout,
            loginAlerts: settingsRow.login_alerts,
            profileVisibility: settingsRow.profile_visibility,
            activityStatus: settingsRow.activity_status,
            dataCollection: settingsRow.data_collection
        } : null;

        res.json({
            message: 'Welcome!',
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                phone: user.phone,
                company: user.company,
                position: user.position,
                location: user.location,
                timezone: user.timezone,
                bio: user.bio,
                avatarUrl: user.avatar_url,
                role: user.role,
                gender: user.gender,
                birthDate: user.birth_date,
                language: user.language,
                isActive: user.is_active,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            },
            settings
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: err.message || 'Failed to get profile' });
    }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
    try {
        const {
            firstName, lastName, email, phone, company,
            position, location, timezone, bio, gender, birthDate, language
        } = req.body;

        // Check if email is being changed and if it's already taken
        if (email) {
            const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, req.user.id]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Update user
        const result = await pool.query(
            `UPDATE users
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 email = COALESCE($3, email),
                 phone = COALESCE($4, phone),
                 company = COALESCE($5, company),
                 position = COALESCE($6, position),
                 location = COALESCE($7, location),
                 timezone = COALESCE($8, timezone),
                 bio = COALESCE($9, bio),
                 gender = COALESCE($10, gender),
                 birth_date = COALESCE($11, birth_date),
                 language = COALESCE($12, language),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $13
             RETURNING id, first_name, last_name, email, phone, company,
                       position, location, timezone, bio, avatar_url, role, 
                       gender, birth_date, language, updated_at`,
            [firstName, lastName, email, phone, company, position, location, timezone, bio, gender, birthDate, language, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                phone: user.phone,
                company: user.company,
                position: user.position,
                location: user.location,
                timezone: user.timezone,
                bio: user.bio,
                avatarUrl: user.avatar_url,
                role: user.role,
                gender: user.gender,
                birthDate: user.birth_date,
                language: user.language,
                updatedAt: user.updated_at
            }
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: err.message || 'Failed to update profile' });
    }
});

/**
 * PUT /api/auth/settings
 * Update user settings
 */
router.put('/settings', authenticate, async (req, res) => {
    try {
        const {
            emailNotifications, pushNotifications, bugAlerts,
            weeklyReports, teamUpdates, twoFactorAuth,
            sessionTimeout, loginAlerts, profileVisibility,
            activityStatus, dataCollection
        } = req.body;

        // Check if settings exist
        const existing = await pool.query(
            'SELECT id FROM user_settings WHERE user_id = $1',
            [req.user.id]
        );

        if (existing.rows.length === 0) {
            // Create settings
            await pool.query(
                `INSERT INTO user_settings (user_id, email_notifications, push_notifications,
                    bug_alerts, weekly_reports, team_updates, two_factor_auth,
                    session_timeout, login_alerts, profile_visibility,
                    activity_status, data_collection)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [req.user.id, emailNotifications, pushNotifications, bugAlerts,
                 weeklyReports, teamUpdates, twoFactorAuth, sessionTimeout,
                 loginAlerts, profileVisibility, activityStatus, dataCollection]
            );
        } else {
            // Update settings
            await pool.query(
                `UPDATE user_settings
                 SET email_notifications = COALESCE($1, email_notifications),
                     push_notifications = COALESCE($2, push_notifications),
                     bug_alerts = COALESCE($3, bug_alerts),
                     weekly_reports = COALESCE($4, weekly_reports),
                     team_updates = COALESCE($5, team_updates),
                     two_factor_auth = COALESCE($6, two_factor_auth),
                     session_timeout = COALESCE($7, session_timeout),
                     login_alerts = COALESCE($8, login_alerts),
                     profile_visibility = COALESCE($9, profile_visibility),
                     activity_status = COALESCE($10, activity_status),
                     data_collection = COALESCE($11, data_collection),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $12`,
                [emailNotifications, pushNotifications, bugAlerts, weeklyReports,
                 teamUpdates, twoFactorAuth, sessionTimeout, loginAlerts,
                 profileVisibility, activityStatus, dataCollection, req.user.id]
            );
        }

        // Get updated settings
        const result = await pool.query(
            'SELECT * FROM user_settings WHERE user_id = $1',
            [req.user.id]
        );

        // Map settings to camelCase
        const settingsRow = result.rows[0];
        const settings = settingsRow ? {
            emailNotifications: settingsRow.email_notifications,
            pushNotifications: settingsRow.push_notifications,
            bugAlerts: settingsRow.bug_alerts,
            weeklyReports: settingsRow.weekly_reports,
            teamUpdates: settingsRow.team_updates,
            twoFactorAuth: settingsRow.two_factor_auth,
            sessionTimeout: settingsRow.session_timeout,
            loginAlerts: settingsRow.login_alerts,
            profileVisibility: settingsRow.profile_visibility,
            activityStatus: settingsRow.activity_status,
            dataCollection: settingsRow.data_collection
        } : null;

        res.json({
            message: 'Settings updated successfully',
            settings
        });
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Get current user password
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isMatch = bcrypt.compareSync(currentPassword, result.rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = bcrypt.hashSync(newPassword, 10);

        // Update password
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: err.message || 'Failed to change password' });
    }
});

module.exports = router;

