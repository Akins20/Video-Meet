import { Router } from "express";
import AuthController from "@/controllers/AuthController";
import {
  requireAuth,
  optionalAuth,
  validateRefreshToken,
} from "@/middleware/auth";
import {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  sanitizeInput,
} from "@/middleware/validation";
import { authRateLimit, generalRateLimit } from "@/middleware/security";

const router = Router();

/**
 * Authentication Routes
 * Base path: /api/v1/auth
 */

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @middleware authRateLimit, sanitizeInput, validateUserRegistration
 */
router.post(
  "/register",
  authRateLimit, // Rate limit: 10 attempts per 15 minutes
  sanitizeInput, // Sanitize input data
  validateUserRegistration, // Validate registration data
  AuthController.register // Handle registration
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 * @middleware authRateLimit, sanitizeInput, validateUserLogin
 */
router.post(
  "/login",
  authRateLimit, // Rate limit: 10 attempts per 15 minutes
  sanitizeInput, // Sanitize input data
  validateUserLogin, // Validate login data
  AuthController.login // Handle login
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token)
 * @middleware generalRateLimit, validateRefreshToken
 */
router.post(
  "/refresh-token",
  generalRateLimit, // General rate limiting
  validateRefreshToken, // Validate refresh token
  AuthController.refreshToken // Handle token refresh
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 * @middleware requireAuth
 */
router.post(
  "/logout",
  requireAuth, // Require valid JWT
  AuthController.logout // Handle logout
);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices (invalidate all refresh tokens)
 * @access  Private
 * @middleware requireAuth
 */
router.post(
  "/logout-all",
  requireAuth, // Require valid JWT
  AuthController.logoutAll // Handle logout from all devices
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @middleware authRateLimit, sanitizeInput, validatePasswordResetRequest
 */
router.post(
  "/forgot-password",
  authRateLimit, // Rate limit password reset requests
  sanitizeInput, // Sanitize input data
  validatePasswordResetRequest, // Validate email
  AuthController.forgotPassword // Handle password reset request
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 * @middleware authRateLimit, sanitizeInput, validatePasswordReset
 */
router.post(
  "/reset-password",
  authRateLimit, // Rate limit password reset attempts
  sanitizeInput, // Sanitize input data
  validatePasswordReset, // Validate token and new password
  AuthController.resetPassword // Handle password reset
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 * @middleware requireAuth
 */
router.get(
  "/me",
  requireAuth, // Require valid JWT
  AuthController.getProfile // Get user profile
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 * @middleware requireAuth, sanitizeInput
 */
router.put(
  "/profile",
  requireAuth, // Require valid JWT
  sanitizeInput, // Sanitize input data
  AuthController.updateProfile // Update user profile
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @middleware requireAuth, sanitizeInput
 */
router.put(
  "/change-password",
  requireAuth, // Require valid JWT
  sanitizeInput, // Sanitize input data
  AuthController.changePassword // Change password
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 * @middleware generalRateLimit, sanitizeInput
 */
router.post(
  "/verify-email",
  generalRateLimit, // General rate limiting
  sanitizeInput, // Sanitize input data
  AuthController.verifyEmail // Verify email
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private
 * @middleware requireAuth
 */
router.post(
  "/resend-verification",
  requireAuth, // Require valid JWT
  AuthController.resendVerification // Resend verification email
);

/**
 * @route   DELETE /api/v1/auth/account
 * @desc    Delete user account
 * @access  Private
 * @middleware requireAuth, sanitizeInput
 */
router.delete(
  "/account",
  requireAuth, // Require valid JWT
  sanitizeInput, // Sanitize input data
  AuthController.deleteAccount // Delete account
);

/**
 * @route   POST /api/v1/auth/check-availability
 * @desc    Check if email/username is available
 * @access  Public
 * @middleware generalRateLimit, sanitizeInput
 */
router.post(
  "/check-availability",
  generalRateLimit, // General rate limiting
  sanitizeInput, // Sanitize input data
  AuthController.checkAvailability // Check availability
);

export default router;
