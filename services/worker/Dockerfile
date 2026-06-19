FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY apps/api/app /app/apps/api/app
COPY services/worker/worker /app/worker
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -e .

CMD ["celery", "-A", "worker.celery_app", "worker", "--loglevel=INFO"]
