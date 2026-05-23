# ═══════════════════════════════════════════════════════════════
#  NOTEXA - COMPLETE MINOR PROJECT STUDY GUIDE
#  For Students Who Don't Know Anything About The Stack
# ═══════════════════════════════════════════════════════════════

# This document covers EVERYTHING you need to understand, present,
# and answer any question your teacher might ask.

---

# TABLE OF CONTENTS

1.  What is Notexa? (Project Overview)
2.  Technology Stack Explained (What Each Tool Does)
3.  How the Internet Works (Client-Server Basics)
4.  What is REST API? (With Real Examples)
5.  Laravel Backend - Complete Explanation
6.  MySQL Database - Every Table Explained
7.  Next.js Frontend - Complete Explanation
8.  Flutter Mobile App - Complete Explanation
9.  Authentication - How Login Works
10. How Notes Work (Create, Edit, Share)
11. Friend System - How It Works
12. Share Code System - How It Works
13. AI Summary Feature - How DeepSeek Works
14. File Upload - How Cloudflare R2 Works
15. Payment System - How API Nepal Works
16. Admin Panel - How It Works
17. Real-time Collaboration - How Pusher Works
18. Common Teacher Questions & Answers
19. Flow Diagrams (Text-based)
20. How to Present the Project

---

# 1. WHAT IS NOTEXA?

Notexa is a collaborative note-taking platform. Think of it like 
Google Docs but simpler - focused only on notes.

## What Users Can Do:
- Register with a unique @username
- Create rich text notes (bold, headings, lists, code blocks)
- Share notes with friends using @username or 8-character share codes
- Collaborate in real-time (multiple people editing same note)
- Upload files (PDFs, images) attached to notes
- Get AI-powered summaries of their notes
- Subscribe to Premium for more storage (paid via eSewa/Khalti)

## What Admin Can Do:
- See all users, notes, payments, analytics
- Configure SMTP email, Cloudflare R2 storage, payment gateway keys
- Enable/disable features (AI, email verification, payments)
- Manage subscription plans and pricing

---

# 2. TECHNOLOGY STACK EXPLAINED

## What Each Technology Does:

### Laravel 12 (Backend - PHP Framework)
- Think of it as the "brain" of the application
- It handles all the logic: who can see what, saving data, processing payments
- It talks to the database and sends responses to the frontend
- Written in PHP (a programming language for web servers)
- Runs on: http://localhost:8000

### MySQL (Database)
- Think of it as the "memory" - stores everything permanently
- All users, notes, friendships, payments are stored here
- It's like an Excel spreadsheet but much more powerful
- Uses tables (like sheets) with rows (like entries) and columns (like fields)

### Next.js 14 (Web Frontend - React Framework)
- Think of it as the "face" users see in their browser
- Built with React (a JavaScript library for building interfaces)
- Written in TypeScript (JavaScript with type safety)
- Runs on: http://localhost:3000

### Flutter (Mobile App - Dart Framework)
- Same "face" but for Android and iOS phones
- Written in Dart programming language
- One codebase works on both Android and iPhone

### Cloudflare R2 (File Storage)
- Like Google Drive but for our app's files
- Stores uploaded PDFs, images, documents
- S3-compatible (uses same protocol as Amazon S3)

### API Nepal (Payment Gateway)
- Processes payments in NPR (Nepali Rupees)
- Connects with eSewa, Khalti, IME Pay
- Users pay for Premium subscription through this

### Pusher (Real-time Communication)
- Makes live collaboration possible
- When User A edits a note, User B sees changes instantly
- Uses WebSocket technology (persistent connection)

### DeepSeek API (Artificial Intelligence)
- Generates smart summaries of notes
- We send note text → DeepSeek AI reads it → Returns a short summary
- Uses Large Language Model (LLM) technology

---

# 3. HOW THE INTERNET WORKS (CLIENT-SERVER)

## The Basic Flow:

```
[User's Browser/Phone]  ←→  [Internet]  ←→  [Our Server (Laravel)]  ←→  [Database (MySQL)]
     (Frontend)                                  (Backend)                    (Storage)
```

## Step by Step:
1. User opens browser and goes to localhost:3000 (our frontend)
2. User clicks "Create Note" button
3. Frontend sends an HTTP request to the backend: POST /api/notes
4. Backend (Laravel) receives the request
5. Backend checks: Is the user logged in? (Authentication)
6. Backend saves the note to MySQL database
7. Backend sends response back: { "status": "success", "data": {...} }
8. Frontend receives the response and shows the new note

## What is HTTP?
- HTTP = HyperText Transfer Protocol
- It's how browsers talk to servers
- Methods: GET (read), POST (create), PUT (update), DELETE (remove)

## What is JSON?
- JSON = JavaScript Object Notation
- It's the "language" used to send data between frontend and backend
- Example: { "name": "Ram", "email": "ram@example.com" }

---

# 4. WHAT IS REST API?

REST = Representational State Transfer
API = Application Programming Interface

Think of it like a restaurant:
- The MENU is the API documentation (tells you what you can order)
- The WAITER is the API (takes your order, brings food)
- The KITCHEN is the backend (processes the order)
- The FOOD is the response data

## Our API Endpoints (The Menu):

### Public (No login needed):
POST   /api/register              → Create account
POST   /api/login                 → Login, get token
GET    /api/settings/public       → Site name, logo

### User (Need login token):
GET    /api/notes                 → My notes list
POST   /api/notes                 → Create note
PUT    /api/notes/5               → Update note #5
DELETE /api/notes/5               → Trash note #5
GET    /api/friends               → My friends
POST   /api/friends/request       → Send friend request
POST   /api/notes/5/ai-summary   → Get AI summary
POST   /api/notes/redeem-code     → Redeem a share code

### Admin (Need admin token):
GET    /api/admin/dashboard       → All statistics
GET    /api/admin/users           → All users
PUT    /api/admin/settings        → Change site settings

## Example API Call:

REQUEST (Frontend sends):
```
POST /api/notes
Headers: { Authorization: "Bearer abc123token" }
Body: {
    "title": "My First Note",
    "content": "<p>Hello World</p>",
    "color": "#dbeafe"
}
```

RESPONSE (Backend returns):
```
{
    "status": "success",
    "data": {
        "id": 1,
        "title": "My First Note",
        "content": "<p>Hello World</p>",
        "share_code": "XK7M2NPA",
        "created_at": "2026-04-04T10:00:00Z"
    }
}
```

---

# 5. LARAVEL BACKEND - COMPLETE EXPLANATION

## What is Laravel?
Laravel is a PHP framework. A "framework" means it provides pre-built 
tools so you don't write everything from scratch. Like building a house - 
the framework gives you the foundation, walls, and roof structure.

## Folder Structure Explained:

```
backend/
├── app/
│   ├── Models/          → Define database tables as PHP classes
│   ├── Http/
│   │   ├── Controllers/ → Handle each API request (the "brain")
│   │   └── Middleware/   → Check things before request reaches controller
│   └── Services/        → Business logic (payment, storage, AI)
├── database/
│   ├── migrations/      → Instructions to create database tables
│   └── seeders/         → Default data to insert
├── routes/
│   └── api.php          → Map URLs to Controllers
├── config/              → Settings files
└── bootstrap/
    └── app.php          → App startup configuration
```

## How a Request Flows Through Laravel:

```
User sends: POST /api/notes  →  routes/api.php
                                    ↓
                              Middleware checks (is user logged in?)
                                    ↓
                              NoteController@store (creates the note)
                                    ↓
                              Note Model → MySQL Database (saves it)
                                    ↓
                              JSON Response sent back to user
```

## Key Concepts:

### Models (app/Models/)
A Model represents ONE table in the database.
- User.php → represents the "users" table
- Note.php → represents the "notes" table
- Each model defines relationships (User has many Notes)

Example - User Model:
```php
class User {
    // This user can have many notes
    public function notes() {
        return $this->hasMany(Note::class);
    }
    
    // Check if user is premium
    public function isPremium() {
        return $this->is_premium && $this->premium_expires_at > now();
    }
}
```

### Controllers (app/Http/Controllers/)
Controllers handle the actual work for each API endpoint.
- AuthController → register, login, logout
- NoteController → create, read, update, delete notes
- FriendController → send/accept/reject friend requests

Example - Creating a Note:
```php
class NoteController {
    public function store(Request $request) {
        // 1. Validate input
        $request->validate(['title' => 'required|string|max:255']);
        
        // 2. Create note in database
        $note = $request->user()->notes()->create([
            'title' => $request->title,
            'content' => $request->content,
        ]);
        
        // 3. Return response
        return response()->json(['status' => 'success', 'data' => $note]);
    }
}
```

### Migrations (database/migrations/)
Migrations are PHP files that create database tables.
Instead of writing SQL by hand, we write PHP code.

Example:
```php
Schema::create('notes', function (Blueprint $table) {
    $table->id();                    // Auto-increment ID
    $table->foreignId('user_id');    // Which user owns this note
    $table->string('title');         // Note title (max 255 chars)
    $table->longText('content');     // HTML content (unlimited)
    $table->string('share_code');    // 8-char sharing code
    $table->timestamps();            // created_at, updated_at
});
```

### Routes (routes/api.php)
Routes map URLs to controller methods.
```php
Route::post('/notes', [NoteController::class, 'store']);
// When someone sends POST /api/notes, call NoteController's store method

Route::middleware('auth:sanctum')->group(function() {
    // Everything inside requires login token
});

Route::middleware('is_admin')->group(function() {
    // Everything inside requires admin role
});
```

### Middleware
Middleware runs BEFORE the controller. It can block requests.
- auth:sanctum → checks if user is logged in
- is_admin → checks if user has admin role

### Services (app/Services/)
Services contain complex business logic:
- R2StorageService → uploads files to Cloudflare R2
- ApiNepalPaymentService → initiates payments
- DeepSeekService → calls AI for summaries

### Sanctum (Authentication)
Laravel Sanctum handles login tokens:
1. User sends email+password to /login
2. Laravel checks credentials against database
3. If correct, creates a random token string
4. Returns token to user
5. User includes token in every future request
6. Laravel checks token to identify the user

---

# 6. MYSQL DATABASE - EVERY TABLE

## Table: users
| Column | Type | Purpose |
|--------|------|---------|
| id | integer | Unique ID (auto-increment) |
| name | string | Full name |
| username | string | Unique @username |
| email | string | Email address (unique) |
| password | string | Hashed password (not readable) |
| role | enum | "user" or "admin" |
| is_premium | boolean | Has active subscription? |
| storage_used | bigint | Bytes used in file storage |
| storage_limit | bigint | Max bytes allowed |

## Table: notes
| Column | Type | Purpose |
|--------|------|---------|
| id | integer | Unique ID |
| user_id | foreign key | Owner's user ID |
| title | string | Note title |
| content | longtext | HTML content from editor |
| plain_text | text | Stripped text for searching |
| color | string | Hex color code (#ffffff) |
| share_code | string | 8-char unique sharing code |
| ai_summary | text | AI-generated summary |
| is_pinned | boolean | Pinned to top? |
| is_trashed | boolean | In trash? |

## Table: friendships
| Column | Type | Purpose |
|--------|------|---------|
| sender_id | foreign key | Who sent request |
| receiver_id | foreign key | Who received request |
| status | enum | pending/accepted/rejected |

## Table: note_shares
| Column | Type | Purpose |
|--------|------|---------|
| note_id | foreign key | Which note |
| shared_by | foreign key | Owner who shared |
| shared_with | foreign key | User who received access |
| permission | enum | "view" or "edit" |

## Table: files
| Column | Type | Purpose |
|--------|------|---------|
| user_id | foreign key | Who uploaded |
| note_id | foreign key | Attached to which note |
| original_name | string | Original filename |
| r2_key | string | Storage path in Cloudflare R2 |
| size | bigint | File size in bytes |

## Table: payments
| Column | Type | Purpose |
|--------|------|---------|
| user_id | foreign key | Who paid |
| plan_id | foreign key | Which subscription plan |
| identifier | string | Unique payment ID for API Nepal |
| amount | decimal | Payment amount in NPR |
| status | enum | pending/success/failed |

## Table: site_settings
| Column | Type | Purpose |
|--------|------|---------|
| key | string | Setting name (e.g., "deepseek_api_key") |
| value | text | Setting value |
| group | string | Category (general, smtp, payment, ai, storage) |

## Relationships Diagram (Text):
```
USER ──(has many)──→ NOTES
USER ──(has many)──→ FILES
USER ──(has many)──→ PAYMENTS
USER ──(has many)──→ FRIENDSHIPS (as sender or receiver)

NOTE ──(has many)──→ NOTE_SHARES (shared with other users)
NOTE ──(has many)──→ FILES (attachments)
NOTE ──(has many)──→ NOTE_VERSIONS (edit history)

PAYMENT ──(creates)──→ SUBSCRIPTION
SUBSCRIPTION ──(belongs to)──→ SUBSCRIPTION_PLAN
```

---

# 7. NEXT.JS FRONTEND - COMPLETE EXPLANATION

## What is Next.js?
Next.js is a React framework for building websites.
React = a JavaScript library for building user interfaces.
Think of React as LEGO blocks - you build pages from small components.

## Key Concepts:

### Components
A component is a reusable piece of UI.
```jsx
// A simple button component
function MyButton({ text, onClick }) {
    return <button onClick={onClick}>{text}</button>;
}

// Use it anywhere
<MyButton text="Click Me" onClick={() => alert('Hello!')} />
```

### Pages (App Router)
In Next.js, every file in `app/` folder becomes a web page:
- `app/page.tsx` → Homepage (localhost:3000)
- `app/auth/login/page.tsx` → Login page (localhost:3000/auth/login)
- `app/dashboard/notes/page.tsx` → Notes page
- `app/dashboard/notes/[id]/page.tsx` → Single note (dynamic route)

### State Management (Zustand)
State = data that changes in the app (logged in user, notes list, etc.)
Zustand is a simple state manager:
```javascript
// Create a store
const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    setAuth: (user, token) => set({ user, isAuthenticated: true }),
    logout: () => set({ user: null, isAuthenticated: false }),
}));

// Use in any component
const { user, isAuthenticated } = useAuthStore();
```

### API Calls (Axios)
Axios is used to talk to the Laravel backend:
```javascript
// Get all notes
const response = await axios.get('http://localhost:8000/api/notes', {
    headers: { Authorization: `Bearer ${token}` }
});
const notes = response.data.data;
```

### TipTap Editor
TipTap is a rich text editor built on ProseMirror:
- Supports bold, italic, headings, lists, code, images
- Outputs HTML content
- We send this HTML to the backend to save

## Frontend Flow:
```
User opens browser → Next.js serves the page
    ↓
Page component loads → Calls API to get data
    ↓
API returns data → Component updates and shows data
    ↓
User interacts → Component calls API to save changes
    ↓
API saves to database → Returns success
    ↓
Component updates UI → User sees changes
```

---

# 8. FLUTTER MOBILE APP

## What is Flutter?
Flutter lets you build Android and iOS apps from one codebase.
Written in Dart language. Uses "widgets" (like React components).

## App Structure:
```
lib/
├── main.dart           → App entry point, theme setup
├── services/
│   ├── api_service.dart    → HTTP client (talks to Laravel)
│   ├── auth_service.dart   → Login state management
│   └── local_storage.dart  → Save notes offline
└── screens/
    ├── auth/           → Login, Register
    ├── dashboard/      → Bottom navigation
    ├── notes/          → Note list + editor
    ├── friends/        → Friend management
    ├── shared/         → Shared notes
    ├── files/          → File uploads
    └── settings/       → Profile, password
```

## Key Difference from Web:
- Uses Provider instead of Zustand for state management
- Uses SharedPreferences for local storage (like localStorage)
- Notes are saved locally AND to cloud (offline support)
- Uses Material Design 3 widgets

---

# 9. AUTHENTICATION - HOW LOGIN WORKS

## Step by Step:

### Registration:
```
1. User fills: name, @username, email, password
2. Frontend sends POST /api/register
3. Backend validates (username unique? email valid? password 8+ chars?)
4. Backend hashes the password (bcrypt - one-way encryption)
5. Backend creates user row in MySQL
6. Backend creates a random token (like: "3|abc123xyz789...")
7. Backend returns { user: {...}, token: "3|abc123..." }
8. Frontend saves token in localStorage
9. User is now "logged in"
```

### Login:
```
1. User enters username/email + password
2. Frontend sends POST /api/login { login: "ram", password: "123" }
3. Backend finds user by username OR email
4. Backend checks password using bcrypt
5. If match → creates token, returns it
6. If no match → returns "Invalid credentials" error
```

### How Token Works:
```
Every request after login includes the token:

GET /api/notes
Headers: {
    Authorization: "Bearer 3|abc123xyz789..."
}

Laravel receives this → looks up token in personal_access_tokens table
→ finds which user owns this token → attaches user to the request
→ Controller can call $request->user() to get the logged-in user
```

### Password Hashing:
```
User types: "password123"
Bcrypt turns it into: "$2y$12$LJ3m4c5k7K8x...." (one-way, cannot reverse)
During login: bcrypt compares typed password with stored hash
Even if someone steals the database, they can't read passwords
```

---

# 10. HOW NOTES WORK

## Creating a Note:
```
Frontend → POST /api/notes { title: "My Note", content: "<p>Hello</p>" }
    ↓
NoteController@store validates the data
    ↓
Creates note in MySQL with auto-generated share_code
    ↓
Creates NoteVersion #1 (for history tracking)
    ↓
Returns the new note with its ID and share_code
```

## Editing a Note:
```
Frontend loads note → GET /api/notes/5
User edits in TipTap editor → changes are in HTML format
Every 5 seconds: auto-save sends PUT /api/notes/5
    ↓
Backend checks: does user have edit permission?
    (Owner = yes, Editor = yes, Viewer = no)
    ↓
Updates note content, creates new NoteVersion
```

## Sharing a Note:
Two ways to share:

### Way 1: Share with Friend
```
Owner clicks Share → selects friend from list → picks permission (view/edit)
    ↓
POST /api/notes/5/share { user_id: 3, permission: "edit" }
    ↓
Creates row in note_shares table
    ↓
Friend now sees this note in "Shared with Me" section
```

### Way 2: Share Code
```
Every note has a unique 8-character code (e.g., "XK7M2NPA")
Owner copies the code and sends it (WhatsApp, verbally, etc.)
    ↓
Recipient goes to "Redeem Code" → enters "XK7M2NPA"
    ↓
POST /api/notes/redeem-code { code: "XK7M2NPA" }
    ↓
Backend finds note with this code → creates note_share → Done!
```

---

# 11. FRIEND SYSTEM

## Flow:
```
Ram wants to add Sita as friend
    ↓
Ram types @sita in "Add Friend" → sends request
POST /api/friends/request { username: "sita" }
    ↓
Backend creates friendship row: sender=Ram, receiver=Sita, status=pending
    ↓
Sita opens "Friends" → "Requests" tab → sees Ram's request
    ↓
Sita clicks Accept → PUT /api/friends/accept/1
    ↓
Backend updates: status = "accepted"
    ↓
Now both can see each other in "My Friends" list
And can share notes with each other
```

---

# 12. AI SUMMARY FEATURE

## How It Works:
```
User opens a note → clicks "AI Summary" button
    ↓
POST /api/notes/5/ai-summary
    ↓
Backend reads note's plain_text
    ↓
Backend calls DeepSeek API:
    URL: https://api.deepseek.com/chat/completions
    Body: { model: "deepseek-chat", messages: [
        { role: "system", content: "Summarize this note in 2-4 sentences" },
        { role: "user", content: "Note text here..." }
    ]}
    ↓
DeepSeek AI processes the text → returns summary
    ↓
Backend saves summary in note.ai_summary column
    ↓
Returns summary to frontend → displayed in amber box
```

## The API Key:
- Admin enters DeepSeek API key in Admin Panel → Settings → AI tab
- Key is stored in site_settings table
- Backend reads it when making AI requests

---

# 13. FILE UPLOAD - CLOUDFLARE R2

## How Upload Works:
```
User clicks "Upload" → picks a PDF file
    ↓
Frontend sends POST /api/files/upload (multipart/form-data)
    ↓
Backend checks:
    - Is file under 50MB?
    - Does user have enough storage space?
    ↓
Backend generates unique filename: uuid.pdf
    ↓
Backend uploads to Cloudflare R2 (cloud storage)
    Using putFileAs() with correct ContentType header
    ↓
Backend saves metadata in files table
    (original name, size, R2 key, mime type)
    ↓
Backend updates user.storage_used += file size
    ↓
Returns file info to frontend
```

## How Download Works:
```
User clicks download icon on a file
    ↓
GET /api/files/1/download
    ↓
Backend generates a temporary signed URL (expires in 1 hour)
    ↓
Returns the URL → browser opens it → file downloads
```

---

# 14. PAYMENT SYSTEM - API NEPAL

## Subscription Flow:
```
User clicks "Subscribe to Premium Monthly (Rs. 199)"
    ↓
POST /api/subscription/subscribe { plan_id: 1 }
    ↓
Backend calls API Nepal: POST https://apinepal.com/test/payment/initiate
    With: public_key, secret_key, amount, customer info, callback URLs
    ↓
API Nepal returns: { redirect_url: "https://apinepal.com/checkout/..." }
    ↓
Frontend redirects user to API Nepal's checkout page
    ↓
User selects eSewa/Khalti → enters PIN → pays
    ↓
API Nepal sends IPN (callback) to our server:
    POST /api/subscription/ipn
    With: status, signature, identifier, payment data
    ↓
Backend VALIDATES the payment:
    1. Find payment by identifier
    2. Calculate signature: HMAC-SHA256(amount + identifier, secret_key)
    3. Compare our signature with received signature
    4. If match → payment is genuine!
    ↓
Backend activates subscription:
    - Creates subscription record (30 or 365 days)
    - Sets user.is_premium = true
    - Increases user.storage_limit to 5GB
    ↓
User is now Premium! ✨
```

---

# 15. ADMIN PANEL

## What Admin Can Configure:

### General Settings:
- Site name, logo URL, description, About Us page content

### SMTP (Email):
- Email server settings for sending verification emails
- Can test by sending a test email

### Payment Gateway:
- API Nepal public key and secret key
- Switch between Test (sandbox) and Live mode

### Cloudflare R2 Storage:
- Access key, secret key, bucket name, endpoint URL
- These are needed for file uploads to work

### DeepSeek AI:
- API key for AI summary feature
- Enable/disable AI features

### How Settings Save Works:
```
Admin changes DeepSeek API key → clicks Save
    ↓
Frontend sends: PUT /api/admin/settings
Body: { settings: [
    { key: "deepseek_api_key", value: "sk-xxx", type: "string", group: "ai" }
]}
    ↓
Backend uses updateOrCreate on site_settings table
    ↓
Next time someone uses AI Summary, the new key is used
```

---

# 16. COMMON TEACHER QUESTIONS & ANSWERS

## Q: Why did you choose Laravel?
A: Laravel is the most popular PHP framework with built-in tools for
authentication (Sanctum), database management (Eloquent ORM), and API
development. It follows MVC architecture and has excellent documentation.

## Q: Why REST API instead of traditional web app?
A: REST API allows us to build ONE backend that serves multiple frontends -
our Next.js website, Flutter mobile app, and potentially more in the future.
It's the industry standard for modern applications.

## Q: How do you handle security?
A: Multiple layers:
1. Password hashing with bcrypt (irreversible)
2. Token-based authentication (Sanctum)
3. CORS configuration (only our frontend can access API)
4. Input validation on every request
5. SQL injection prevention (Eloquent ORM uses parameterized queries)
6. HMAC-SHA256 signature verification for payments

## Q: What is MVC?
A: Model-View-Controller:
- Model = Database tables (User, Note, Payment)
- View = Not used (we return JSON instead of HTML)
- Controller = Request handlers (NoteController, AuthController)

## Q: How does real-time collaboration work?
A: Using Pusher (WebSocket service). When user A edits a note, a 
NoteUpdated event is broadcasted. User B's browser is listening on 
the same channel and updates the editor content instantly.

## Q: What is the difference between authentication and authorization?
A: Authentication = WHO are you? (login with username/password)
   Authorization = WHAT can you do? (admin vs user, owner vs viewer)

## Q: Why Cloudflare R2 instead of local storage?
A: R2 is globally distributed, scalable, and S3-compatible. Local 
storage would be lost if the server crashes. R2 also provides 
temporary signed URLs for secure file downloads.

## Q: How do you prevent someone from accessing another user's notes?
A: In every controller method, we check:
   - $note->canView($request->user()) for reading
   - $note->canEdit($request->user()) for editing
   - $note->user_id === $request->user()->id for owner-only actions
   If the check fails, we return 403 Forbidden.

## Q: What happens if the server goes down?
A: The Flutter app has local storage - notes are cached on the phone
using SharedPreferences. Users can still read their cached notes 
and even edit them. Changes sync when the server comes back.

## Q: What is HMAC-SHA256?
A: It's a cryptographic function used to verify payment authenticity.
We create a hash using the payment amount + secret key. If someone 
tampers with the payment data, the hash won't match, and we reject it.

## Q: What is the role of Middleware?
A: Middleware acts as a "gatekeeper" before requests reach controllers.
- auth:sanctum checks if the user has a valid token
- is_admin checks if the user's role is "admin"
If checks fail, the request is blocked with an error response.

## Q: How does the share code work technically?
A: When a note is created, we generate a random 8-character code using
Str::random(8). This code is stored in the note's share_code column
with a UNIQUE constraint. When someone redeems the code, we look up
the note and create a note_shares entry for that user.

## Q: Can you explain the database relationships?
A: 
- One-to-Many: One user has many notes (users.id → notes.user_id)
- Many-to-Many: Users share notes through note_shares pivot table
- One-to-Many: One note has many versions (notes.id → note_versions.note_id)
- Friendships use a self-referencing many-to-many (users ↔ users)

## Q: What is Eloquent ORM?
A: ORM = Object-Relational Mapping. Instead of writing SQL queries,
we use PHP objects. Example:
- SQL: SELECT * FROM notes WHERE user_id = 5
- Eloquent: $user->notes()->get()
Both do the same thing, but Eloquent is cleaner and safer.

## Q: What is CORS?
A: Cross-Origin Resource Sharing. Our frontend (localhost:3000) and
backend (localhost:8000) are on different ports (origins). By default,
browsers block this. CORS configuration tells the browser: "It's OK,
localhost:3000 is allowed to access our API."

---

# 17. HOW TO PRESENT THE PROJECT

## Suggested Demo Flow (10-15 minutes):

1. SHOW HOMEPAGE (30 sec)
   "This is Notexa, a collaborative note-taking platform."

2. REGISTER A USER (1 min)
   Create account with @username. Show the registration flow.

3. CREATE A NOTE (2 min)
   Create a new note, type content, show the rich text editor.
   Show bold, headings, code blocks.

4. AI SUMMARY (1 min)
   Click AI Summary button. Show the generated summary.

5. SHARE CODE (2 min)
   Show the share code. Open another browser/incognito.
   Register second user. Redeem the code. Show the note appears.

6. FRIEND REQUEST (2 min)
   Send friend request by @username. Accept it.
   Share note directly with friend with edit permission.

7. FILE UPLOAD (1 min)
   Upload a PDF. Show it attached to the note.

8. ADMIN PANEL (2 min)
   Login as admin. Show dashboard stats.
   Show settings: change DeepSeek key, payment keys.
   Show user detail with all their data.

9. FLUTTER APP (2 min)
   Open the mobile app. Login with same account.
   Show notes, share code, friends, offline mode.

10. TECHNICAL EXPLANATION (2 min)
    "The backend is Laravel REST API with MySQL..."
    Show Postman collection briefly.

## Tips:
- Have TWO browser windows ready (two different users)
- Pre-register the admin account before demo
- Have the AI key already configured so summary works
- Keep Postman open to show raw API responses if asked
```
