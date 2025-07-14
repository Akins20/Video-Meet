import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { IUser, ITokenPayload } from "../types/models";
import config from "../config";

/**
 * Extended Request interface to include authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
  tokenPayload?: ITokenPayload;
  meetingId?: string;
}

/**
 * Authentication middleware options
 */
interface AuthOptions {
  required?: boolean; // Whether authentication is required
  roles?: string[]; // Allowed user roles
  permissions?: string[]; // Required permissions
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and attaches user information to request
 */
export const authenticate = (options: AuthOptions = { required: true }) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader: any =
        req.headers.authorization || req.headers.Authorization;
      let token: string | null = null;

      if (authHeader) {
        // Support both "Bearer token" and "token" formats
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        } else {
          token = authHeader;
        }
      }

      // Check if token is required
      if (!token) {
        if (options.required) {
          res.status(401).json({
            success: false,
            message: "Access token is required",
            error: { code: "TOKEN_REQUIRED" },
          });
          return;
        } else {
          // Token not required, continue without authentication
          return next();
        }
      }

      // Verify JWT token
      let decoded: ITokenPayload;
      try {
        decoded = jwt.verify(token, config.jwt.secret) as ITokenPayload;
      } catch (jwtError) {
        if (jwtError instanceof jwt.TokenExpiredError) {
          res.status(401).json({
            success: false,
            message: "Access token has expired",
            error: { code: "TOKEN_EXPIRED" },
          });
          return;
        } else if (jwtError instanceof jwt.JsonWebTokenError) {
          res.status(401).json({
            success: false,
            message: "Invalid access token",
            error: { code: "TOKEN_INVALID" },
          });
          return;
        } else {
          throw jwtError;
        }
      }

      // Find user in database
      const user = await User.findById(decoded.userId).select("+refreshTokens");

      if (!user) {
        res.status(401).json({
          success: false,
          message: "User not found",
          error: { code: "USER_NOT_FOUND" },
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: "User account is deactivated",
          error: { code: "USER_DEACTIVATED" },
        });
        return;
      }

      // Check role-based access if roles are specified
      if (options.roles && options.roles.length > 0) {
        // Note: We don't have a role field in User model yet,
        // but this is where you'd check it
        // if (!options.roles.includes(user.role)) {
        //   res.status(403).json({
        //     success: false,
        //     message: 'Insufficient permissions',
        //     error: { code: 'INSUFFICIENT_ROLE' }
        //   });
        //   return;
        // }
      }

      // Attach user information to request
      req.user = user;
      req.userId = user._id.toString();
      req.tokenPayload = decoded;

      // Update last seen (optional - can be performance intensive)
      // user.lastLogin = new Date();
      // await user.save();

      next();
    } catch (error) {
      console.error("Authentication middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Authentication failed",
        error: { code: "AUTH_MIDDLEWARE_ERROR" },
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuth = authenticate({ required: false });

/**
 * Require authentication middleware
 * Requires valid JWT token
 */
export const requireAuth = authenticate({ required: true });

/**
 * Meeting host authorization middleware
 * Requires user to be the host of the specified meeting
 */
export const requireMeetingHost = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        error: { code: "AUTH_REQUIRED" },
      });
      return;
    }

    // Get meeting ID from params
    const meetingId = req.params.meetingId || req.params.id;

    if (!meetingId) {
      res.status(400).json({
        success: false,
        message: "Meeting ID is required",
        error: { code: "MEETING_ID_REQUIRED" },
      });
      return;
    }

    // Check if user is the host of the meeting
    const { Meeting } = await import("../models/Meeting");
    const meeting = await Meeting.findOne({
      _id: meetingId,
      hostId: req.userId,
      status: { $in: ["waiting", "active"] },
    });

    if (!meeting) {
      res.status(403).json({
        success: false,
        message: "You are not the host of this meeting or meeting not found",
        error: { code: "NOT_MEETING_HOST" },
      });
      return;
    }

    // Attach meeting to request for controller use
    (req as any).meeting = meeting;

    next();
  } catch (error) {
    console.error("Meeting host authorization error:", error);
    res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: { code: "HOST_AUTH_ERROR" },
    });
  }
};

/**
 * Meeting participant authorization middleware
 * Requires user to be a participant in the specified meeting
 */
export const requireMeetingParticipant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get meeting ID from params
    const meetingId = req.params.meetingId || req.params.id;

    if (!meetingId) {
      res.status(400).json({
        success: false,
        message: "Meeting ID is required",
        error: { code: "MEETING_ID_REQUIRED" },
      });
      return;
    }

    // Check if this is a guest participant by participant ID
    const participantId = req.user?._id;
    console.log("Participant ID:", participantId);

    if (!participantId) {
      res.status(401).json({
        success: false,
        message: "Authentication or participant ID required",
        error: { code: "AUTH_OR_PARTICIPANT_ID_REQUIRED" },
      });
      return;
    }

    const { Participant } = await import("../models/Participant");
    const { Meeting } = await import("../models/Meeting");
    const meeting = await Meeting.findOne({
      roomId: meetingId,
    });

    if (!meeting) {
      res.status(403).json({
        success: false,
        message: "Meeting not found or not active",
        error: { code: "MEETING_NOT_FOUND_OR_NOT_ACTIVE" },
      });
      return;
    }
    const participant = await Participant.findOne({
      _id: participantId,
      meetingId: meeting._id,
    });

    console.log("Participant:", participant);
    console.log("Meeting:", meeting);

    if (!participant) {
      res.status(403).json({
        success: false,
        message: "You are not a participant in this meeting",
        error: { code: "NOT_MEETING_PARTICIPANT" },
      });
      return;
    }

    // Attach participant to request for controller use
    (req as any).participant = participant;
    (req as any).meetingId = meeting.id;

    next();
  } catch (error) {
    console.error("Meeting participant authorization error:", error);
    res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: { code: "PARTICIPANT_AUTH_ERROR" },
    });
  }
};

/**
 * Permission-based authorization middleware
 * Requires participant to have specific permissions
 */
export const requirePermission = (permission: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // This middleware should be used after requireMeetingParticipant
      const participant = (req as any).participant;

      if (!participant) {
        res.status(500).json({
          success: false,
          message:
            "Participant context not found - ensure requireMeetingParticipant middleware is used first",
          error: { code: "PARTICIPANT_CONTEXT_MISSING" },
        });
        return;
      }

      // Check if participant has the required permission
      if (!participant.permissions[permission]) {
        res.status(403).json({
          success: false,
          message: `Permission '${permission}' is required`,
          error: { code: "INSUFFICIENT_PERMISSIONS" },
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Permission authorization error:", error);
      res.status(500).json({
        success: false,
        message: "Permission check failed",
        error: { code: "PERMISSION_CHECK_ERROR" },
      });
    }
  };
};

/**
 * Admin/moderator authorization middleware
 * Requires participant to be host or moderator
 */
export const requireModerator = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const participant = (req as any).participant;

    if (!participant) {
      res.status(500).json({
        success: false,
        message:
          "Participant context not found - ensure requireMeetingParticipant middleware is used first",
        error: { code: "PARTICIPANT_CONTEXT_MISSING" },
      });
      return;
    }

    // Check if participant is host or moderator
    if (!["host", "moderator"].includes(participant.role)) {
      res.status(403).json({
        success: false,
        message: "Host or moderator role is required",
        error: { code: "MODERATOR_ROLE_REQUIRED" },
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Moderator authorization error:", error);
    res.status(500).json({
      success: false,
      message: "Moderator check failed",
      error: { code: "MODERATOR_CHECK_ERROR" },
    });
  }
};

/**
 * Self or moderator authorization middleware
 * Allows access if user is targeting themselves or is a moderator
 */
export const requireSelfOrModerator = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const participant = (req as any).participant;
    const targetParticipantId = req.params.participantId;

    if (!participant) {
      res.status(500).json({
        success: false,
        message: "Participant context not found",
        error: { code: "PARTICIPANT_CONTEXT_MISSING" },
      });
      return;
    }

    // Allow if user is targeting themselves
    if (participant._id.toString() === targetParticipantId) {
      return next();
    }

    // Allow if user is host or moderator
    if (["host", "moderator"].includes(participant.role)) {
      return next();
    }

    res.status(403).json({
      success: false,
      message:
        "You can only modify your own settings or need moderator privileges",
      error: { code: "SELF_OR_MODERATOR_REQUIRED" },
    });
  } catch (error) {
    console.error("Self or moderator authorization error:", error);
    res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: { code: "SELF_OR_MODERATOR_CHECK_ERROR" },
    });
  }
};

/**
 * Refresh token validation middleware
 * Validates refresh tokens for token refresh endpoints
 */
export const validateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
        error: { code: "REFRESH_TOKEN_REQUIRED" },
      });
      return;
    }

    // Verify refresh token
    let decoded: ITokenPayload;
    try {
      decoded = jwt.verify(
        refreshToken,
        config.jwt.refreshSecret
      ) as ITokenPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: "Refresh token has expired",
          error: { code: "REFRESH_TOKEN_EXPIRED" },
        });
        return;
      } else {
        res.status(401).json({
          success: false,
          message: "Invalid refresh token",
          error: { code: "REFRESH_TOKEN_INVALID" },
        });
        return;
      }
    }

    // Check if refresh token exists in user's token list
    const user = await User.findOne({
      _id: decoded.userId,
      refreshTokens: refreshToken,
      isActive: true,
    }).select("+refreshTokens");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Refresh token is invalid or revoked",
        error: { code: "REFRESH_TOKEN_REVOKED" },
      });
      return;
    }

    // Attach user and token info to request
    (req as any).user = user;
    (req as any).refreshToken = refreshToken;
    (req as any).tokenPayload = decoded;

    next();
  } catch (error) {
    console.error("Refresh token validation error:", error);
    res.status(500).json({
      success: false,
      message: "Refresh token validation failed",
      error: { code: "REFRESH_TOKEN_VALIDATION_ERROR" },
    });
  }
};
