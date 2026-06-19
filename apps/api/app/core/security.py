import hashlib
import secrets

from cryptography.fernet import Fernet, InvalidToken

from app.domain.exceptions import AuthenticationError


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def constant_time_equal(left: str, right: str) -> bool:
    return secrets.compare_digest(left, right)


class TokenCipher:
    def __init__(self, key: str | None) -> None:
        if not key:
            raise AuthenticationError("AUTH_ENCRYPTION_KEY is required.")
        try:
            self._fernet = Fernet(key.encode("utf-8"))
        except ValueError as exc:
            raise AuthenticationError("AUTH_ENCRYPTION_KEY must be a valid Fernet key.") from exc

    def encrypt(self, value: str | None) -> str | None:
        if value is None:
            return None
        return self._fernet.encrypt(value.encode("utf-8")).decode("utf-8")

    def decrypt(self, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            return self._fernet.decrypt(value.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise AuthenticationError("Stored auth token could not be decrypted.") from exc

