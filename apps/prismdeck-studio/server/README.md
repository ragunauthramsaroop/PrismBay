# Optional PrismDeck Converter API

This is a separately deployed private service, not an open public endpoint.

Features: Word .doc/.odt, PowerPoint .ppt/.odp, OpenDocument spreadsheets .ods, uploaded video and audio speech-to-text. Modern .pdf/.docx/.xlsx/.xls/.pptx/.html/.txt/.md sources are processed in the browser.

## Deploy only with explicit owner authorization

Provide PRISMDECK_INGEST_TOKEN as a random secret of at least 24 characters, and PRISMDECK_ALLOWED_ORIGINS as your approved HTTPS frontend origin(s). Deploy behind HTTPS and a reverse proxy. Connect the frontend by setting the converter HTTPS endpoint and pasting a session-only access token in the import dialog.

Build: docker build -t prismdeck-converter apps/prismdeck-studio/server

Run example on a private workstation:
docker run --rm -p 127.0.0.1:8080:8080 -e PRISMDECK_INGEST_TOKEN='<secure-long-token>' -e PRISMDECK_ALLOWED_ORIGINS='http://localhost:5173' prismdeck-converter

CPU speech transcription uses the open-source faster-whisper tiny model, downloaded on first use. Conversion requests might take minutes. Large media files are restricted to 120 MB / 15 minutes. Use approved infrastructure with sufficient memory and CPU. No hosted budget has been approved.

Security: strict extension allowlist, request byte limit, no URL fetch or arbitrary command input, subprocess timeouts, temporary directory cleanup, bearer authentication, restricted CORS, unprivileged container. For untrusted public access add external rate limiting, upload malware scanning, resource quotas and request auditing without content collection.

Caveats: speech recognition is machine-generated and not guaranteed accurate. Video visuals are not interpreted. A video without speech requires captions or an accompanying source document. Source content is not persisted by the service. Server filesystem cache might retain a downloaded open-source Whisper model for reuse. Do not send confidential material to a server you do not control.
