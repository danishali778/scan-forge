class DomainError(Exception):
    """Base exception for expected business-rule failures."""


class NotImplementedFeatureError(DomainError):
    """Raised by service-layer placeholders that are not wired yet."""


class AuthenticationError(DomainError):
    """Raised when authentication fails."""


class PermissionDeniedError(DomainError):
    """Raised when an authenticated user is not allowed to perform an action."""


class NotFoundError(DomainError):
    """Raised when a resource is missing or hidden by workspace boundaries."""


class ConflictError(DomainError):
    """Raised when a requested state transition conflicts with current state."""


class CsrfError(AuthenticationError):
    """Raised when CSRF validation fails."""
