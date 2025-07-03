import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import AuthService from "../services/AuthService";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { APIResponse } from "../types/models";

/**
 * Authentication Controller
 * Handles all authentication-related HTTP requests
 */
export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  static register = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { email, username, firstName, lastName, password } = req.body;

      // Call auth service to register user
      const result = await AuthService.register({
        email,
        username,
        firstName,
        lastName,
        password,
      });

      if (!result.success) {
        // Service returned an error
        switch (result.error?.code) {
          case "EMAIL_EXISTS":
            throw createError.conflict("A user with this email already exists");
          case "USERNAME_EXISTS":
            throw createError.conflict("This username is already taken");
          case "VALIDATION_ERROR":
            throw createError.validation(
              "Registration data validation failed",
              result.error.details
            );
          default:
            throw createError.internal(
              "Registration failed. Please try again."
            );
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "User registered successfully",
        data: {
          user: result.data!.user,
          accessToken: result.data!.accessToken,
          refreshToken: result.data!.refreshToken,
          expiresIn: result.data!.expiresIn,
        },
      };

      res.status(201).json(response);
    }
  );

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  static login = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { emailOrUsername, password } = req.body;

      // Call auth service to login user
      const result = await AuthService.login({
        emailOrUsername,
        password,
      });

      if (!result.success) {
        // Service returned an error
        switch (result.error?.code) {
          case "INVALID_CREDENTIALS":
            throw createError.auth("Invalid email/username or password");
          default:
            throw createError.internal("Login failed. Please try again.");
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Login successful",
        data: {
          user: result.data!.user,
          accessToken: result.data!.accessToken,
          refreshToken: result.data!.refreshToken,
          expiresIn: result.data!.expiresIn,
        },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-token
   */
  static refreshToken = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      // Refresh token is validated by middleware and attached to request
      const refreshToken = (req as any).refreshToken;

      if (!refreshToken) {
        throw createError.auth(
          "Refresh token is required",
          "REFRESH_TOKEN_REQUIRED"
        );
      }

      // Call auth service to refresh token
      const result = await AuthService.refreshToken(refreshToken);

      if (!result.success) {
        // Service returned an error
        switch (result.error?.code) {
          case "INVALID_REFRESH_TOKEN":
            throw createError.auth(
              "Invalid refresh token",
              "INVALID_REFRESH_TOKEN"
            );
          case "TOKEN_REFRESH_FAILED":
            throw createError.auth(
              "Token refresh failed",
              "TOKEN_REFRESH_FAILED"
            );
          default:
            throw createError.internal(
              "Token refresh failed. Please try again."
            );
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Token refreshed successfully",
        data: {
          user: result.data!.user,
          accessToken: result.data!.accessToken,
          refreshToken: result.data!.refreshToken,
          expiresIn: result.data!.expiresIn,
        },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  static logout = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.userId!;
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw createError.validation("Refresh token is required for logout");
      }

      // Call auth service to logout user
      const result = await AuthService.logout(userId, refreshToken);

      if (!result.success) {
        // Service returned an error, but we don't want to fail logout
        console.warn("Logout service error:", result.error);
      }

      // Always return success for logout
      const response: APIResponse = {
        success: true,
        message: "Logout successful",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Logout from all devices
   * POST /api/v1/auth/logout-all
   */
  static logoutAll = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.userId!;

      // Call auth service to logout from all devices
      const result = await AuthService.logoutAllDevices(userId);

      if (!result.success) {
        throw createError.internal("Failed to logout from all devices");
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message: "Logged out from all devices successfully",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  static forgotPassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { email } = req.body;

      // Call auth service to request password reset
      const result = await AuthService.requestPasswordReset(email);

      if (!result.success) {
        // For security, we don't reveal if email exists
        // But log the error for debugging
        console.error("Password reset request error:", result.error);
      }

      // Always return success message for security
      const response: APIResponse = {
        success: true,
        message: "If the email exists, a password reset link has been sent",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  static resetPassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { token, newPassword } = req.body;

      // Call auth service to reset password
      const result = await AuthService.resetPassword({
        token,
        newPassword,
      });

      if (!result.success) {
        // Service returned an error
        switch (result.error?.code) {
          case "INVALID_RESET_TOKEN":
            throw createError.auth(
              "Invalid or expired reset token",
              "INVALID_RESET_TOKEN"
            );
          case "PASSWORD_VALIDATION_ERROR":
            throw createError.validation(
              "Password validation failed",
              result.error.details
            );
          default:
            throw createError.internal(
              "Password reset failed. Please try again."
            );
        }
      }

      // Success response
      const response: APIResponse = {
        success: true,
        message:
          "Password reset successful. Please login with your new password.",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  static getProfile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user!;

      // Transform user data for response
      const userProfile = {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const response: APIResponse = {
        success: true,
        message: "User profile retrieved successfully",
        data: { user: userProfile },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update user profile
   * PUT /api/v1/auth/profile
   */
  static updateProfile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user!;
      const { firstName, lastName, bio, avatar, preferences } = req.body;

      // Update user fields
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (bio !== undefined) user.bio = bio;
      if (avatar !== undefined) user.avatar = avatar;
      if (preferences !== undefined) {
        // Merge preferences to avoid overwriting nested fields
        user.preferences = {
          ...user.preferences,
          ...preferences,
          notifications: {
            ...user.preferences.notifications,
            ...preferences.notifications,
          },
          privacy: {
            ...user.preferences.privacy,
            ...preferences.privacy,
          },
          meeting: {
            ...user.preferences.meeting,
            ...preferences.meeting,
          },
        };
      }

      // Save updated user
      try {
        await user.save();
      } catch (error) {
        if (error instanceof Error && error.name === "ValidationError") {
          throw createError.validation(
            "Profile validation failed",
            error.message
          );
        }
        throw createError.internal("Failed to update profile");
      }

      // Transform user data for response
      const userProfile = {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        updatedAt: user.updatedAt,
      };

      const response: APIResponse = {
        success: true,
        message: "Profile updated successfully",
        data: { user: userProfile },
      };

      res.status(200).json(response);
    }
  );

  /**
   * Change password
   * PUT /api/v1/auth/change-password
   */
  static changePassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user!;
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw createError.auth("Current password is incorrect");
      }

      // Update password
      user.password = newPassword; // Will be hashed by pre-save middleware

      // Clear all refresh tokens for security
      user.refreshTokens = [];

      try {
        await user.save();
      } catch (error) {
        if (error instanceof Error && error.name === "ValidationError") {
          throw createError.validation(
            "Password validation failed",
            error.message
          );
        }
        throw createError.internal("Failed to change password");
      }

      const response: APIResponse = {
        success: true,
        message: "Password changed successfully. Please login again.",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Verify email
   * POST /api/v1/auth/verify-email
   */
  static verifyEmail = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { token } = req.body;

      if (!token) {
        throw createError.validation("Verification token is required");
      }

      // Find user by verification token
      const User = (await import("@/models/User")).default;
      const user = await User.findOne({
        emailVerificationToken: token,
        isActive: true,
      });

      if (!user) {
        throw createError.auth(
          "Invalid or expired verification token",
          "INVALID_VERIFICATION_TOKEN"
        );
      }

      // Mark email as verified
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;

      try {
        await user.save();
      } catch (error) {
        throw createError.internal("Failed to verify email");
      }

      const response: APIResponse = {
        success: true,
        message: "Email verified successfully",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Resend email verification
   * POST /api/v1/auth/resend-verification
   */
  static resendVerification = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user!;

      // Check if email is already verified
      if (user.isEmailVerified) {
        throw createError.validation("Email is already verified");
      }

      // Generate new verification token
      const crypto = await import("crypto");
      user.emailVerificationToken = crypto.randomBytes(32).toString("hex");

      try {
        await user.save();
      } catch (error) {
        throw createError.internal("Failed to generate verification token");
      }

      // TODO: Send verification email
      console.log("Verification token:", user.emailVerificationToken);

      const response: APIResponse = {
        success: true,
        message: "Verification email sent successfully",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Delete user account
   * DELETE /api/v1/auth/account
   */
  static deleteAccount = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user!;
      const { password } = req.body;

      // Verify password before deletion
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw createError.auth("Password verification failed");
      }

      // Soft delete - deactivate account
      user.isActive = false;
      user.refreshTokens = []; // Clear all tokens

      try {
        await user.save();
      } catch (error) {
        throw createError.internal("Failed to delete account");
      }

      // TODO: Clean up user data (meetings, participants, etc.)
      // This should be done asynchronously to avoid blocking the response

      const response: APIResponse = {
        success: true,
        message: "Account deleted successfully",
      };

      res.status(200).json(response);
    }
  );

  /**
   * Check if email/username is available
   * POST /api/v1/auth/check-availability
   */
  static checkAvailability = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { email, username } = req.body;

      if (!email && !username) {
        throw createError.validation("Email or username is required");
      }

      const User = (await import("@/models/User")).default;
      const checks: { email?: boolean; username?: boolean } = {};

      // Check email availability
      if (email) {
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        checks.email = !emailExists;
      }

      // Check username availability
      if (username) {
        const usernameExists = await User.findOne({
          username: username.toLowerCase(),
        });
        checks.username = !usernameExists;
      }

      const response: APIResponse = {
        success: true,
        message: "Availability check completed",
        data: {
          available: checks,
        },
      };

      res.status(200).json(response);
    }
  );
}

export default AuthController;
