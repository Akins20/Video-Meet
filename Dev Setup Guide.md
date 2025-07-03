# Video Meet - Development Environment Setup Guide

## 1. Development Environment Overview

### 1.1 Complete Development Stack
```
┌─────────────────────────────────────────────────────────────────┐
│                DEVELOPMENT ENVIRONMENT STACK                   │
├─────────────────────────────────────────────────────────────────┤
│ Development Tools                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │   VS Code   │ │   Docker    │ │  Postman    │               │
│ │   + Exts    │ │ Containers  │ │ API Testing │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Frontend Development                                            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │  Next.js    │ │  Electron   │ │ TypeScript  │               │
│ │   (Web)     │ │ (Desktop)   │ │   (Types)   │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Backend Development                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │   Node.js   │ │   Express   │ │ Socket.io   │               │
│ │     API     │ │ Framework   │ │  WebSocket  │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Database & Storage                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │  MongoDB    │ │    Redis    │ │   SQLite    │               │
│ │  (Cloud)    │ │  (Cache)    │ │  (Local)    │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Testing & Quality                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │    Jest     │ │ Playwright  │ │   ESLint    │               │
│ │ Unit Tests  │ │  E2E Tests  │ │  Linting    │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ DevOps & Deployment                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │GitHub Actions│ │   Docker    │ │   Railway   │               │
│ │    CI/CD     │ │ Compose     │ │  Deployment │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Project Structure Overview
```
video-meet/
├── packages/
│   ├── web/                    # Next.js Web Application
│   │   ├── src/
│   │   │   ├── app/           # App Router Pages
│   │   │   ├── components/    # React Components
│   │   │   ├── hooks/         # Custom Hooks
│   │   │   ├── store/         # Redux Store
│   │   │   ├── services/      # API Services
│   │   │   └── utils/         # Utilities
│   │   ├── public/            # Static Assets
│   │   └── package.json
│   │
│   ├── desktop/               # Electron Desktop Application
│   │   ├── src/
│   │   │   ├── main/          # Main Process
│   │   │   │   ├── services/  # Local Network Services
│   │   │   │   ├── database/  # SQLite Database
│   │   │   │   └── security/  # Encryption & Auth
│   │   │   ├── renderer/      # Renderer Process (React)
│   │   │   └── preload/       # IPC Bridge
│   │   ├── assets/            # Desktop Assets
│   │   ├── build/             # Build Configuration
│   │   └── package.json
│   │
│   ├── server/                # Node.js Backend Server
│   │   ├── src/
│   │   │   ├── routes/        # API Routes
│   │   │   ├── controllers/   # Request Controllers
│   │   │   ├── services/      # Business Logic
│   │   │   ├── models/        # Database Models
│   │   │   ├── middleware/    # Express Middleware
│   │   │   ├── websocket/     # Socket.io Handlers
│   │   │   └── utils/         # Server Utilities
│   │   └── package.json
│   │
│   └── shared/                # Shared Libraries
│       ├── types/             # TypeScript Types
│       ├── constants/         # Shared Constants
│       ├── protocols/         # Network Protocols
│       └── utils/             # Common Utilities
│
├── tools/                     # Development Tools
│   ├── scripts/               # Build Scripts
│   ├── docker/                # Docker Configurations
│   └── testing/               # Test Configurations
│
├── docs/                      # Documentation
│   ├── api/                   # API Documentation
│   ├── architecture/          # Architecture Docs
│   └── deployment/            # Deployment Guides
│
├── .github/                   # GitHub Actions
│   └── workflows/             # CI/CD Workflows
│
├── docker-compose.yml         # Local Development
├── package.json               # Root Package
└── README.md                  # Project README
```

## 2. Prerequisites & System Requirements

### 2.1 System Requirements
```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM REQUIREMENTS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Development Machine                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Operating System:                                           │ │
│ │ • Windows 10/11 (x64)                                       │ │
│ │ • macOS 10.15+ (Intel/Apple Silicon)                       │ │
│ │ • Linux (Ubuntu 20.04+, CentOS 8+)                        │ │
│ │                                                             │ │
│ │ Hardware:                                                   │ │
│ │ • CPU: Intel i5/AMD Ryzen 5 or better                     │ │
│ │ • RAM: 16GB minimum, 32GB recommended                      │ │
│ │ • Storage: 50GB free space (SSD recommended)               │ │
│ │ • Network: Stable internet connection                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Required Software                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Core Tools:                                                 │ │
│ │ • Node.js 18.17+ (LTS)                                     │ │
│ │ • npm 9+ or yarn 3+                                        │ │
│ │ • Git 2.40+                                                │ │
│ │ • Docker 24.0+ & Docker Compose                           │ │
│ │                                                             │ │
│ │ Development Tools:                                          │ │
│ │ • VS Code (recommended) or WebStorm                        │ │
│ │ • Postman or Insomnia (API testing)                       │ │
│ │ • MongoDB Compass (database GUI)                           │ │
│ │ • Git UI client (optional)                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Cloud Services                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Required Accounts:                                          │ │
│ │ • MongoDB Atlas (free tier)                                │ │
│ │ • GitHub (code repository)                                 │ │
│ │ • Railway/Render (deployment)                              │ │
│ │                                                             │ │
│ │ Optional Services:                                          │ │
│ │ • Cloudflare (CDN/DNS)                                     │ │
│ │ • AWS/GCP (advanced deployment)                            │ │
│ │ • Sentry (error monitoring)                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Development Environment Configuration
```
┌─────────────────────────────────────────────────────────────────┐
│                ENVIRONMENT CONFIGURATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Local Development Setup                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Port Allocation:                                            │ │
│ │ • Web App (Next.js): http://localhost:3000                 │ │
│ │ • API Server: http://localhost:5000                        │ │
│ │ • WebSocket: ws://localhost:5001                           │ │
│ │ • Desktop App Local Server: http://localhost:8080          │ │
│ │ • MongoDB: mongodb://localhost:27017                       │ │
│ │ • Redis: redis://localhost:6379                            │ │
│ │                                                             │ │
│ │ Network Configuration:                                      │ │
│ │ • STUN Server: stun:stun.l.google.com:19302               │ │
│ │ • TURN Server: turn:localhost:3478 (local testing)        │ │
│ │ • mDNS Service: _videomeet._tcp.local                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Environment Variables                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Backend (.env):                                             │ │
│ │ # Database                                                  │ │
│ │ MONGODB_URI=mongodb://localhost:27017/videomeet-dev        │ │
│ │ REDIS_URL=redis://localhost:6379                           │ │
│ │                                                             │ │
│ │ # Security                                                  │ │
│ │ JWT_SECRET=your-super-secret-jwt-key                       │ │
│ │ REFRESH_TOKEN_SECRET=your-refresh-token-secret             │ │
│ │ ENCRYPTION_KEY=your-32-character-encryption-key            │ │
│ │                                                             │ │
│ │ # WebRTC                                                    │ │
│ │ STUN_SERVER=stun:stun.l.google.com:19302                  │ │
│ │ TURN_SERVER=turn:localhost:3478                            │ │
│ │ TURN_USERNAME=videomeet                                    │ │
│ │ TURN_PASSWORD=secret123                                    │ │
│ │                                                             │ │
│ │ # Application                                               │ │
│ │ NODE_ENV=development                                        │ │
│ │ PORT=5000                                                   │ │
│ │ FRONTEND_URL=http://localhost:3000                         │ │
│ │ ENABLE_LOCAL_NETWORK=true                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Step-by-Step Setup Instructions

### 3.1 Initial System Setup
```bash
# 1. Install Node.js (using nvm - recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18.17.0
nvm use 18.17.0
nvm alias default 18.17.0

# 2. Install global dependencies
npm install -g yarn typescript @electron/rebuild

# 3. Install Docker (platform-specific)
# Windows: Download Docker Desktop
# macOS: Download Docker Desktop
# Linux: 
sudo apt update
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER

# 4. Verify installations
node --version    # Should be 18.17+
npm --version     # Should be 9+
docker --version  # Should be 24.0+
git --version     # Should be 2.40+
```

### 3.2 Project Setup & Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-org/video-meet.git
cd video-meet

# 2. Install root dependencies
yarn install

# 3. Install package dependencies
yarn workspace @videomeet/web install
yarn workspace @videomeet/server install
yarn workspace @videomeet/desktop install
yarn workspace @videomeet/shared install

# 4. Set up environment variables
cp packages/server/.env.example packages/server/.env
cp packages/web/.env.example packages/web/.env.local
cp packages/desktop/.env.example packages/desktop/.env

# 5. Generate development certificates (for HTTPS)
yarn setup:certs

# 6. Initialize databases
yarn setup:database

# 7. Build shared packages
yarn workspace @videomeet/shared build
```

### 3.3 Database Setup
```bash
# 1. Start Docker services
docker-compose up -d mongodb redis

# 2. Wait for services to be ready (check with)
docker-compose logs mongodb
docker-compose logs redis

# 3. Initialize MongoDB
yarn db:init

# 4. Seed development data
yarn db:seed

# 5. Verify database connection
yarn db:status
```

### 3.4 Development Server Startup
```bash
# Option 1: Start all services with one command
yarn dev

# Option 2: Start services individually (different terminals)
# Terminal 1 - Backend API
yarn workspace @videomeet/server dev

# Terminal 2 - Web Frontend
yarn workspace @videomeet/web dev

# Terminal 3 - Desktop App
yarn workspace @videomeet/desktop dev

# Terminal 4 - Electron App (after desktop build)
yarn workspace @videomeet/desktop electron:dev
```

## 4. Development Workflow

### 4.1 Code Development Workflow
```
┌─────────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Feature Development                                          │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│    │   Create    │───►│   Code      │───►│    Test     │       │
│    │   Branch    │    │  Changes    │    │  Changes    │       │
│    └─────────────┘    └─────────────┘    └─────────────┘       │
│                                                                 │
│ 2. Code Quality Checks                                          │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│    │   ESLint    │───►│ TypeScript  │───►│   Tests     │       │
│    │   Check     │    │   Check     │    │   Pass      │       │
│    └─────────────┘    └─────────────┘    └─────────────┘       │
│                                                                 │
│ 3. Integration Testing                                          │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│    │   Local     │───►│    API      │───►│   E2E       │       │
│    │   Build     │    │   Tests     │    │   Tests     │       │
│    └─────────────┘    └─────────────┘    └─────────────┘       │
│                                                                 │
│ 4. Code Review & Merge                                          │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│    │    Pull     │───►│    Code     │───►│   Merge     │       │
│    │   Request   │    │   Review    │    │ to Main     │       │
│    └─────────────┘    └─────────────┘    └─────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Git Workflow & Branch Strategy
```
Main Branch (main)
     │
     ├─── Feature Branch (feature/desktop-discovery)
     │    │
     │    ├─── Commits: Add mDNS service
     │    ├─── Commits: Implement device registry
     │    └─── Commits: Add discovery UI
     │
     ├─── Feature Branch (feature/file-sharing)
     │    │
     │    ├─── Commits: Add file transfer protocol
     │    ├─── Commits: Implement P2P file sharing
     │    └─── Commits: Add progress tracking
     │
     ├─── Bugfix Branch (bugfix/connection-timeout)
     │    │
     │    └─── Commits: Fix WebRTC timeout issue
     │
     └─── Release Branch (release/v2.0.0)
          │
          ├─── Commits: Version bump
          ├─── Commits: Update documentation
          └─── Commits: Final bug fixes

Branch Naming Convention:
• feature/[feature-name] - New features
• bugfix/[issue-description] - Bug fixes
• hotfix/[critical-fix] - Critical production fixes
• release/[version] - Release preparation
• docs/[documentation-update] - Documentation changes
```

### 4.3 Testing Strategy
```bash
# Unit Tests
yarn test:unit                    # All unit tests
yarn test:unit --watch           # Watch mode
yarn test:unit --coverage        # With coverage

# Integration Tests  
yarn test:integration            # API integration tests
yarn test:integration:desktop    # Desktop integration tests

# End-to-End Tests
yarn test:e2e                    # Full E2E suite
yarn test:e2e:web                # Web app E2E
yarn test:e2e:desktop            # Desktop app E2E

# Network Tests (Local Network Features)
yarn test:network                # mDNS and P2P tests
yarn test:network:discovery      # Device discovery tests
yarn test:network:connection     # Connection establishment

# Performance Tests
yarn test:performance            # Load and stress tests
yarn test:performance:webrtc     # WebRTC performance tests

# Security Tests
yarn test:security               # Security vulnerability tests
yarn test:security:encryption    # Encryption validation tests
```

## 5. Debugging & Development Tools

### 5.1 Debugging Configuration
```
┌─────────────────────────────────────────────────────────────────┐
│                    DEBUGGING SETUP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ VS Code Configuration (.vscode/launch.json)                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ {                                                           │ │
│ │   "version": "0.2.0",                                       │ │
│ │   "configurations": [                                       │ │
│ │     {                                                       │ │
│ │       "name": "Debug Server",                               │ │
│ │       "type": "node",                                       │ │
│ │       "request": "launch",                                  │ │
│ │       "program": "${workspaceFolder}/packages/server/src/index.ts", │ │
│ │       "env": { "NODE_ENV": "development" },                 │ │
│ │       "runtimeArgs": ["-r", "ts-node/register"],           │ │
│ │       "skipFiles": ["<node_internals>/**"]                  │ │
│ │     },                                                      │ │
│ │     {                                                       │ │
│ │       "name": "Debug Desktop Main",                         │ │
│ │       "type": "node",                                       │ │
│ │       "request": "launch",                                  │ │
│ │       "program": "${workspaceFolder}/packages/desktop/src/main/index.ts", │ │
│ │       "env": { "ELECTRON_IS_DEV": "1" }                     │ │
│ │     }                                                       │ │
│ │   ]                                                         │ │
│ │ }                                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Browser DevTools                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Web Application:                                            │ │
│ │ • Chrome DevTools (F12)                                     │ │
│ │ • React Developer Tools                                     │ │
│ │ • Redux DevTools Extension                                  │ │
│ │ • Network tab for API calls                                 │ │
│ │ • Console for WebRTC debugging                              │ │
│ │                                                             │ │
│ │ Desktop Application:                                        │ │
│ │ • Electron DevTools (Ctrl+Shift+I)                        │ │
│ │ • Main process debugging via VS Code                       │ │
│ │ • IPC message tracing                                       │ │
│ │ • Local network activity monitoring                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Local Network Testing Setup
```bash
# 1. Set up multiple virtual network interfaces (for testing)
# Linux/macOS:
sudo ifconfig lo0 alias 192.168.100.10
sudo ifconfig lo0 alias 192.168.100.11

# Windows (run as Administrator):
netsh interface ip add address "Loopback Pseudo-Interface 1" 192.168.100.10 255.255.255.0
netsh interface ip add address "Loopback Pseudo-Interface 1" 192.168.100.11 255.255.255.0

# 2. Start multiple desktop app instances for testing
DEVICE_ID=device-001 DISCOVERY_PORT=8080 yarn workspace @videomeet/desktop dev
DEVICE_ID=device-002 DISCOVERY_PORT=8081 yarn workspace @videomeet/desktop dev
DEVICE_ID=device-003 DISCOVERY_PORT=8082 yarn workspace @videomeet/desktop dev

# 3. Test mDNS discovery
yarn test:mdns

# 4. Monitor network traffic
# Install Wireshark for packet analysis
# Use built-in network monitoring tools
yarn dev:network-monitor
```

## 6. Common Development Tasks

### 6.1 Frequently Used Commands
```bash
# Development
yarn dev                         # Start all development servers
yarn dev:web                     # Start web app only
yarn dev:server                  # Start API server only
yarn dev:desktop                 # Start desktop app only

# Building
yarn build                       # Build all packages
yarn build:web                   # Build web app for production
yarn build:server               # Build server for production
yarn build:desktop              # Build desktop app for distribution

# Testing
yarn test                        # Run all tests
yarn test:watch                  # Run tests in watch mode
yarn test:coverage               # Generate test coverage report

# Code Quality
yarn lint                        # Run ESLint on all packages
yarn lint:fix                    # Fix ESLint issues automatically
yarn typecheck                   # TypeScript type checking
yarn format                      # Format code with Prettier

# Database
yarn db:reset                    # Reset development database
yarn db:migrate                  # Run database migrations
yarn db:seed                     # Seed with test data

# Desktop Development
yarn desktop:build               # Build desktop app
yarn desktop:pack                # Package for current platform
yarn desktop:dist                # Create distribution packages
yarn desktop:rebuild             # Rebuild native modules

# Network Development
yarn network:discover            # Test device discovery
yarn network:test-p2p           # Test P2P connections
yarn network:monitor            # Monitor network activity
```

### 6.2 Troubleshooting Guide
```
┌─────────────────────────────────────────────────────────────────┐
│                   COMMON ISSUES & SOLUTIONS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Installation Issues                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Problem: Node modules fail to install                       │ │
│ │ Solution: Clear cache and reinstall                         │ │
│ │   $ yarn cache clean                                        │ │
│ │   $ rm -rf node_modules package-lock.json                   │ │
│ │   $ yarn install                                            │ │
│ │                                                             │ │
│ │ Problem: Electron rebuild fails                             │ │
│ │ Solution: Rebuild native modules                            │ │
│ │   $ yarn workspace @videomeet/desktop electron:rebuild      │ │
│ │                                                             │ │
│ │ Problem: Docker services won't start                        │ │
│ │ Solution: Check ports and restart Docker                    │ │
│ │   $ docker-compose down                                     │ │
│ │   $ docker system prune                                     │ │
│ │   $ docker-compose up -d                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Development Issues                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Problem: WebRTC connections fail                            │ │
│ │ Solution: Check STUN/TURN configuration                     │ │
│ │   • Verify STUN_SERVER in .env                             │ │
│ │   • Check firewall settings                                │ │
│ │   • Test with chrome://webrtc-internals/                   │ │
│ │                                                             │ │
│ │ Problem: mDNS discovery not working                         │ │
│ │ Solution: Check network permissions                         │ │
│ │   • Enable multicast on network interface                  │ │
│ │   • Check firewall allows UDP 5353                         │ │
│ │   • Verify Bonjour service is running                      │ │
│ │                                                             │ │
│ │ Problem: Database connection errors                         │ │
│ │ Solution: Verify database services                          │ │
│ │   $ docker-compose ps                                       │ │
│ │   $ yarn db:status                                          │ │
│ │   • Check MONGODB_URI in .env                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This comprehensive development environment setup guide provides everything needed to get Video Meet development up and running locally, including support for the enhanced desktop and local network features.