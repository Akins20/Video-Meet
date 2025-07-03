# Video Meet - Local Network Protocol Specification

## 1. Protocol Stack Overview

### 1.1 Communication Layer Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    PROTOCOL STACK                              │
├─────────────────────────────────────────────────────────────────┤
│ Application Layer                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │ Video Meet  │ │ File Share  │ │ Chat & Meta │               │
│ │ Protocol    │ │ Protocol    │ │ Protocol    │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Transport Layer                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │   WebRTC    │ │ WebSocket   │ │    HTTP     │               │
│ │ DataChannel │ │   (WSS)     │ │   (HTTPS)   │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Network Layer                                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │    ICE      │ │     TCP     │ │     UDP     │               │
│ │   (STUN)    │ │             │ │             │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Discovery Layer                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │    mDNS     │ │  Broadcast  │ │   Manual    │               │
│ │  (Bonjour)  │ │  Discovery  │ │ IP Connect  │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Physical Layer                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │   WiFi      │ │  Ethernet   │ │   Hotspot   │               │
│ │ 802.11a/b/g │ │ 10/100/1000 │ │   Mobile    │               │
│ │    /n/ac    │ │    Mbps     │ │ Tethering   │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Discovery Protocol Flow
```
Device A                    Network                    Device B
┌─────────┐                ┌─────────┐                ┌─────────┐
│VideoMeet│                │ Router/ │                │VideoMeet│
│   App   │                │ Switch  │                │   App   │
└─────────┘                └─────────┘                └─────────┘
     │                          │                          │
     │ 1. Service Registration   │                          │
     ├─── mDNS Announce ────────┤                          │
     │   "_videomeet._tcp"       │                          │
     │                          │                          │
     │                          │ 2. Service Discovery     │
     │                          │◄─── mDNS Query ──────────┤
     │                          │    "_videomeet._tcp"     │
     │                          │                          │
     │ 3. Service Response       │                          │
     ├─── mDNS Response ────────┤─── Forward Response ────►│
     │   "John's MacBook"        │                          │
     │                          │                          │
     │                          │ 4. Service Resolution    │
     │                          │◄─── SRV/TXT Query ───────┤
     │                          │                          │
     │ 5. Connection Details     │                          │
     ├─── IP + Port + TXT ──────┤─── Forward Details ─────►│
     │   192.168.1.100:8080     │                          │
     │                          │                          │
     │ 6. Direct HTTP Request    │                          │
     │◄────────── GET /status ──┤◄─────────────────────────┤
     │                          │                          │
     │ 7. Device Information     │                          │
     ├─────────── Response ─────┤─────────────────────────►│
     │   {user, capabilities}    │                          │
```

## 2. mDNS Service Discovery Protocol

### 2.1 Service Registration Format
```
Service Type: _videomeet._tcp.local
Service Instance: {UserName}'s {DeviceName}._videomeet._tcp.local

Example: John Doe's MacBook Pro._videomeet._tcp.local

SRV Record:
┌─────────────────────────────────────────────────────────────────┐
│ _videomeet._tcp.local    SRV 0 5 8080 johns-macbook.local      │
│                                                                 │
│ Priority: 0 (highest)                                           │
│ Weight: 5 (load balancing)                                      │
│ Port: 8080 (service port)                                       │
│ Target: johns-macbook.local (hostname)                          │
└─────────────────────────────────────────────────────────────────┘

TXT Record:
┌─────────────────────────────────────────────────────────────────┐
│ _videomeet._tcp.local    TXT "version=2.0"                     │
│                              "user=John Doe"                   │
│                              "device=macbook-pro-123"          │
│                              "status=available"                │
│                              "participants=0"                  │
│                              "maxparticipants=10"              │
│                              "capabilities=video,audio,share"   │
│                              "secure=true"                     │
│                              "meeting=none"                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Discovery State Machine
```
┌─────────────────────────────────────────────────────────────────┐
│                 SERVICE DISCOVERY STATES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│        ┌─────────────┐                                          │
│        │   OFFLINE   │                                          │
│        │             │                                          │
│        └─────┬───────┘                                          │
│              │ App Start                                        │
│              ▼                                                  │
│        ┌─────────────┐                                          │
│        │ REGISTERING │                                          │
│        │             │──── Registration Failed ────┐           │
│        └─────┬───────┘                              │           │
│              │ Registration Success                 │           │
│              ▼                                      │           │
│        ┌─────────────┐                              │           │
│   ┌───►│ DISCOVERABLE│                              │           │
│   │    │             │                              │           │
│   │    └─────┬───────┘                              │           │
│   │          │ Start Discovery                      │           │
│   │          ▼                                      │           │
│   │    ┌─────────────┐     Network Lost            │           │
│   │    │ DISCOVERING │─────────────────────────────┤           │
│   │    │             │                              │           │
│   │    └─────┬───────┘                              │           │
│   │          │ Devices Found                        │           │
│   │          ▼                                      │           │
│   │    ┌─────────────┐                              │           │
│   └────┤   ACTIVE    │                              │           │
│        │             │                              │           │
│        └─────┬───────┘                              │           │
│              │ Connection Lost/App Close            │           │
│              ▼                                      │           │
│        ┌─────────────┐                              │           │
│        │UNREGISTERING│◄─────────────────────────────┘           │
│        │             │                                          │
│        └─────┬───────┘                                          │
│              │                                                  │
│              ▼                                                  │
│        ┌─────────────┐                                          │
│        │   OFFLINE   │                                          │
│        └─────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Peer-to-Peer Connection Protocol

### 3.1 Connection Establishment Sequence
```
Host Device                 Guest Device               STUN Server
┌─────────────┐            ┌─────────────┐            ┌─────────────┐
│   Device A  │            │   Device B  │            │STUN/TURN Srv│
│192.168.1.100│            │192.168.1.101│            │Public Server│
└─────────────┘            └─────────────┘            └─────────────┘
      │                          │                          │
      │ 1. Meeting Creation      │                          │
      ├─ mDNS Announce ─────────►│                          │
      │   "Team Meeting"         │                          │
      │                          │                          │
      │ 2. Join Request          │                          │
      │◄─ HTTP POST ─────────────┤                          │
      │   /meetings/join         │                          │
      │                          │                          │
      │ 3. ICE Gathering         │                          │
      ├─ STUN Request ──────────┼─────────────────────────►│
      │                          │                          │
      │ 4. ICE Candidates        │                          │
      │◄─ STUN Response ─────────┼──────────────────────────┤
      │                          │                          │
      │ 5. WebRTC Offer          │                          │
      ├─ WebSocket ─────────────►│                          │
      │   {sdp, candidates}      │                          │
      │                          │                          │
      │                          │ 6. ICE Gathering         │
      │                          ├─ STUN Request ──────────►│
      │                          │                          │
      │                          │ 7. ICE Candidates        │
      │                          │◄─ STUN Response ─────────┤
      │                          │                          │
      │ 8. WebRTC Answer         │                          │
      │◄─ WebSocket ─────────────┤                          │
      │   {sdp, candidates}      │                          │
      │                          │                          │
      │ 9. ICE Connectivity      │                          │
      │◄═══ ICE Checks ═════════►│                          │
      │                          │                          │
      │ 10. Direct P2P Media     │                          │
      │◄═══ RTP/SRTP ═══════════►│                          │
      │    Video/Audio           │                          │
```

### 3.2 Connection Fallback Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│                 CONNECTION FALLBACK CHAIN                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Host Candidate (Same Network)                               │
│    ┌─────────────┐ ──── Direct LAN ───► ┌─────────────┐        │
│    │  Device A   │    192.168.1.x       │  Device B   │        │
│    │192.168.1.100│◄──── Connection ─────│192.168.1.101│        │
│    └─────────────┘                      └─────────────┘        │
│                                                                 │
│                           │ Fail                                │
│                           ▼                                     │
│                                                                 │
│ 2. Server Reflexive (NAT Traversal)                            │
│    ┌─────────────┐ ──── STUN Server ───► ┌─────────────┐        │
│    │  Device A   │    Public IP via       │  Device B   │        │
│    │  (NAT'd)    │◄──── NAT Hole ────────│  (NAT'd)    │        │
│    └─────────────┘                       └─────────────┘        │
│                                                                 │
│                           │ Fail                                │
│                           ▼                                     │
│                                                                 │
│ 3. Relay Candidate (TURN Server)                               │
│    ┌─────────────┐ ──── TURN Relay ────► ┌─────────────┐        │
│    │  Device A   │     Server Relay      │  Device B   │        │
│    │(Firewalled) │◄──── Connection ──────│(Firewalled) │        │
│    └─────────────┘                       └─────────────┘        │
│                                                                 │
│                           │ Fail                                │
│                           ▼                                     │
│                                                                 │
│ 4. Cloud Server Fallback                                       │
│    ┌─────────────┐ ──── Cloud SFU ─────► ┌─────────────┐        │
│    │  Device A   │      Video Meet       │  Device B   │        │
│    │             │◄──── Server ──────────│             │        │
│    └─────────────┘                       └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4. File Sharing Protocol

### 4.1 File Transfer Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                   FILE SHARING PROTOCOL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Sender Device              Transfer Layer              Receiver │
│ ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│ │File Selection│          │ WebRTC Data │          │File Receive │
│ │& Preparation │          │  Channel    │          │& Validation │
│ └─────┬───────┘           └─────────────┘          └─────────────┘
│       │                                                    ▲     │
│       ▼                                                    │     │
│ ┌─────────────┐                                      ┌─────────────┐
│ │Chunk & Hash │                                      │Chunk Verify │
│ │  (64KB)     │                                      │& Reassemble │
│ └─────┬───────┘                                      └─────────────┘
│       │                                                    ▲     │
│       ▼                                                    │     │
│ ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │     │
│ │Queue Manager│────►│   Network   │────►│Queue Manager│───┘     │
│ │& Bandwidth  │     │ Transmission│     │& Assembly   │         │
│ │ Control     │     │  Protocol   │     │   Queue     │         │
│ └─────────────┘     └─────────────┘     └─────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 File Transfer Protocol Flow
```
Sender                                              Receiver
┌─────────────┐                                    ┌─────────────┐
│   Device A  │                                    │   Device B  │
│             │                                    │             │
└─────────────┘                                    └─────────────┘
      │                                                  │
      │ 1. File Selection & Announce                     │
      ├─── FILE_OFFER Message ─────────────────────────►│
      │    {filename, size, hash, id}                    │
      │                                                  │
      │ 2. User Accepts/Rejects                          │
      │◄─── FILE_RESPONSE Message ──────────────────────┤
      │    {accept: true, transferId}                    │
      │                                                  │
      │ 3. Transfer Initialization                       │
      ├─── TRANSFER_START Message ──────────────────────►│
      │    {chunkSize: 64KB, totalChunks: 156}           │
      │                                                  │
      │ 4. Chunked Data Transfer                         │
      ├─── CHUNK_DATA[0] ───────────────────────────────►│
      │    {id: 0, data: base64, hash: sha256}           │
      │                                                  │
      │ 5. Chunk Acknowledgment                          │
      │◄─── CHUNK_ACK[0] ────────────────────────────────┤
      │    {id: 0, status: "received"}                   │
      │                                                  │
      │ 6. Continue Transfer...                          │
      ├─── CHUNK_DATA[1] ───────────────────────────────►│
      ├─── CHUNK_DATA[2] ───────────────────────────────►│
      │    ...                                           │
      │                                                  │
      │ 7. Transfer Complete                             │
      ├─── TRANSFER_COMPLETE Message ───────────────────►│
      │    {totalChunks: 156, finalHash: sha256}         │
      │                                                  │
      │ 8. File Verification                             │
      │◄─── TRANSFER_VERIFIED Message ───────────────────┤
      │    {status: "verified", savedPath: "/path"}      │
```

### 4.3 File Transfer State Management
```
┌─────────────────────────────────────────────────────────────────┐
│                FILE TRANSFER STATE MACHINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│       ┌─────────────┐                                           │
│       │   PENDING   │                                           │
│       │ (Announced) │                                           │
│       └─────┬───────┘                                           │
│             │ Accept                                            │
│             ▼                                                   │
│       ┌─────────────┐      ┌─────────────┐                     │
│   ┌──►│ TRANSFERRING│─────►│   PAUSED    │                     │
│   │   │             │      │             │                     │
│   │   └─────┬───────┘      └─────┬───────┘                     │
│   │         │                    │ Resume                      │
│   │         │ Complete           └─────────┘                   │
│   │         ▼                                                  │
│   │   ┌─────────────┐                                          │
│   │   │ VERIFYING   │                                          │
│   │   │             │                                          │
│   │   └─────┬───────┘                                          │
│   │         │ Success                                          │
│   │         ▼                                                  │
│   │   ┌─────────────┐                                          │
│   │   │ COMPLETED   │                                          │
│   │   │             │                                          │
│   │   └─────────────┘                                          │
│   │                                                            │
│   │ Error/Cancel                                               │
│   │   ┌─────────────┐                                          │
│   └──►│   FAILED    │                                          │
│       │             │                                          │
│       └─────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Meeting Protocol

### 5.1 Local Meeting Lifecycle
```
Host Device                Meeting State               Participants
┌─────────────┐           ┌─────────────┐             ┌─────────────┐
│   Create    │           │   CREATED   │             │             │
│   Meeting   │──────────►│             │             │             │
└─────────────┘           └─────┬───────┘             └─────────────┘
                                │
                                ▼
                          ┌─────────────┐
                          │  ANNOUNCED  │
                          │ (mDNS Reg)  │
                          └─────┬───────┘
                                │ Participant Joins
                                ▼
                          ┌─────────────┐             ┌─────────────┐
                          │   ACTIVE    │◄───────────►│ CONNECTING  │
                          │             │  WebRTC     │ PARTICIPANT │
                          └─────┬───────┘  Setup      └─────────────┘
                                │                           │
                                │ All Leave                 │ Connected
                                ▼                           ▼
                          ┌─────────────┐             ┌─────────────┐
                          │    IDLE     │             │  CONNECTED  │
                          │             │             │ PARTICIPANT │
                          └─────┬───────┘             └─────────────┘
                                │ Host Ends                 │
                                ▼                           │ Leaves
                          ┌─────────────┐                   ▼
                          │   ENDED     │             ┌─────────────┐
                          │(Cleanup mDNS)│            │ DISCONNECTED│
                          └─────────────┘             │ PARTICIPANT │
                                                      └─────────────┘
```

### 5.2 Hybrid Meeting Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID MEETING TOPOLOGY                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Local Network (Office)          Cloud Network (Internet)      │
│ ┌─────────────────────────┐     ┌─────────────────────────┐     │
│ │                         │     │                         │     │
│ │  ┌─────────┐           │     │  ┌─────────┐           │     │
│ │  │Desktop  │           │     │  │ Web App │           │     │
│ │  │App (Bob)│           │     │  │ (Alice) │           │     │
│ │  └─────────┘           │     │  └─────────┘           │     │
│ │       │                │     │       │                │     │
│ │       │ Direct P2P     │     │       │ Cloud WebRTC   │     │
│ │       │                │     │       │                │     │
│ │  ┌─────────┐           │     │  ┌─────────┐           │     │
│ │  │Desktop  │           │     │  │ Video   │           │     │
│ │  │App(Carl)│           │     │  │ Server  │           │     │
│ │  └─────────┘           │     │  └─────────┘           │     │
│ │       │                │     │       │                │     │
│ │       │                │     │       │                │     │
│ │  ┌─────────┐           │     │       │                │     │
│ │  │Desktop  │───────────┼─────┼───────┘                │     │
│ │  │App(Dave)│ Bridge    │     │ Cloud Connection       │     │
│ │  │(Bridge) │           │     │                         │     │
│ │  └─────────┘           │     │                         │     │
│ │                         │     │                         │     │
│ └─────────────────────────┘     └─────────────────────────┘     │
│                                                                 │
│ Media Flow:                                                     │
│ • Bob ↔ Carl: Direct P2P (Local Network)                       │
│ • Bob ↔ Dave: Direct P2P (Local Network)                       │
│ • Carl ↔ Dave: Direct P2P (Local Network)                      │
│ • Alice ↔ Server: Cloud WebRTC (Internet)                      │
│ • Dave ↔ Server: Bridge Connection (Internet)                  │
│ • Dave relays Local ↔ Cloud traffic                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Security Protocol

### 6.1 Device Authentication Flow
```
New Device                 Network                 Trusted Device
┌─────────────┐           ┌─────────┐             ┌─────────────┐
│   Device B  │           │ Network │             │   Device A  │
│ (Untrusted) │           │         │             │ (Trusted)   │
└─────────────┘           └─────────┘             └─────────────┘
      │                       │                         │
      │ 1. Service Discovery  │                         │
      ├─── mDNS Query ───────►│                         │
      │                       │                         │
      │ 2. Service Response   │                         │
      │◄─── Service Info ─────┤◄─ mDNS Response ────────┤
      │   (Public Key Hash)   │                         │
      │                       │                         │
      │ 3. Trust Request      │                         │
      ├─── HTTP POST ────────►│─── Trust Request ──────►│
      │   /trust/request      │                         │
      │   {deviceId, pubKey}  │                         │
      │                       │                         │
      │                       │ 4. User Approval        │
      │                       │◄─ User Accepts ─────────┤
      │                       │                         │
      │ 5. Trust Challenge    │                         │
      │◄─── Challenge ────────┤◄─ Sign Challenge ───────┤
      │   {nonce, signature}  │                         │
      │                       │                         │
      │ 6. Proof Response     │                         │
      ├─── Sign + Respond ───►│─── Verify Signature ───►│
      │                       │                         │
      │ 7. Trust Established  │                         │
      │◄─── Trust Token ─────┤◄─ Issue Certificate ────┤
      │                       │                         │
```

### 6.2 Encryption Protocol Stack
```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION LAYERS                           │
├─────────────────────────────────────────────────────────────────┤
│ Application Data                                                │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │ Chat Messages│ │ File Chunks │ │Meeting Meta │               │
│ │  (UTF-8)     │ │  (Binary)   │ │   (JSON)    │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
│         │                │                │                   │
│         ▼                ▼                ▼                   │
├─────────────────────────────────────────────────────────────────┤
│ Message Authentication                                          │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │   HMAC      │ │ SHA-256     │ │ Digital     │               │
│ │ Signature   │ │ Checksum    │ │ Signature   │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
│         │                │                │                   │
│         ▼                ▼                ▼                   │
├─────────────────────────────────────────────────────────────────┤
│ Transport Encryption                                            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │    DTLS     │ │    TLS      │ │   SRTP      │               │
│ │ (WebRTC)    │ │ (WebSocket) │ │ (Media)     │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
│         │                │                │                   │
│         ▼                ▼                ▼                   │
├─────────────────────────────────────────────────────────────────┤
│ Network Layer                                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │     UDP     │ │     TCP     │ │     ICE     │               │
│ │             │ │             │ │             │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

This comprehensive protocol specification provides the technical foundation for implementing secure, reliable local network communication with proper fallback mechanisms and security protocols.
│