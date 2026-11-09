from fastapi import APIRouter

from .enrich import enrich
from .schemas import NewsEnrichRequest, NewsEnrichResponse

router = APIRouter()


@router.post("/news/enrich", response_model=NewsEnrichResponse)
def enrich_news_item(payload: NewsEnrichRequest) -> NewsEnrichResponse:
    result = enrich(payload.title, payload.description, payload.link)
    return NewsEnrichResponse(**result)
