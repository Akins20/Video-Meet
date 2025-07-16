# Video Meet - Project Documentation

## 🎯 Project Overview

**Video Meet** is a comprehensive video conferencing application built with modern web technologies, designed to provide seamless video calling experiences similar to Zoom or Microsoft Teams. The application enables real-time video/audio communication, meeting management, and collaborative features.

## 📋 Core Features

### 🎥 Video Calling
- **Real-time video/audio calls** using WebRTC technology
- **Multi-participant meetings** (up to 50 participants)
- **Screen sharing** capabilities
- **Meeting controls** (mute/unmute, camera on/off, end call)
- **Connection quality monitoring** and adaptive streaming

### 📅 Meeting Management
- **Instant meetings** - Start meetings immediately
- **Scheduled meetings** - Plan meetings for future dates
- **Meeting rooms** with unique room IDs (format: ABC-123-XYZ)
- **Meeting passwords** for secure access
- **Guest access** for non-registered users
- **Meeting recording** capabilities

### 👥 User Management
- **User authentication** (register, login, logout)
- **User profiles** with avatars and preferences
- **Role-based permissions** (host, moderator, participant)
- **Participant management** (remove, mute, change roles)

### 💬 Communication Features
- **Real-time chat** during meetings
- **File sharing** capabilities
- **Whiteboard** collaboration (planned)
- **Meeting notifications** and alerts

### 🔒 Security Features
- **End-to-end encryption** for video streams
- **JWT-based authentication**
- **Password-protected meetings**
- **Meeting lock** functionality
- **Secure data handling** with encryption

## 🏗️ Technical Architecture

### Backend Architecture (`video-meet-backend`)
```
video-meet-backend/
├── src/
│   ├── app.ts                 # Main application entry point
│   ├── config/                # Configuration management
│   │   ├── database.ts        # MongoDB connection
│   │   └── index.ts           # Environment config
│   ├── controllers/           # HTTP request handlers
│   │   ├── AuthController.ts  # Authentication endpoints
│   │   ├── MeetingController.ts # Meeting management
│   │   └── ParticipantController.ts # Participant management
│   ├── handlers/              # WebSocket handlers
│   │   └── socketHandlers.ts  # Socket.IO event handling
│   ├── middleware/            # Express middleware
│   │   ├── auth.ts           # JWT authentication
│   │   ├── errorHandler.ts   # Error handling
│   │   ├── security.ts       # Security middleware
│   │   └── validation.ts     # Request validation
│   ├── models/               # Database models
│   │   ├── User.ts          # User schema
│   │   ├── Meeting.ts       # Meeting schema
│   │   └── Participant.ts   # Participant schema
│   ├── routes/              # API routes
│   │   ├── auth.ts         # Authentication routes
│   │   ├── meetings.ts     # Meeting routes
│   │   └── participants.ts # Participant routes
│   ├── services/           # Business logic
│   │   ├── AuthService.ts  # Authentication logic
│   │   ├── MeetingService.ts # Meeting logic
│   │   └── ParticipantService.ts # Participant logic
│   └── types/              # TypeScript definitions
│       └── models.ts       # Data model types
└── package.json            # Dependencies and scripts
```

### Frontend Architecture (`video-meet-frontend`)
```
video-meet-frontend/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Authentication pages
│   │   ├── register/
│   │   ├── dashboard/         # User dashboard
│   │   ├── meeting/           # Meeting pages
│   │   └── settings/          # User settings
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── meeting/          # Meeting components
│   │   ├── pages/            # Page components
│   │   └── ui/               # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts        # Authentication hook
│   │   ├── useSocket.ts      # Socket.IO hook
│   │   ├── useWebRTC.ts      # WebRTC hook
│   │   └── meeting/          # Meeting-specific hooks
│   ├── lib/                  # Utility libraries
│   │   ├── api.ts           # API client
│   │   ├── auth.ts          # Authentication utils
│   │   ├── socket.ts        # Socket.IO client
│   │   └── webrtc.ts        # WebRTC manager
│   ├── store/               # Redux store
│   │   ├── index.ts         # Store configuration
│   │   ├── authSlice.ts     # Authentication state
│   │   ├── meetingSlice.ts  # Meeting state
│   │   └── api/             # RTK Query APIs
│   └── types/               # TypeScript definitions
└── package.json             # Dependencies and scripts
```

## 🛠️ Technology Stack

### Backend Technologies
- **Node.js** - JavaScript runtime
- **TypeScript** - Type-safe development
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Helmet** - Security middleware

### Frontend Technologies
- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **Framer Motion** - Animations
- **Redux Toolkit** - State management
- **Socket.IO Client** - Real-time communication
- **Shadcn/ui** - UI components

### WebRTC Implementation
- **RTCPeerConnection** - Peer-to-peer connections
- **MediaStream API** - Camera/microphone access
- **Socket.IO** - Signaling server
- **STUN/TURN servers** - NAT traversal
- **ICE candidates** - Connection negotiation

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- MongoDB 4.4 or higher
- npm 8.0.0 or higher

### Backend Setup
```bash
cd video-meet-backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend Setup
```bash
cd video-meet-frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### Environment Variables

#### Backend (.env)
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video-meet
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_ENCRYPTION_KEY=your-encryption-key
```

## 🔄 Application Flow

### 1. User Authentication
1. User registers/logs in through frontend
2. Backend validates credentials and issues JWT
3. Frontend stores token and maintains session
4. Protected routes verify authentication

### 2. Meeting Creation
1. User creates meeting through dashboard
2. Backend generates unique room ID
3. Meeting stored in MongoDB
4. Host receives meeting details

### 3. Joining Meeting
1. User enters room ID or clicks meeting link
2. Frontend validates room and user permissions
3. Socket.IO connection established
4. User joins meeting room

### 4. Video Call Setup
1. WebRTC peer connections established
2. ICE candidates exchanged via Socket.IO
3. Media streams (video/audio) negotiated
4. Real-time communication begins

### 5. Meeting Management
1. Host controls meeting settings
2. Participants can mute/unmute, turn video on/off
3. Real-time chat and screen sharing
4. Meeting ends when host terminates

## 🔧 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Token refresh

### Meetings
- `GET /api/v1/meetings` - Get user meetings
- `POST /api/v1/meetings` - Create meeting
- `GET /api/v1/meetings/:roomId` - Get meeting details
- `POST /api/v1/meetings/:roomId/join` - Join meeting
- `PUT /api/v1/meetings/:meetingId` - Update meeting
- `DELETE /api/v1/meetings/:meetingId` - End meeting

### Participants
- `GET /api/v1/meetings/:meetingId/participants` - Get participants
- `PUT /api/v1/meetings/:meetingId/participants/:participantId/role` - Change role
- `DELETE /api/v1/meetings/:meetingId/participants/:participantId` - Remove participant

## 📡 Socket.IO Events

### Connection Events
- `connect` - Client connection established
- `disconnect` - Client disconnection
- `join_meeting` - Join meeting room
- `leave_meeting` - Leave meeting room

### WebRTC Signaling
- `webrtc_signal` - WebRTC signaling data
- `ice_candidate` - ICE candidate exchange
- `offer` - WebRTC offer
- `answer` - WebRTC answer

### Meeting Events
- `participant_joined` - New participant joined
- `participant_left` - Participant left
- `meeting_ended` - Meeting terminated
- `chat_message` - Chat message sent

## 🎨 UI Components

### Page Components
- **LandingPage** - Homepage with features
- **LoginPage** - User authentication
- **Dashboard** - User meeting dashboard
- **MeetingRoomPage** - Video call interface

### Meeting Components
- **VideoGrid** - Participant video layout
- **MeetingControls** - Mute, camera, screen share
- **ChatPanel** - Real-time messaging
- **ParticipantList** - Meeting participants
- **MeetingHeader** - Meeting information

### Common Components
- **Button** - Styled button component
- **Input** - Form input fields
- **Modal** - Overlay dialogs
- **Toast** - Notification messages

## 🔍 State Management

### Redux Store Structure
```typescript
{
  auth: {
    user: User | null,
    isAuthenticated: boolean,
    accessToken: string | null,
    refreshToken: string | null
  },
  meeting: {
    currentMeeting: Meeting | null,
    participants: Participant[],
    isInMeeting: boolean
  },
  participant: {
    contacts: Contact[],
    meetingHistory: MeetingHistory[]
  }
}
```

## 🚨 Current Issues & Fixes Needed

### Critical Issues (Ship Blockers)
1. **WebRTC Signal Routing** - Backend routes signals incorrectly
2. **Signal Emission** - Frontend doesn't emit WebRTC signals
3. **Security Vulnerability** - Critical npm vulnerabilities
4. **Peer Connection Setup** - Missing automatic negotiation

### Solutions in Progress
- Fix signal routing in `socketHandlers.ts`
- Connect WebRTC manager to socket
- Update vulnerable dependencies
- Implement proper offer/answer exchange

## 🎯 Deployment Strategy

### Development
- Local development with hot reloading
- MongoDB local instance
- Environment-specific configurations

### Production
- Docker containerization
- MongoDB Atlas for database
- HTTPS/WSS for secure connections
- CDN for static assets
- Load balancing for scalability

## 📊 Performance Considerations

### WebRTC Optimization
- Adaptive bitrate streaming
- Connection quality monitoring
- Bandwidth optimization
- ICE candidate optimization

### Application Performance
- Code splitting with Next.js
- Image optimization
- Caching strategies
- Bundle size optimization

## 🔐 Security Measures

### Authentication Security
- JWT token management
- Refresh token rotation
- Password hashing with bcrypt
- Session management

### Meeting Security
- Password-protected meetings
- Meeting lock functionality
- Role-based permissions
- End-to-end encryption

## 📈 Future Enhancements

### Planned Features
- Mobile app support
- Meeting recording
- Virtual backgrounds
- Breakout rooms
- Meeting analytics
- Integration APIs

### Technical Improvements
- Microservices architecture
- Better error handling
- Performance monitoring
- Automated testing
- CI/CD pipeline

## 🧪 Testing Strategy

### Unit Testing
- Component testing with Jest
- API endpoint testing
- Service layer testing
- WebRTC functionality testing

### Integration Testing
- End-to-end user flows
- Real-time communication testing
- Cross-browser compatibility
- Performance testing

## 📝 Development Guidelines

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Consistent naming conventions

### Git Workflow
- Feature branch development
- Code review process
- Conventional commits
- Automated testing

This documentation provides a comprehensive overview of the Video Meet application architecture, features, and implementation details. The project is designed to be scalable, secure, and maintainable while providing an excellent user experience for video conferencing.