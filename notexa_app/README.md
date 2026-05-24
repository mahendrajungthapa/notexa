# Notexa Flutter App

Flutter client for the Notexa API. It supports login/register, email verification, notes, friends, files, settings, and local draft sync against the Laravel backend.

## Local API

Default API URL:

```text
http://127.0.0.1:8000/api
```

For Android emulator use:

```text
http://10.0.2.2:8000/api
```

Update `lib/services/api_service.dart` when testing on a device that cannot reach `127.0.0.1`.

## Current Feature Notes

- Subscription, premium, and payment UI are removed.
- Archive is removed; notes use trash/restore/permanent delete instead.
- Offline note drafts sync only fields accepted by the backend.
- AI features use backend/admin API keys, never personal app keys.

## Run

```powershell
flutter pub get
flutter run
```
