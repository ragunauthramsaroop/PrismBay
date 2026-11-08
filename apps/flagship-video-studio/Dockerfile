FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 STUDIO_DATA_DIR=/data STUDIO_REQUIRE_AUTH=1
WORKDIR /srv/studio
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg espeak-ng fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 studio
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY web ./web
RUN mkdir -p /data && chown -R studio:studio /data /srv/studio
USER studio
EXPOSE 8765
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8765","--workers","1"]
