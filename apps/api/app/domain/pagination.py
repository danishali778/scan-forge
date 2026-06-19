from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PageMeta(BaseModel):
    limit: int = 50
    next_cursor: str | None = None
    has_more: bool = False


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: PageMeta = Field(default_factory=PageMeta)
