# Installation and deployment

## Windows 11 using Docker Desktop

1. Install Docker Desktop and ensure WSL2 support is enabled.
2. Extract the source ZIP to a folder outside OneDrive sync if file-locking causes trouble.
3. Open PowerShell in the project folder.
4. Run `Copy-Item .env.example .env` and `notepad .env`.
5. Replace `REPLACE_WITH_A_UNIQUE_LONG_PASSWORD` in `.env` and choose your username.
6. Run `docker compose up --build -d`.
7. Open `http://localhost:8765` and sign in.
8. Create the demo production, render a film, then add your source media and final narration.

## Linux/macOS using Docker

1. Install Docker Engine/Desktop and Compose.
2. `cp .env.example .env`; set unique credentials.
3. `docker compose up --build -d`.
4. Open `http://localhost:8765`. The port is deliberately bound to loopback.

## Run without Docker

Install Python 3.11+, FFmpeg and FFprobe. Install `espeak` only if basic offline speech drafts are wanted.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
STUDIO_HOST=127.0.0.1 python -m app
```

When the app starts without credentials, it is intended exclusively for loopback development. Set credentials before shared access. On Windows, set `STUDIO_HOST=127.0.0.1` through PowerShell environment variables instead of prefixing a shell command.

## Production security checklist

- [ ] Keep the render host behind HTTPS, a private VPN or a trusted reverse proxy.
- [ ] Require a strong authentication secret and TLS.
- [ ] Back up `/data/studio.sqlite3`, `/data/assets` and `/data/renders` together.
- [ ] Check disk capacity, memory limits and upload quotas.
- [ ] Isolate FFmpeg processing in a worker container or VM for untrusted uploads.
- [ ] Restrict access to private client footage and confidential scripts.
- [ ] Replace single-node SQLite and in-process queue before serving many concurrent customers.
- [ ] Review third-party licenses and API costs.
- [ ] Do not enable unauthenticated Internet access.

## Data layout

- `data/studio.sqlite3`: projects, tasks, clients, bookings and metadata
- `data/assets`: uploaded source images, video and narration
- `data/renders`: finished MP4 movies
- `data/temp`: ephemeral segment videos during rendering
- `data/exports`: ZIP bundles for editor handoff

## Renderer format

Output is H.264 video at 24 frames per second. Full HD landscape is 1920×1080, portrait is 1080×1920, square is 1080×1080, and optional UHD landscape is 3840×2160. The 4K preset requires significantly more CPU, memory and disk space. If narration is included, audio is AAC at 160 kbps. Subtitle overlay uses libass through FFmpeg. Render a master first, then perform editorial finishing in OpenCut as needed. Color grading, motion graphics and hardware-accelerated encoding remain future extensions.
