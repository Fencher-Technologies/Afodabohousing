from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from dependencies import CurrentUser, get_current_user, get_supabase_client
from services.crud import BookmarkService
from models import BookmarkResponse

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


def get_bookmark_svc(supabase: Client = Depends(get_supabase_client)) -> BookmarkService:
    return BookmarkService(supabase)


@router.get("", response_model=list[BookmarkResponse])
def list_bookmarks(
    current_user: CurrentUser = Depends(get_current_user),
    service: BookmarkService = Depends(get_bookmark_svc),
) -> list[BookmarkResponse]:
    bookmarks = service.get_user_bookmarks(current_user.id)
    return [BookmarkResponse(**b) for b in bookmarks]


@router.post("/{property_id}", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
def add_bookmark(
    property_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: BookmarkService = Depends(get_bookmark_svc),
) -> BookmarkResponse:
    bookmark = service.add_bookmark(current_user.id, property_id)
    return BookmarkResponse(**bookmark)


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bookmark(
    property_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: BookmarkService = Depends(get_bookmark_svc),
) -> None:
    service.remove_bookmark(current_user.id, property_id)


@router.get("/check/{property_id}")
def check_bookmark(
    property_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: BookmarkService = Depends(get_bookmark_svc),
) -> dict:
    bookmarked = service.is_bookmarked(current_user.id, property_id)
    return {"bookmarked": bookmarked}
