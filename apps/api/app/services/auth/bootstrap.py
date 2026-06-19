from app.domain.exceptions import PermissionDeniedError
from app.integrations.supabase.auth import SupabaseAuthResult
from app.models.identity import User
from app.repositories.auth import AuthRepository


class AuthBootstrapper:
    """Resolve Supabase identities into local workspace users."""

    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def resolve_user(self, auth_result: SupabaseAuthResult) -> User:
        user = self.repository.get_user_by_supabase_id(auth_result.supabase_user_id)
        if user is not None:
            self.repository.mark_user_login(user)
            return user

        if self.repository.count_workspaces() != 0:
            invited_users = self.repository.list_invited_users_by_email(auth_result.email)
            if len(invited_users) == 1:
                return self.repository.activate_invited_user(
                    invited_users[0],
                    supabase_user_id=auth_result.supabase_user_id,
                )
            raise PermissionDeniedError("User is not registered in this workspace.")

        return self.repository.create_bootstrap_user(
            supabase_user_id=auth_result.supabase_user_id,
            email=auth_result.email,
        )
