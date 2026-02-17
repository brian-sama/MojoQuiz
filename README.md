# 🎯 Real-Time Session System

A production-ready session system with **6-digit join codes**, **cookie-based participant tracking**, and **duplicate vote prevention**.

## ✨ Features

✅ **6-Digit Join Codes** - Backend generates unique codes (e.g., "A3B7K9")  
✅ **Cookie Tracking** - Participants tracked by cookie + socket ID  
✅ **No Authentication** - Participants join anonymously  
✅ **Duplicate Prevention** - Database constraint prevents duplicate votes  
✅ **Session Expiration** - Automatic cleanup of old sessions  
✅ **Real-Time Sync** - Socket.IO for instant updates  

---

## 🚀 Quick Start

### 1. Setup Database
```bash
createdb session_system
psql -d session_system -f database/schema.sql
```

### 2. Start Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials
npm run dev
# → http://localhost:3001
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 📖 How It Works

### Presenter Flow
```typescript
// 1. Create session
POST /api/sessions
{
  "title": "Product Feedback",
  "presenterId": "presenter@example.com"
}

// Response:
{
  "sessionId": "...",
  "joinCode": "A3B7K9",  // Share this code
  "expiresAt": "2024-02-09T15:30:00Z"
}
```

### Participant Flow
```typescript
// 1. Join via HTTP (gets cookie)
GET /api/join/A3B7K9
// Response sets cookie: participant_id=participant_12345...

// 2. Connect to WebSocket
socket.emit('join_session', {
  joinCode: "A3B7K9",
  participantCookie: "participant_12345...",
  nickname: "Alice"
});

// 3. Submit vote
socket.emit('submit_vote', {
  questionId: "q123",
  voteData: { answer: "Option A" }
});
```

---

## 🔑 Key Features Explained

### Cookie-Based Tracking
```
Participant visits /join/A3B7K9
    ↓
Backend generates: participant_12345...
    ↓
Sets cookie in response
    ↓
Participant reconnects → Same participant_id
    ↓
No duplicate participants in database
```

### Duplicate Vote Prevention
```sql
CREATE TABLE votes (
    question_id UUID,
    participant_id UUID,
    vote_data JSONB,
    UNIQUE(question_id, participant_id)  -- 🔒 Prevents duplicates
);
```

Trying to vote twice:
```
First vote:  ✅ Saved to database
Second vote: ❌ Constraint violation → Error code 23505
Frontend:    Shows "You already voted"
```

### Session Expiration
```
Created: expires_at = NOW() + 24 hours
    ↓
Background job runs every 5 minutes
    ↓
Finds expired sessions (expires_at < NOW())
    ↓
Updates status to 'ended'
    ↓
Join attempts rejected
```

---

## 📊 Database Schema

```sql
sessions
├─ id (UUID)
├─ join_code (6 chars, UNIQUE)
├─ expires_at (auto-expiration)
└─ status ('active' / 'ended')

participants
├─ id (UUID)
├─ session_id (FK)
├─ participant_cookie (persistent ID)
├─ socket_id (current connection)
└─ UNIQUE(session_id, participant_cookie)

votes
├─ id (UUID)
├─ question_id (FK)
├─ participant_id (FK)
├─ vote_data (JSONB)
└─ UNIQUE(question_id, participant_id)  ← Duplicate prevention
```

---

## 🎯 Socket Events

### Client → Server
- `join_session` - Join with cookie
- `submit_vote` - Submit vote (duplicate check)
- `activate_question` - Start question (presenter)
- `show_results` - Reveal results (presenter)
- `end_session` - End session (presenter)

### Server → Client
- `session_joined` - Join confirmation
- `question_activated` - New question
- `vote_submitted` - Vote confirmed
- `vote_count_updated` - Live count
- `results_shown` - Results revealed
- `participant_joined/left` - Participant updates
- `error` - Error (e.g., DUPLICATE_VOTE)

---

## 🔒 Security

✅ **Input Validation** - Sanitize all user input  
✅ **Database Constraints** - Foreign keys, unique constraints  
✅ **Parameterized Queries** - Prevent SQL injection  
✅ **Cookie Security** - httpOnly, secure, sameSite  
✅ **Join Code Format** - Excludes ambiguous characters  

---

## 📁 Project Structure

```
session-system/
├── database/
│   └── schema.sql              # PostgreSQL schema
├── backend/
│   └── src/
│       ├── server.ts           # Main server + expiration manager
│       ├── app.ts              # Express routes + cookie handling
│       ├── services/
│       │   └── database.ts     # DB operations + duplicate prevention
│       ├── socket/
│       │   └── socketHandler.ts # WebSocket events
│       └── utils/
│           └── helpers.ts      # Join code generation, cookies
└── frontend/
    └── src/
        └── components/
            └── ParticipantPage.tsx  # Example React component
```

---

## 📖 Full Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for:
- Complete flow diagrams
- Detailed API reference
- Code examples
- Testing guide
- Production deployment

---

## 🧪 Testing

### Test Duplicate Vote Prevention
```bash
# Vote once (participant p1, question q1)
curl -X POST .../votes -d '{"questionId":"q1","participantId":"p1",...}'
# → Success

# Try voting again (same participant + question)
curl -X POST .../votes -d '{"questionId":"q1","participantId":"p1",...}'
# → Error: DUPLICATE_VOTE
```

### Test Cookie Persistence
```bash
# First connection
GET /api/join/A3B7K9
# → Sets cookie: participant_12345...

# Refresh page / reconnect
GET /api/join/A3B7K9
# → Uses same cookie
# → No duplicate participant created
```

### Test Session Expiration
```sql
-- Create session expiring in 1 minute
INSERT INTO sessions (join_code, expires_at)
VALUES ('TEST01', NOW() + INTERVAL '1 minute');

-- Wait 2 minutes...
-- Background job runs...

SELECT status FROM sessions WHERE join_code = 'TEST01';
-- → 'ended' (auto-expired)
```

---

## 🎓 Example Usage

```typescript
// frontend/src/components/ParticipantPage.tsx

// 1. Join session (HTTP request sets cookie)
const { participantCookie } = await axios.get('/api/join/A3B7K9', {
  withCredentials: true  // Important for cookies!
});

// 2. Connect to WebSocket
const socket = io('http://localhost:3001', {
  withCredentials: true  // Sends cookie
});

// 3. Join via socket
socket.emit('join_session', {
  joinCode: 'A3B7K9',
  participantCookie,
  nickname: 'Alice'
});

// 4. Submit vote
socket.emit('submit_vote', {
  questionId: 'q123',
  voteData: { answer: 'Option A' }
});

// 5. Handle duplicate vote
socket.on('error', (error) => {
  if (error.code === 'DUPLICATE_VOTE') {
    alert('You already voted!');
  }
});
```

---

## 🔧 Configuration

```env
# .env
PORT=3001
DB_HOST=localhost
DB_NAME=session_system
DB_USER=postgres
DB_PASSWORD=your_password
CORS_ORIGIN=http://localhost:3000
```

---

## ✅ Production Ready

This system includes:
- ✅ Automatic session expiration
- ✅ Database-level duplicate prevention
- ✅ Cookie-based participant tracking
- ✅ Real-time WebSocket sync
- ✅ Graceful error handling
- ✅ Background cleanup jobs
- ✅ Connection state management
- ✅ Input validation & sanitization

---

## 📝 License

MIT

---

**Built with Node.js, Express, Socket.IO, PostgreSQL, and React** 🚀
