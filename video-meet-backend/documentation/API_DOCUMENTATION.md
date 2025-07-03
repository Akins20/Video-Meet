# Video Meet API Documentation

## Overview

The Video Meet API is a comprehensive backend service for video calling applications, supporting real-time communication, meeting management, and user authentication. Built with Node.js, Express, MongoDB, and Socket.io.

**Base URL**: `http://localhost:5000/api/v1`  
**Version**: 2.0.0  
**Authentication**: JWT Bearer tokens  

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Authentication Endpoints](#authentication-endpoints)
5. [Meeting Endpoints](#meeting-endpoints)
6. [Participant Endpoints](#participant-endpoints)
7. [WebSocket Events](#websocket-events)
8. [Response Formats](#response-formats)

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Types
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTH_REQUIRED` - Authentication required
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Rate Limiting

Different endpoints have different rate limits:

- **General API**: 100 requests per 15 minutes
- **Authentication**: 10 attempts per 15 minutes
- **Meeting Creation**: 50 meetings per hour
- **File Upload**: 100 uploads per hour
- **WebRTC Signaling**: 1000 signals per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-15T10:30:00Z
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "isEmailVerified": false,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### Login User
**POST** `/auth/login`

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Same as registration response.

### Refresh Token
**POST** `/auth/refresh-token`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Profile
**GET** `/auth/me`

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "Software developer",
      "preferences": {
        "notifications": {
          "email": true,
          "push": true,
          "meetingInvites": true
        },
        "meeting": {
          "defaultMicMuted": false,
          "defaultVideoOff": false,
          "preferredQuality": "auto"
        }
      }
    }
  }
}
```

### Update Profile
**PUT** `/auth/profile`

Update user profile information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Updated bio",
  "avatar": "https://example.com/new-avatar.jpg",
  "preferences": {
    "meeting": {
      "defaultMicMuted": true
    }
  }
}
```

### Change Password
**PUT** `/auth/change-password`

Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

### Forgot Password
**POST** `/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Reset Password
**POST** `/auth/reset-password`

Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "newPassword": "NewPass456!"
}
```

---

## Meeting Endpoints

### Create Meeting
**POST** `/meetings`

Create a new meeting.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Team Standup",
  "description": "Daily team meeting",
  "type": "instant",
  "maxParticipants": 10,
  "password": "meeting123",
  "settings": {
    "allowGuests": true,
    "muteOnJoin": false,
    "videoOnJoin": true,
    "waitingRoom": false,
    "chat": true,
    "screenShare": true,
    "recording": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Meeting created successfully",
  "data": {
    "meeting": {
      "id": "507f1f77bcf86cd799439012",
      "roomId": "ABC-123-XYZ",
      "title": "Team Standup",
      "description": "Daily team meeting",
      "hostId": "507f1f77bcf86cd799439011",
      "status": "waiting",
      "maxParticipants": 10,
      "currentParticipants": 0,
      "settings": { /* meeting settings */ },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Get Meeting
**GET** `/meetings/{roomId}`

Get meeting details by room ID.

**Parameters:**
- `roomId` (path) - Meeting room ID (format: ABC-123-XYZ)

**Response:**
```json
{
  "success": true,
  "message": "Meeting retrieved successfully",
  "data": {
    "meeting": {
      "id": "507f1f77bcf86cd799439012",
      "roomId": "ABC-123-XYZ",
      "title": "Team Standup",
      "hostId": {
        "id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe"
      },
      "status": "active",
      "participantCount": 3,
      "maxParticipants": 10
    }
  }
}
```

### Join Meeting
**POST** `/meetings/{roomId}/join`

Join a meeting (supports guests).

**Parameters:**
- `roomId` (path) - Meeting room ID

**Request Body:**
```json
{
  "password": "meeting123",
  "guestName": "Jane Guest",
  "deviceInfo": {
    "deviceType": "web",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined meeting",
  "data": {
    "meeting": { /* meeting object */ },
    "participant": {
      "id": "507f1f77bcf86cd799439013",
      "displayName": "Jane Guest",
      "role": "guest",
      "permissions": {
        "canMuteOthers": false,
        "canShareScreen": false
      },
      "mediaState": {
        "audioEnabled": true,
        "videoEnabled": true,
        "screenSharing": false,
        "handRaised": false
      },
      "joinedAt": "2024-01-15T10:35:00Z"
    }
  }
}
```

### Get User Meetings
**GET** `/meetings`

Get user's meetings with pagination.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "message": "Meetings retrieved successfully",
  "data": {
    "meetings": [
      {
        "id": "507f1f77bcf86cd799439012",
        "roomId": "ABC-123-XYZ",
        "title": "Team Standup",
        "status": "ended",
        "participantCount": 5,
        "duration": 1800,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Update Meeting
**PUT** `/meetings/{meetingId}`

Update meeting settings (host only).

**Headers:** `Authorization: Bearer <token>`

**Parameters:**
- `meetingId` (path) - Meeting ID

**Request Body:**
```json
{
  "title": "Updated Meeting Title",
  "maxParticipants": 15,
  "settings": {
    "allowGuests": false,
    "waitingRoom": true
  }
}
```

### End Meeting
**POST** `/meetings/{meetingId}/end`

End a meeting (host only).

**Headers:** `Authorization: Bearer <token>`

**Parameters:**
- `meetingId` (path) - Meeting ID

### Leave Meeting
**POST** `/meetings/{meetingId}/leave`

Leave a meeting.

**Parameters:**
- `meetingId` (path) - Meeting ID

### Get Meeting Participants
**GET** `/meetings/{meetingId}/participants`

Get list of meeting participants.

**Parameters:**
- `meetingId` (path) - Meeting ID

**Response:**
```json
{
  "success": true,
  "message": "Participants retrieved successfully",
  "data": {
    "participants": [
      {
        "id": "507f1f77bcf86cd799439013",
        "displayName": "John Doe",
        "role": "host",
        "mediaState": {
          "audioEnabled": true,
          "videoEnabled": true,
          "screenSharing": false,
          "handRaised": false
        },
        "connectionQuality": {
          "quality": "excellent",
          "latency": 25,
          "packetLoss": 0.1
        },
        "joinedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

---

## Participant Endpoints

### Update Media State
**PUT** `/participants/{participantId}/media`

Update participant's media state (self-service).

**Parameters:**
- `participantId` (path) - Participant ID

**Request Body:**
```json
{
  "audioEnabled": false,
  "videoEnabled": true,
  "screenSharing": false,
  "handRaised": true
}
```

### Update Connection Quality
**PUT** `/participants/{participantId}/quality`

Update connection quality metrics (self-service).

**Parameters:**
- `participantId` (path) - Participant ID

**Request Body:**
```json
{
  "latency": 45,
  "bandwidth": 1000,
  "packetLoss": 0.5,
  "quality": "good"
}
```

### Get Participant History
**GET** `/participants/history`

Get participant's meeting history.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional) - Page number
- `limit` (optional) - Items per page

---

## WebSocket Events

### Connection
Connect to Socket.IO with JWT authentication:

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Meeting Events

#### Join Meeting
```javascript
socket.emit('join-meeting', {
  meetingId: '507f1f77bcf86cd799439012',
  participantId: '507f1f77bcf86cd799439013'
});
```

#### Leave Meeting
```javascript
socket.emit('leave-meeting', {
  meetingId: '507f1f77bcf86cd799439012',
  participantId: '507f1f77bcf86cd799439013'
});
```

#### Participant Joined
```javascript
socket.on('participant-joined', (data) => {
  console.log('New participant:', data.participantId);
});
```

#### Participant Left
```javascript
socket.on('participant-left', (data) => {
  console.log('Participant left:', data.participantId);
});
```

### WebRTC Signaling

#### Send Signal
```javascript
socket.emit('webrtc-signal', {
  to: 'target-socket-id',
  signal: { /* WebRTC signal data */ },
  type: 'offer' // or 'answer' or 'ice-candidate'
});
```

#### Receive Signal
```javascript
socket.on('webrtc-signal', (data) => {
  const { from, signal, type } = data;
  // Handle WebRTC signal
});
```

### Chat Events

#### Send Message
```javascript
socket.emit('chat-message', {
  meetingId: '507f1f77bcf86cd799439012',
  message: 'Hello everyone!',
  type: 'text'
});
```

#### Receive Message
```javascript
socket.on('chat-message', (data) => {
  const { senderId, message, timestamp } = data;
  // Display chat message
});
```

### Media State Events

#### Send Media State Change
```javascript
socket.emit('media-state-change', {
  meetingId: '507f1f77bcf86cd799439012',
  mediaState: {
    audioEnabled: false,
    videoEnabled: true
  }
});
```

#### Receive Media State Change
```javascript
socket.on('media-state-change', (data) => {
  const { participantId, mediaState } = data;
  // Update participant's media state in UI
});
```

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional information"
  }
}
```

### Validation Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email address",
        "value": "invalid-email"
      }
    ]
  }
}
```

---

## Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation error)
- **401** - Unauthorized (authentication required)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **409** - Conflict (duplicate resource)
- **429** - Too Many Requests (rate limited)
- **500** - Internal Server Error

---

## Testing

### Health Check
```bash
curl -X GET http://localhost:5000/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "firstName": "Test",
    "lastName": "User",
    "password": "TestPass123!"
  }'
```

### Create Meeting
```bash
curl -X POST http://localhost:5000/api/v1/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Meeting",
    "maxParticipants": 5
  }'
```

---

For additional support or questions, please refer to the technical documentation or contact the development team.