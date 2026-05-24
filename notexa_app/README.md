# Notexa App

This is the Flutter client for Notexa. It connects to the Laravel API and provides access to authentication, SMTP password reset, notes, files, friends, sharing, AI tools, offline drafts, and settings across mobile, desktop, and web targets.

## Setup

```powershell
flutter pub get
```

## Run

```powershell
flutter run
```

## API URL

The API base URL is currently configured in:

```text
lib/services/api_service.dart
```

Default behavior:

```dart
// Android emulator: http://10.0.2.2:8000/api
// Other local targets: http://127.0.0.1:8000/api
```

The app chooses the Android emulator URL automatically.

## Test

```powershell
flutter test
```

## More Documentation

See:

```text
../guides/app/README.md
```
