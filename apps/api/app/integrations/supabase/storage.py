class SupabaseStorageAdapter:
    """Backend-owned adapter for Supabase Storage operations."""

    def signed_url(self, *, key: str, ttl_seconds: int) -> str:
        _ = (key, ttl_seconds)
        raise NotImplementedError("Supabase Storage adapter is not implemented yet.")

