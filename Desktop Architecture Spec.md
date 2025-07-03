# Video Meet - Desktop Application Architecture

## 1. Overall System Architecture

### 1.1 Multi-Platform Desktop Application Stack
```
┌─────────────────────────────────────────────────────────────────┐
│                    DESKTOP APPLICATION                         │
├─────────────────────────────────────────────────────────────────┤
│ Platform Layer                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │   Windows   │ │    macOS    │ │    Linux    │               │
│ │   (MSI)     │ │    (DMG)    │ │ (AppImage)  │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Electron Framework (v28+)                                      │
│ ┌─────────────────────┐ ┌─────────────────────────────────────┐ │
│ │   Main Process      │ │      Renderer Process              │ │
│ │   (Node.js)         │ │      (Chromium)                    │ │
│ │                     │ │                                     │ │
│ │ • App Lifecycle     │ │ • React UI (Next.js)               │ │
│ │ • System Tray       │ │ • Redux Store                      │ │
│ │ • Local Network     │ │ • WebRTC Client                    │ │
│ │ • File System       │ │ • Desktop UI Components            │ │
│ │ • SQLite DB         │ │ • Local Network Interface          │ │
│ │ • Auto Updater      │ │ • File Sharing UI                  │ │
│ └─────────────────────┘ └─────────────────────────────────────┘ │
│           │                           │                         │
│           └─────── IPC Bridge ────────┘                         │
├─────────────────────────────────────────────────────────────────┤
│ Local Services Layer                                            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │ mDNS Service│ │ P2P Server  │ │File Transfer│               │
│ │ Discovery   │ │ WebRTC/HTTP │ │ Service     │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Network Layer                                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │Local Network│ │Cloud Server │ │ Hybrid Mode │               │
│ │(LAN/WiFi)   │ │ (Internet)  │ │(Local+Cloud)│               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Process Architecture & Communication Flow
```
┌─────────────────────┐          ┌─────────────────────────────────┐
│   MAIN PROCESS      │   IPC    │      RENDERER PROCESS           │
│   (Node.js)         │◄────────►│      (Chromium)                 │
│                     │          │                                 │
│ ┌─────────────────┐ │          │ ┌─────────────────────────────┐ │
│ │ App Manager     │ │          │ │ React Application           │ │
│ │ • Window Mgmt   │ │          │ │ • Meeting UI                │ │
│ │ • System Tray   │ │          │ │ • Local Network Interface   │ │
│ │ • Auto Start    │ │          │ │ • File Sharing UI           │ │
│ └─────────────────┘ │          │ └─────────────────────────────┘ │
│                     │          │                                 │
│ ┌─────────────────┐ │          │ ┌─────────────────────────────┐ │
│ │ Network Service │ │          │ │ Desktop Components          │ │
│ │ • mDNS          │ │          │ │ • System Notifications      │ │
│ │ • P2P Server    │ │          │ │ • Native File Dialogs       │ │
│ │ • Device Reg    │ │          │ │ • Hotkey Handlers           │ │
│ └─────────────────┘ │          │ └─────────────────────────────┘ │
│                     │          │                                 │
│ ┌─────────────────┐ │          │ ┌─────────────────────────────┐ │
│ │ Local Database  │ │          │ │ State Management            │ │
│ │ • SQLite        │ │          │ │ • Redux Store               │ │
│ │ • File Storage  │ │          │ │ • WebRTC Manager            │ │
│ │ • Sync Engine   │ │          │ │ • Socket Client             │ │
│ └─────────────────┘ │          │ └─────────────────────────────┘ │
└─────────────────────┘          └─────────────────────────────────┘
         │                                        │
         └─────────── Secure IPC Channel ────────┘
```

## 2. Local Network Architecture

### 2.1 Device Discovery & Service Announcement
```
                    Local Network (192.168.1.0/24)
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Device A          Device B           Device C          Router  │
│ ┌─────────┐      ┌─────────┐       ┌─────────┐       ┌───────┐  │
│ │VideoMeet│      │VideoMeet│       │VideoMeet│       │       │  │
│ │App      │      │App      │       │App      │       │ WiFi  │  │
│ │.100     │      │.101     │       │.102     │       │Gateway│  │
│ └─────────┘      └─────────┘       └─────────┘       │.1     │  │
│      │                │                 │            └───────┘  │
│      │                │                 │                 │     │
│      └────────────────┼─────────────────┼─────────────────┘     │
│                       │                 │                       │
│         mDNS Broadcast│Query            │mDNS Response          │
│    "_videomeet._tcp"  │                 │                       │
│                       │                 │                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    mDNS Service Registry
                ┌─────────────────────────────┐
                │ Service: _videomeet._tcp    │
                │ ├─ John's MacBook (.100)    │
                │ ├─ Alice's PC (.101)        │
                │ └─ Bob's iMac (.102)        │
                └─────────────────────────────┘
```

### 2.2 P2P Connection Establishment Flow
```
Device A (Host)                              Device B (Participant)
┌─────────────┐                              ┌─────────────┐
│   Meeting   │                              │  Discovery  │
│  Creation   │                              │   Browser   │
└─────┬───────┘                              └─────┬───────┘
      │                                            │
      │ 1. Announce Meeting Service                │
      ├─────────── mDNS Broadcast ────────────────►│
      │   "_videomeet-meeting._tcp"                │
      │                                            │
      │                                            │ 2. Show Available
      │                                            │    Meetings
      │                                            │
      │ 3. Join Request                            │
      │◄────────── HTTP POST ──────────────────────┤
      │   /local/v1/meetings/join                  │
      │                                            │
      │ 4. WebRTC Offer                           │
      ├─────────── WebSocket ─────────────────────►│
      │   {type: "offer", sdp: "..."}              │
      │                                            │
      │ 5. WebRTC Answer                          │
      │◄────────── WebSocket ──────────────────────┤
      │   {type: "answer", sdp: "..."}             │
      │                                            │
      │ 6. ICE Candidates Exchange                 │
      │◄─────────── WebSocket ─────────────────────►│
      │                                            │
      │ 7. Direct P2P Connection Established      │
      │◄═══════════ WebRTC ════════════════════════►│
      │            Video/Audio/Data                │
      │                                            │
```

### 2.3 Hybrid Network Architecture (Local + Cloud)
```
                Cloud Network                    Local Network
┌─────────────────────────────────┐    ┌─────────────────────────────┐
│                                 │    │                             │
│  Remote                         │    │   Office Team               │
│ Participant                     │    │                             │
│ ┌─────────┐                     │    │ ┌─────────┐ ┌─────────┐     │
│ │ Web App │                     │    │ │Desktop  │ │Desktop  │     │
│ │ (Alice) │                     │    │ │App (Bob)│ │App(Carl)│     │
│ └─────────┘                     │    │ └─────────┘ └─────────┘     │
│      │                          │    │      │           │         │
│      │                          │    │      └─────┬─────┘         │
│      │                          │    │            │               │
│      │         Internet         │    │     Local P2P              │
│      │            │             │    │      Connection            │
│      └────────────┼─────────────┘    │                             │
│                   │                  │                             │
│                   ▼                  │                             │
│         ┌─────────────────┐          │                             │
│         │ Cloud Server    │          │                             │
│         │ (Video Meet)    │◄─────────┼─── Bridge Connection ──────┤
│         │                 │          │     (Desktop App)           │
│         └─────────────────┘          │                             │
│                                      │                             │
└─────────────────────────────────────┘    └─────────────────────────┘

Connection Types:
• Alice ↔ Server: WebRTC via cloud (Internet)
• Bob ↔ Carl: Direct P2P (Local network)
• Alice ↔ Bob/Carl: Relayed via bridge device
```

## 3. Data Flow Architecture

### 3.1 Local vs Cloud Data Synchronization
```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Desktop Application                   Cloud Server              │
│ ┌─────────────────┐                  ┌─────────────────┐        │
│ │ Local Database  │                  │ MongoDB Atlas   │        │
│ │   (SQLite)      │                  │   (Primary)     │        │
│ │                 │◄─── Sync ──────► │                 │        │
│ │ • User Profile  │    Engine        │ • User Accounts │        │
│ │ • Local Meetings│                  │ • Cloud Meetings│        │
│ │ • Device Config │                  │ • Global Settings│       │
│ │ • File Cache    │                  │ • Analytics     │        │
│ └─────────────────┘                  └─────────────────┘        │
│          │                                    │                 │
│          ▼                                    ▼                 │
│ ┌─────────────────┐                  ┌─────────────────┐        │
│ │ In-Memory Cache │                  │ Redis Cache     │        │
│ │                 │                  │                 │        │
│ │ • Active Devices│                  │ • Sessions      │        │
│ │ • Network State │                  │ • Real-time Data│        │
│ │ • P2P Sessions  │                  │ • API Cache     │        │
│ └─────────────────┘                  └─────────────────┘        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     SYNCHRONIZATION FLOW                       │
│                                                                 │
│  Offline Mode          Online Mode         Conflict Resolution  │
│ ┌─────────────┐     ┌─────────────┐      ┌─────────────┐       │
│ │Local Storage│────►│Background   │─────►│Last Write   │       │
│ │Only         │     │Sync Queue   │      │Wins Strategy│       │
│ └─────────────┘     └─────────────┘      └─────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 File Storage Architecture
```
Desktop Application File System
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│ User Home Directory                                             │
│ └── VideoMeet/                                                  │
│     ├── Database/                                               │
│     │   ├── main.db           (User profiles, settings)         │
│     │   ├── meetings.db       (Local meeting history)           │
│     │   └── cache.db          (Discovery cache, temp data)      │
│     │                                                           │
│     ├── Files/                                                  │
│     │   ├── Shared/           (Files shared in meetings)        │
│     │   │   ├── incoming/     (Files received from others)      │
│     │   │   └── outgoing/     (Files being shared)             │
│     │   ├── Recordings/       (Local meeting recordings)        │
│     │   └── Avatars/          (Cached user avatars)            │
│     │                                                           │
│     ├── Logs/                                                   │
│     │   ├── app.log          (Application logs)                │
│     │   ├── network.log      (Network operations)              │
│     │   └── transfer.log     (File transfer logs)              │
│     │                                                           │
│     └── Config/                                                 │
│         ├── settings.json    (User preferences)                │
│         ├── devices.json     (Trusted devices)                 │
│         └── certificates/    (Security certificates)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Security Architecture

### 4.1 Desktop Application Security Model
```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Code Signing & Distribution                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │   Windows   │ │    macOS    │ │    Linux    │               │
│ │ Authenticode│ │Apple Notary │ │  GPG Sign   │               │
│ │ Certificate │ │& Code Sign  │ │ (Optional)  │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Local Network Security                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Device Authentication                                       │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │ │
│ │ │Certificate  │ │   Device    │ │   Trust     │           │ │
│ │ │   Based     │ │    Keys     │ │  Levels     │           │ │
│ │ │    PKI      │ │  (Ed25519)  │ │Management   │           │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Communication Encryption                                    │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │ │
│ │ │   WebRTC    │ │    HTTPS    │ │  WebSocket  │           │ │
│ │ │ DTLS/SRTP   │ │   TLS 1.3   │ │  WSS (TLS)  │           │ │
│ │ │(Automatic)  │ │             │ │             │           │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Data Protection                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │Local Database│ │File Storage │ │ User Data   │               │
│ │Encryption   │ │Encryption   │ │ Privacy     │               │
│ │(SQLCipher)  │ │(AES-256)    │ │ Controls    │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Deployment Architecture

### 5.1 Multi-Platform Distribution Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│                 DEPLOYMENT & DISTRIBUTION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Build Pipeline                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Source Code (GitHub)                                        │ │
│ │           │                                                 │ │
│ │           ▼                                                 │ │
│ │ ┌─────────────────┐                                         │ │
│ │ │ GitHub Actions  │                                         │ │
│ │ │                 │                                         │ │
│ │ │ ┌─────────────┐ │ ┌─────────────┐ ┌─────────────┐       │ │
│ │ │ │Windows Build│ │ │ macOS Build │ │Linux Build  │       │ │
│ │ │ │   (MSI)     │ │ │   (DMG)     │ │ (AppImage)  │       │ │
│ │ │ └─────────────┘ │ └─────────────┘ └─────────────┘       │ │
│ │ └─────────────────┘                                         │ │
│ │           │                                                 │ │
│ │           ▼                                                 │ │
│ │ ┌─────────────────┐                                         │ │
│ │ │Code Signing &   │                                         │ │
│ │ │   Notarization  │                                         │ │
│ │ └─────────────────┘                                         │ │
│ │           │                                                 │ │
│ │           ▼                                                 │ │
│ │ ┌─────────────────┐                                         │ │
│ │ │   Distribution  │                                         │ │
│ │ │    Channels     │                                         │ │
│ │ └─────────────────┘                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Distribution Channels                                           │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │   Direct    │ │   Windows   │ │    macOS    │               │
│ │  Download   │ │   Store     │ │ App Store   │               │
│ │  (Website)  │ │ (Optional)  │ │ (Optional)  │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │    Linux    │ │   Package   │ │    Auto     │               │
│ │ Repositories│ │  Managers   │ │  Updater    │               │
│ │(Snap/Flatpak)│ │(Chocolatey) │ │  Service    │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This comprehensive architecture documentation provides the foundation for desktop application development with clear diagrams showing system components, data flow, security model, and deployment strategy.