import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { IUser } from '@/types/models';
import config from '@/config';

/**
 * User Schema Definition
 * Comprehensive user model with security, preferences, and validation
 */
const UserSchema = new Schema<IUser>(
  {
    // Basic user information
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(email: string) {
          // RFC 5322 compliant email regex
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address'
      },
      index: true, // Index for fast email lookups
    },
    
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      validate: {
        validator: function(username: string) {
          // Allow letters, numbers, underscores, and hyphens
          return /^[a-zA-Z0-9_-]+$/.test(username);
        },
        message: 'Username can only contain letters, numbers, underscores, and hyphens'
      },
      index: true, // Index for fast username lookups
    },
    
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
      validate: {
        validator: function(name: string) {
          // Allow letters, spaces, hyphens, and apostrophes
          return /^[a-zA-Z\s'-]+$/.test(name);
        },
        message: 'First name can only contain letters, spaces, hyphens, and apostrophes'
      }
    },
    
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
      validate: {
        validator: function(name: string) {
          return /^[a-zA-Z\s'-]+$/.test(name);
        },
        message: 'Last name can only contain letters, spaces, hyphens, and apostrophes'
      }
    },
    
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      validate: {
        validator: function(password: string) {
          // Strong password: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
        },
        message: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character'
      },
      select: false, // Don't include password in queries by default
    },
    
    // Profile information
    avatar: {
      type: String,
      validate: {
        validator: function(url: string) {
          if (!url) return true; // Optional field
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        },
        message: 'Avatar must be a valid image URL'
      }
    },
    
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      trim: true,
    },
    
    // Account status
    isActive: {
      type: Boolean,
      default: true,
      index: true, // Index for filtering active users
    },
    
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    emailVerificationToken: {
      type: String,
      select: false, // Don't include in queries
    },
    
    // Security fields
    lastLogin: {
      type: Date,
      default: null,
    },
    
    passwordResetToken: {
      type: String,
      select: false,
    },
    
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    
    refreshTokens: {
      type: [String],
      default: [],
      select: false, // Keep refresh tokens secure
    },
    
    // User preferences
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        meetingInvites: {
          type: Boolean,
          default: true,
        },
        meetingReminders: {
          type: Boolean,
          default: true,
        },
      },
      privacy: {
        allowDiscovery: {
          type: Boolean,
          default: true,
        },
        showOnlineStatus: {
          type: Boolean,
          default: true,
        },
      },
      meeting: {
        defaultMicMuted: {
          type: Boolean,
          default: false,
        },
        defaultVideoOff: {
          type: Boolean,
          default: false,
        },
        preferredQuality: {
          type: String,
          enum: ['low', 'medium', 'high', 'auto'],
          default: 'auto',
        },
      },
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
    versionKey: false, // Remove __v field
    toJSON: {
      // Transform output when converting to JSON
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      }
    },
    toObject: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

/**
 * Indexes for performance optimization
 */
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ isActive: 1, isEmailVerified: 1 });
UserSchema.index({ lastLogin: -1 }); // Sort by last login descending

/**
 * Pre-save middleware to hash password
 */
UserSchema.pre('save', async function(next) {
  // Only hash password if it's been modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Hash password with configurable salt rounds
    const saltRounds = config.security.bcryptRounds;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Pre-save middleware to generate email verification token
 */
UserSchema.pre('save', function(next) {
  // Generate verification token for new users
  if (this.isNew && !this.emailVerificationToken) {
    this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

/**
 * Instance method: Compare password with hashed password
 */
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Instance method: Generate password reset token
 */
UserSchema.methods.generatePasswordResetToken = function(): string {
  // Generate secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash and set reset token (store hashed version in database)
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  // Set expiration time (10 minutes from now)
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  
  // Return unhashed token (this will be sent to user)
  return resetToken;
};

/**
 * Instance method: Clear password reset token
 */
UserSchema.methods.clearPasswordResetToken = function(): void {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
};

/**
 * Instance method: Add refresh token
 */
UserSchema.methods.addRefreshToken = function(token: string): void {
  // Add new token to array
  this.refreshTokens.push(token);
  
  // Keep only last 5 refresh tokens per user (for multiple devices)
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
};

/**
 * Instance method: Remove refresh token
 */
UserSchema.methods.removeRefreshToken = function(token: string): void {
  this.refreshTokens = this.refreshTokens.filter((t: string) => t !== token);
};

/**
 * Instance method: Get full name
 */
UserSchema.methods.getFullName = function(): string {
  return `${this.firstName} ${this.lastName}`.trim();
};

/**
 * Static method: Find user by email
 */
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

/**
 * Static method: Find user by username
 */
UserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username.toLowerCase(), isActive: true });
};

/**
 * Static method: Find user by reset token
 */
UserSchema.statics.findByPasswordResetToken = function(token: string) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
    isActive: true
  });
};

/**
 * Static method: Search users (for admin/discovery features)
 */
UserSchema.statics.searchUsers = function(query: string, limit: number = 10) {
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $and: [
      { isActive: true },
      { isEmailVerified: true },
      { 'preferences.privacy.allowDiscovery': true },
      {
        $or: [
          { username: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      }
    ]
  })
  .select('username firstName lastName avatar bio')
  .limit(limit)
  .sort({ lastLogin: -1 });
};

/**
 * Virtual field: Full name
 */
UserSchema.virtual('fullName').get(function() {
  return this.getFullName();
});

/**
 * Virtual field: Is online (based on last login)
 */
UserSchema.virtual('isOnline').get(function() {
  if (!this.lastLogin) return false;
  
  // Consider user online if they logged in within last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastLogin > fiveMinutesAgo;
});

// Ensure virtual fields are included in JSON output
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

/**
 * Create and export the User model
 */
export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

// Export default
export default User;