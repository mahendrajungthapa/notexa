# App Guide

Path: `notexa_app`

## Requirements

- Flutter SDK 3.2 or newer
- Dart SDK compatible with the Flutter install
- Android Studio, Xcode, Visual Studio, or another platform toolchain for your target
- Running backend API

## Setup

```powershell
cd notexa_app
flutter pub get
```

The app currently reads the API base URL from:

```text
notexa_app/lib/services/api_service.dart
```

Default local value:

```dart
static const String baseUrl = 'http://127.0.0.1:8000/api';
```

Use these common local URLs:

- Windows, macOS, Linux, or iOS simulator: `http://127.0.0.1:8000/api`
- Android emulator: `http://10.0.2.2:8000/api`
- Physical phone: `http://YOUR_COMPUTER_LAN_IP:8000/api`

## Run

```powershell
flutter run
```

To run on a specific device:

```powershell
flutter devices
flutter run -d DEVICE_ID
```

## Test

```powershell
flutter test
```

## Notes

- Do not commit `.dart_tool`, `build`, platform ephemeral files, or IDE files.
- Keep production API endpoints and secrets out of source code where possible.
