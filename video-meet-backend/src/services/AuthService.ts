import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Types } from 'mongoose';
import User from '@/models/User';
import { IUser, ITokenPayload, APIResponse } from '@/types/models';
import config from '@/config';

/**
 * Interface for registration data
 */
interface RegisterData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

/**
 * Interface for login data
 */
interface LoginData {
  emailOrUsername: string;
  password: string;
}

/**
 * Interface for password reset data
 */
interface PasswordResetData {
  token: string;
  newPassword: string;
}

/**
 * Interface for token response
 */
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: Partial<IUser>;
}

/**
 * Authentication Service Class
 * Handles all authentication-related operations
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterData): Promise<APIResponse<TokenResponse>> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email.toLowerCase() },
          { username: userData.username.toLowerCase() }
        ]
      });

      if (existingUser) {
        if (existingUser.email === userData.email.toLowerCase()) {
          return {
            success: false,
            message: 'User with this email already exists',
            error: { code: 'EMAIL_EXISTS' }
          };
        } else {
          return {
            success: false,
            message: 'Username is already taken',
            error: { code: 'USERNAME_EXISTS' }
          };
        }
      }

      // Create new user
      const newUser = new User({
        email: userData.email.toLowerCase(),
        username: userData.username.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password, // Will be hashed by pre-save middleware
      });

      // Save user to database
      await newUser.save();

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(newUser);

      // Add refresh token to user
      newUser.addRefreshToken(refreshToken);
      await newUser.save();

      // Prepare user data for response (without sensitive info)
      const userResponse = {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: newUser.getFullName(),
        avatar: newUser.avatar,
        isEmailVerified: newUser.isEmailVerified,
        preferences: newUser.preferences,
        createdAt: newUser.createdAt,
      };

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          accessToken,
          refreshToken,
          expiresIn: this.getTokenExpiryTime(),
          user: userResponse,
        }
      };

    } catch (error) {
      console.error('Registration error:', error);

      // Handle MongoDB validation errors
      if (error instanceof Error && error.name === 'ValidationError') {
        return {
          success: false,
          message: 'Validation failed',
          error: {
            code: 'VALIDATION_ERROR',
            details: error.message
          }
        };
      }

      return {
        success: false,
        message: 'Registration failed',
        error: { code: 'REGISTRATION_FAILED' }
      };
    }
  }

  /**
   * Login user with email/username and password
   */
  static async login(loginData: LoginData): Promise<APIResponse<TokenResponse>> {
    try {
      // Find user by email or username
      const user = await User.findOne({
        $and: [
          {
            $or: [
              { email: loginData.emailOrUsername.toLowerCase() },
              { username: loginData.emailOrUsername.toLowerCase() }
            ]
          },
          { isActive: true }
        ]
      }).select('+password +refreshTokens');

      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials',
          error: { code: 'INVALID_CREDENTIALS' }
        };
      }

      // Verify password
      const isValidPassword = await user.comparePassword(loginData.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid credentials',
          error: { code: 'INVALID_CREDENTIALS' }
        };
      }

      // Update last login
      user.lastLogin = new Date();

      // Generate new tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      // Add refresh token to user
      user.addRefreshToken(refreshToken);
      await user.save();

      // Prepare user data for response
      const userResponse = {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
      };

      return {
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          expiresIn: this.getTokenExpiryTime(),
          user: userResponse,
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed',
        error: { code: 'LOGIN_FAILED' }
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<APIResponse<TokenResponse>> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as ITokenPayload;

      // Find user and check if refresh token is valid
      const user = await User.findOne({
        _id: decoded.userId,
        isActive: true,
        refreshTokens: refreshToken
      }).select('+refreshTokens');

      if (!user) {
        return {
          success: false,
          message: 'Invalid refresh token',
          error: { code: 'INVALID_REFRESH_TOKEN' }
        };
      }

      // Remove old refresh token
      user.removeRefreshToken(refreshToken);

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(user);

      // Add new refresh token
      user.addRefreshToken(newRefreshToken);
      await user.save();

      // Prepare user data
      const userResponse = {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences,
      };

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: this.getTokenExpiryTime(),
          user: userResponse,
        }
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Token refresh failed',
        error: { code: 'TOKEN_REFRESH_FAILED' }
      };
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  static async logout(userId: string, refreshToken: string): Promise<APIResponse> {
    try {
      const user = await User.findById(userId).select('+refreshTokens');
      
      if (user) {
        user.removeRefreshToken(refreshToken);
        await user.save();
      }

      return {
        success: true,
        message: 'Logout successful'
      };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Logout failed',
        error: { code: 'LOGOUT_FAILED' }
      };
    }
  }

  /**
   * Logout from all devices (clear all refresh tokens)
   */
  static async logoutAllDevices(userId: string): Promise<APIResponse> {
    try {
      await User.findByIdAndUpdate(userId, { refreshTokens: [] });

      return {
        success: true,
        message: 'Logged out from all devices successfully'
      };

    } catch (error) {
      console.error('Logout all devices error:', error);
      return {
        success: false,
        message: 'Logout from all devices failed',
        error: { code: 'LOGOUT_ALL_FAILED' }
      };
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<APIResponse> {
    try {
      const user = await User.findOne({ 
        email: email.toLowerCase(), 
        isActive: true 
      });

      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        };
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // TODO: Send email with reset token
      // For now, we'll just log it (in production, send via email service)
      console.log('Password reset token:', resetToken);
      console.log('Reset link: http://localhost:3000/reset-password?token=' + resetToken);

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        data: { resetToken } // Remove this in production
      };

    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message: 'Password reset request failed',
        error: { code: 'PASSWORD_RESET_REQUEST_FAILED' }
      };
    }
  }

  /**
   * Reset password using reset token
   */
  static async resetPassword(resetData: PasswordResetData): Promise<APIResponse> {
    try {
      // Find user by reset token
      const user = await User.findByPasswordResetToken(resetData.token);

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired reset token',
          error: { code: 'INVALID_RESET_TOKEN' }
        };
      }

      // Update password and clear reset token
      user.password = resetData.newPassword; // Will be hashed by pre-save middleware
      user.clearPasswordResetToken();
      
      // Clear all refresh tokens (logout from all devices for security)
      user.refreshTokens = [];
      
      await user.save();

      return {
        success: true,
        message: 'Password reset successful'
      };

    } catch (error) {
      console.error('Password reset error:', error);

      if (error instanceof Error && error.name === 'ValidationError') {
        return {
          success: false,
          message: 'Password validation failed',
          error: {
            code: 'PASSWORD_VALIDATION_ERROR',
            details: error.message
          }
        };
      }

      return {
        success: false,
        message: 'Password reset failed',
        error: { code: 'PASSWORD_RESET_FAILED' }
      };
    }
  }

  /**
   * Verify JWT access token
   */
  static async verifyAccessToken(token: string): Promise<ITokenPayload | null> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as ITokenPayload;
      
      // Verify user still exists and is active
      const user = await User.findOne({ 
        _id: decoded.userId, 
        isActive: true 
      });
      
      if (!user) {
        return null;
      }

      return decoded;

    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private static generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const payload: ITokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    };

    const accessToken = jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      payload,
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Get token expiry time in seconds
   */
  private static getTokenExpiryTime(): number {
    // Parse JWT expiry time (e.g., "15m" -> 900 seconds)
    const expiresIn = config.jwt.expiresIn;
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900;
    }
  }

  /**
   * Generate secure random string
   */
  private static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

export default AuthService;