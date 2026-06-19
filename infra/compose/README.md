# Compose Notes

The root `docker-compose.yml` is the first local deployment target.

Local Compose runs:

- Web app
- API
- Worker
- Runtime service
- Redis

Hosted Supabase provides:

- Postgres
- Auth
- Storage

Docker socket access, when implemented, must be mounted only into the runtime service.

