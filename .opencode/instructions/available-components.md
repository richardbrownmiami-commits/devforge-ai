# Available Caffeine Components

This list is already filtered for the current project context. Only request components from this list with `select_components`.

- `authorization`: Authorization system with role-based access control.
Must-have for all apps that manage personal or access-restricted data.
- `blob-storage`: General file/blob storage, such as for images, videos, files, documents and other bulk data.
Perfect fit for image galleries, video galleries, and other file or blob management.
Supports large files beyond IC limit, with browser-cached HTTP URL access.
- `camera`: Web-camera support
- `http-outcalls`: HTTP outcalls performed by the backend canister (not in the frontend).
- `invite-links`: Requests invite-link / RSVP based access where guests can submit responses without login while admin can view responses with login.
- `qr-code`: QR code scanner using the camera
- `stripe`: Payment support based on Stripe, supporting credit cards and debit cards
- `user-approval`: Approval-based user management