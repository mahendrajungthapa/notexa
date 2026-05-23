# Notexa Flutter App - Documentation

## Setup

### Prerequisites
- Flutter SDK 3.2+ (https://flutter.dev/docs/get-started/install)
- Android Studio or VS Code with Flutter plugin
- Your Notexa Laravel backend running

### Installation
```bash
cd flutter
flutter pub get
```

### Configure API URL
Open `lib/services/api_service.dart` and change the `baseUrl`:
- **Android Emulator:** `http://10.0.2.2:8000/api`
- **iOS Simulator:** `http://localhost:8000/api`  
- **Physical Device:** `http://YOUR_COMPUTER_IP:8000/api`

### Run
```bash
flutter run
```

## App Structure
```
lib/
├── main.dart                    # App entry, theme, provider setup
├── services/
│   ├── api_service.dart         # HTTP client (GET/POST/PUT/DELETE/upload)
│   └── auth_service.dart        # Auth state with Provider
└── screens/
    ├── auth/
    │   ├── login_screen.dart    # Login (username or email)
    │   └── register_screen.dart # Register with username
    ├── dashboard/
    │   └── dashboard_screen.dart # Bottom navigation (5 tabs)
    ├── notes/
    │   ├── notes_list_screen.dart  # Grid view, search, create, redeem code
    │   └── note_editor_screen.dart # Edit, AI summary, share code, permissions
    ├── friends/
    │   └── friends_screen.dart  # 3 tabs: friends, requests, add by @username
    ├── shared/
    │   └── shared_screen.dart   # Notes shared via friends or codes
    ├── files/
    │   └── files_screen.dart    # Upload, download, delete files
    └── settings/
        └── settings_screen.dart # Profile, password, logout
```

## Features
- Login with username or email
- Register with unique @username
- Notes: create, edit, pin, search, color
- Share via 8-char code (redeem from notes screen)
- AI Summary (DeepSeek) button on each note
- Friends by @username
- File upload/download
- Permission badges (Owner/Editor/View Only)
- Pull-to-refresh everywhere
- Material 3 design with Outfit font

## API Endpoints Used
All endpoints from the Laravel backend are consumed via `ApiService`.
See `postman/Notexa_API_Collection.json` for complete reference.
