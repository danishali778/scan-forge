import math
import re
from dataclasses import dataclass

SECRET_PATTERNS = [
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b"),
    re.compile(r"(?i)\b(api[_-]?key|secret|token|password|bearer)\b\s*[:=]\s*['\"]?[^'\"\s]{12,}"),
    re.compile(r"\bsb_secret_[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._-]{20,}\b"),
]


@dataclass(frozen=True)
class SecretScanResult:
    status: str
    reasons: list[str]


def scan_for_secrets(content: str) -> SecretScanResult:
    reasons = []
    for pattern in SECRET_PATTERNS:
        if pattern.search(content):
            reasons.append("Matched a conservative secret pattern.")
            break
    if _has_high_entropy_token(content):
        reasons.append("Detected a long high-entropy token-like string.")
    return SecretScanResult(status="flagged" if reasons else "clean", reasons=reasons)


def _has_high_entropy_token(content: str) -> bool:
    for candidate in re.findall(r"[A-Za-z0-9+/=_-]{40,}", content):
        if _entropy(candidate) >= 4.5:
            return True
    return False


def _entropy(value: str) -> float:
    if not value:
        return 0.0
    length = len(value)
    counts = {character: value.count(character) for character in set(value)}
    return -sum((count / length) * math.log2(count / length) for count in counts.values())
