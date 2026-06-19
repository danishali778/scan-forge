from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import ApiTokenServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.api_tokens import ApiTokenCreateRequest, ApiTokenCreateResponse, ApiTokenResponse

router = APIRouter()

ApiTokensReadDep = Annotated[None, Depends(require_permission("api_tokens.read"))]
ApiTokensCreateDep = Annotated[None, Depends(require_permission("api_tokens.create"))]
ApiTokensRevokeDep = Annotated[None, Depends(require_permission("api_tokens.revoke"))]


@router.get("", response_model=Page[ApiTokenResponse])
def list_api_tokens(
    service: ApiTokenServiceDep,
    auth: AuthContextDep,
    _permission: ApiTokensReadDep,
) -> Page[ApiTokenResponse]:
    return service.list_tokens(auth=auth)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ApiTokenCreateResponse)
def create_api_token(
    request: ApiTokenCreateRequest,
    service: ApiTokenServiceDep,
    auth: AuthContextDep,
    _permission: ApiTokensCreateDep,
    _: CsrfDep,
) -> ApiTokenCreateResponse:
    return service.create_token(request, auth=auth)


@router.delete("/{token_id}", response_model=ApiTokenResponse)
def revoke_api_token(
    token_id: str,
    service: ApiTokenServiceDep,
    auth: AuthContextDep,
    _permission: ApiTokensRevokeDep,
    _: CsrfDep,
) -> ApiTokenResponse:
    return service.revoke_token(token_id=token_id, auth=auth)
