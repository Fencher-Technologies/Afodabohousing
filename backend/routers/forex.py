from fastapi import APIRouter, Depends, Query
from dependencies import get_current_user, CurrentUser
from services.forex import convert, get_all_rates

router = APIRouter(prefix="/forex", tags=["forex"])


@router.get("/rates")
def list_rates(current_user: CurrentUser = Depends(get_current_user)) -> dict:
    rates = get_all_rates()
    return {"base": "UGX", "rates": rates, "updated": "cached up to 6h"}


@router.get("/convert")
def convert_currency(
    amount: float = Query(..., gt=0),
    from_currency: str = Query("UGX"),
    to_currency: str = Query("USD"),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    result = convert(amount, from_currency, to_currency)
    return {
        "amount": amount,
        "from": from_currency,
        "to": to_currency,
        "result": result,
        "rate": round(result / amount, 6) if amount else 0,
    }
