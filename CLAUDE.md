# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Video Meet is a full-stack video conferencing application with separate backend and frontend services:

- **Backend**: Node.js/Express with TypeScript, MongoDB, Socket.IO (`video-meet-backend/`)
- **Frontend**: Next.js 15 with React 19, Redux Toolkit, Tailwind CSS (`video-meet-frontend/`)

## Development Commands

### Backend (`video-meet-backend/`)

```bash
# Development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production server
npm run start

# Run tests with coverage
npm run test
npm run test:coverage

# Linting
npm run lint
```

### Frontend (`video-meet-frontend/`)

```bash
# Development server (with Turbopack)
npm run dev

# Production build
npm run build

# Run production server
npm run start

# Linting
npm run lint
```

## Architecture

### Backend Structure
- **Controllers**: Handle HTTP requests (AuthController, MeetingController, ParticipantController, RecordingController, ChatController)
- **Services**: Business logic layer for core operations
- **Models**: MongoDB schemas (User, Meeting, Participant, ChatMessage)
- **Middleware**: Authentication, validation, security, error handling
- **Socket**: WebRTC signaling and real-time communication via Socket.IO
- **Routes**: RESTful API endpoints under `/api/v1/`

### Frontend Structure
- **App Router**: Next.js 13+ file-based routing in `src/app/`
- **Components**: Organized by feature (auth, dashboard, meeting, UI components using Shadcn/UI)
- **Hooks**: Custom hooks for meeting functionality and WebRTC
- **Store**: Redux Toolkit with persistence and API integration
- **Providers**: Context providers and global state wrappers

## Key Technologies

### Backend Stack
- **Runtime**: Node.js ≥18.0.0
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcryptjs hashing
- **Real-time**: Socket.IO for WebRTC signaling
- **Security**: Helmet, CORS, rate limiting, express-validator

### Frontend Stack
- **Framework**: Next.js 15.3.4 with App Router
- **State Management**: Redux Toolkit with React Redux and Redux Persist
- **HTTP Client**: Axios for API calls
- **UI**: Radix UI primitives with Shadcn/UI components
- **Styling**: Tailwind CSS 4
- **Forms**: React Hook Form with Zod validation
- **Real-time**: Socket.IO Client for live communication

## API Structure

The backend provides a RESTful API with consistent response format:

```typescript
interface APIResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: { code: string; details?: any };
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}
```

### Main API Routes
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/meetings/*` - Meeting management
- `/api/v1/participants/*` - Participant operations

## WebRTC Integration

The application uses peer-to-peer WebRTC connections with Socket.IO signaling:

1. Participants join meetings via Socket.IO
2. WebRTC offer/answer/ICE candidate exchange through socket events
3. Direct P2P video/audio streams once connected
4. Real-time chat and meeting controls via Socket.IO

## Database Models

### Key Entities
- **User**: Authentication, profile, preferences
- **Meeting**: Room details, settings, host information
- **Participant**: Session data, permissions, media state
- **ChatMessage**: Real-time messaging during meetings

## Development Notes

- TypeScript strict mode is enabled for both frontend and backend
- The frontend uses path aliases (`@/*` maps to `./src/*`)
- The backend uses source maps and path mapping from `./src`
- MongoDB indexes are optimized for meeting lookups and participant queries
- Socket.IO handles both WebRTC signaling and real-time features
- Redux state is persisted with encryption for user sessions

## Security Implementation

- JWT access tokens (15min) with refresh tokens (7 days)
- bcrypt password hashing
- Rate limiting on authentication and API endpoints
- CORS protection and security headers via Helmet
- Input validation and sanitization on all endpoints
- Role-based permissions (Host, Moderator, Participant, Guest)

## Testing

- **Backend**: Jest for unit and integration tests
- **Frontend**: Next.js ESLint configuration for code quality
- Test files should follow the naming convention `*.test.ts` or `*.spec.ts`

## Important File Paths

- Backend entry point: `video-meet-backend/src/app.ts`
- Frontend entry point: `video-meet-frontend/src/app/layout.tsx`
- Socket handlers: `video-meet-backend/src/handlers/socketHandlers.ts`
- API routes: `video-meet-backend/src/routes/`
- React components: `video-meet-frontend/src/components/`
- Redux store: `video-meet-frontend/src/store/`