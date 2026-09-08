FROM python:3.12.10-slim@sha256:4c2cf9917bd1cbacc5e9b07320025bdb7cdf2df7b0ceaccb55e9dd7e30987419
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --home /app app && mkdir -p /data /media && chown app:app /data /media
WORKDIR /app
COPY --chown=app:app . /app
USER 10001:10001
ENV PYTHONUNBUFFERED=1 PORT=8000 BIND=0.0.0.0
EXPOSE 8000
VOLUME ["/data","/media"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD ["python","-c","import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready',timeout=2)"]
CMD ["python","-m","server.app"]
