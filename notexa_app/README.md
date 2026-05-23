# Notexa App

This is the Flutter client for Notexa. It connects to the Laravel API and provides access to authentication, notes, files, friends, sharing, and settings across mobile, desktop, and web targets.

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

Default:

```dart
static const String baseUrl = 'http://127.0.0.1:8000/api';
```

Use `http://10.0.2.2:8000/api` when running on the Android emulator.

## Test

```powershell
flutter test
```

## More Documentation

See:

```text
../guides/app/README.md
```
