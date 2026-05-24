# Notexa Flutter App

Flutter client for the Notexa API. It supports login/register, email verification, notes, friends, files, settings, and local draft sync against the Laravel backend.

## API URL

Pass the backend API URL at runtime instead of editing source code:

```powershell
flutter run --dart-define=NOTEXA_API_URL=<backend-api-url>
```

Use a URL that the selected simulator or physical device can reach.

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
