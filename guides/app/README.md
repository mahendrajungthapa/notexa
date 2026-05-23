# App Guide

The Notexa app is a Flutter client for the Laravel API. It provides mobile and desktop access to authentication, notes, files, friends, sharing, settings, and local cached data.

Path:

```text
notexa_app
```

## Requirements

- Flutter SDK 3.2 or newer
- Dart SDK compatible with your Flutter version
- Android Studio for Android builds
- Xcode for iOS/macOS builds
- Visual Studio with C++ desktop tooling for Windows builds
- A running Laravel backend API

## Install

```powershell
cd notexa_app
flutter pub get
```

Check your Flutter setup:

```powershell
flutter doctor
flutter devices
```

## API URL

The current API base URL is defined in:

```text
notexa_app/lib/services/api_service.dart
```

Default local value:

```dart
static const String baseUrl = 'http://127.0.0.1:8000/api';
```

Use the correct URL for your target:

| Target | API URL |
| --- | --- |
| Windows, macOS, Linux | `http://127.0.0.1:8000/api` |
| iOS simulator | `http://127.0.0.1:8000/api` |
| Android emulator | `http://10.0.2.2:8000/api` |
| Physical phone | `http://YOUR_COMPUTER_LAN_IP:8000/api` |

For a physical phone, run the Laravel server on the LAN address:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

Then use your computer IP in the app, for example:

```text
http://192.168.1.10:8000/api
```

## Run

Run on the selected/default device:

```powershell
flutter run
```

Run on a specific device:

```powershell
flutter devices
flutter run -d DEVICE_ID
```

## Test

```powershell
flutter test
```

## Build Examples

Android APK:

```powershell
flutter build apk
```

Web:

```powershell
flutter build web
```

Windows:

```powershell
flutter build windows
```

## Main Code Locations

| Path | Purpose |
| --- | --- |
| `lib/main.dart` | App entry point |
| `lib/services/api_service.dart` | API client and HTTP helpers |
| `lib/services/auth_service.dart` | Login, register, token, and user state |
| `lib/services/local_storage.dart` | Local cached note storage |
| `lib/screens/auth` | Login and registration screens |
| `lib/screens/dashboard` | Main dashboard screen |
| `lib/screens/notes` | Note list and editor screens |
| `lib/screens/files` | File listing and PDF viewer screens |
| `lib/screens/friends` | Friend request and friend list screens |
| `lib/screens/shared` | Shared note screen |
| `lib/screens/settings` | Profile/settings screen |

## Troubleshooting

If the Android emulator cannot reach the backend:

- Use `http://10.0.2.2:8000/api`, not `http://127.0.0.1:8000/api`.
- Confirm the Laravel backend is running.
- Confirm the API works in Postman.

If a physical phone cannot reach the backend:

- Put the phone and computer on the same network.
- Run Laravel with `--host=0.0.0.0`.
- Use the computer LAN IP in `baseUrl`.
- Allow the port through the firewall if needed.

If dependencies fail:

- Run `flutter clean`.
- Run `flutter pub get`.
- Check `flutter doctor`.

## Do Not Commit

- `.dart_tool`
- `build`
- generated platform ephemeral files
- IDE user files
- local API experiment files
