from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.database import get_db
from models.schemas import MarketStatusResponse
from services.analysis_service import get_market_news_sentiment, market_overview, screener

router = APIRouter(prefix="/api/market", tags=["market"])

ET_TZ = ZoneInfo("America/New_York")

# Major US / NYSE full-day holiday calendar for 2025, 2026, 2027
NYSE_HOLIDAYS: dict[str, str] = {
    # 2025
    "2025-01-01": "New Year's Day",
    "2025-01-20": "Martin Luther King Jr. Day",
    "2025-02-17": "Presidents' Day",
    "2025-04-18": "Good Friday",
    "2025-05-26": "Memorial Day",
    "2025-06-19": "Juneteenth National Independence Day",
    "2025-07-04": "Independence Day",
    "2025-09-01": "Labor Day",
    "2025-11-27": "Thanksgiving Day",
    "2025-12-25": "Christmas Day",
    # 2026
    "2026-01-01": "New Year's Day",
    "2026-01-19": "Martin Luther King Jr. Day",
    "2026-02-16": "Presidents' Day",
    "2026-04-03": "Good Friday",
    "2026-05-25": "Memorial Day",
    "2026-06-19": "Juneteenth National Independence Day",
    "2026-07-03": "Independence Day (Observed)",
    "2026-09-07": "Labor Day",
    "2026-11-26": "Thanksgiving Day",
    "2026-12-25": "Christmas Day",
    # 2027
    "2027-01-01": "New Year's Day",
    "2027-01-18": "Martin Luther King Jr. Day",
    "2027-02-15": "Presidents' Day",
    "2027-03-26": "Good Friday",
    "2027-05-31": "Memorial Day",
    "2027-06-18": "Juneteenth (Observed)",
    "2027-07-05": "Independence Day (Observed)",
    "2027-09-06": "Labor Day",
    "2027-11-25": "Thanksgiving Day",
    "2027-12-24": "Christmas Day (Observed)",
}


def compute_market_status(now_utc: Optional[datetime] = None) -> MarketStatusResponse:
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    now_et = now_utc.astimezone(ET_TZ)
    today = now_et.date()
    weekday = now_et.weekday()  # 0=Mon, 4=Fri, 5=Sat, 6=Sun
    sec_today = now_et.hour * 3600 + now_et.minute * 60 + now_et.second

    is_weekend = weekday in (5, 6)
    today_iso = today.isoformat()
    is_holiday = today_iso in NYSE_HOLIDAYS
    holiday_name = NYSE_HOLIDAYS.get(today_iso)

    if is_weekend or is_holiday:
        state = "CLOSED"
        label = f"Markets Closed ({holiday_name})" if is_holiday else "Markets Closed"
        next_state = "PRE_MARKET"
        # Find next active trading day
        curr = today + timedelta(days=1)
        while curr.weekday() in (5, 6) or curr.isoformat() in NYSE_HOLIDAYS:
            curr += timedelta(days=1)
        next_dt_et = datetime.combine(curr, time(4, 0), tzinfo=ET_TZ)
        progress = 0.0
        subtext = f"Holiday - {holiday_name}" if is_holiday else "Weekend - NYSE Closed"
        detail = f"NYSE & NASDAQ are closed for {holiday_name}." if is_holiday else "NYSE & NASDAQ are closed for the weekend."
    else:
        # Regular trading day (Monday - Friday)
        if sec_today < 14400:  # Before 4:00 AM ET
            state = "CLOSED"
            label = "Markets Closed"
            next_state = "PRE_MARKET"
            next_dt_et = datetime.combine(today, time(4, 0), tzinfo=ET_TZ)
            progress = 0.0
            subtext = "Overnight Session - Pre-Market at 4:00 AM ET"
            detail = "Markets are closed overnight. Pre-market opens at 4:00 AM ET."
        elif sec_today < 34200:  # 4:00 AM - 9:30 AM ET
            state = "PRE_MARKET"
            label = "Pre-Market"
            next_state = "REGULAR"
            next_dt_et = datetime.combine(today, time(9, 30), tzinfo=ET_TZ)
            progress = 0.0
            subtext = "Pre-Market - Regular Opens 9:30 AM ET"
            detail = "US Pre-Market trading session is active (4:00 AM - 9:30 AM ET)."
        elif sec_today < 57600:  # 9:30 AM - 4:00 PM ET
            state = "REGULAR"
            label = "Markets Open"
            next_state = "AFTER_HOURS"
            next_dt_et = datetime.combine(today, time(16, 0), tzinfo=ET_TZ)
            progress = round(max(0.0, min(100.0, ((sec_today - 34200) / (57600 - 34200)) * 100)), 1)
            subtext = "Regular Session - Closes 4:00 PM ET"
            detail = "NYSE & NASDAQ regular trading session is active (9:30 AM - 4:00 PM ET)."
        elif sec_today < 72000:  # 4:00 PM - 8:00 PM ET
            state = "AFTER_HOURS"
            label = "After-Hours"
            next_state = "CLOSED"
            next_dt_et = datetime.combine(today, time(20, 0), tzinfo=ET_TZ)
            progress = 100.0
            subtext = "After-Hours - Session Closes 8:00 PM ET"
            detail = "Extended after-hours trading session is active (4:00 PM - 8:00 PM ET)."
        else:  # After 8:00 PM ET
            state = "CLOSED"
            label = "Markets Closed"
            next_state = "PRE_MARKET"
            curr = today + timedelta(days=1)
            while curr.weekday() in (5, 6) or curr.isoformat() in NYSE_HOLIDAYS:
                curr += timedelta(days=1)
            next_dt_et = datetime.combine(curr, time(4, 0), tzinfo=ET_TZ)
            progress = 0.0
            subtext = "Closed for the Day - Pre-Market 4:00 AM ET"
            detail = "All trading sessions have concluded for today."

    next_trans_utc = next_dt_et.astimezone(timezone.utc).isoformat()
    eastern_formatted = now_et.strftime("%I:%M:%S %p ET")

    return MarketStatusResponse(
        state=state,
        label=label,
        next_transition_utc=next_trans_utc,
        next_state=next_state,
        session_progress_pct=progress,
        subtext=subtext,
        eastern_time=eastern_formatted,
        detail=detail,
        server_time_utc=now_utc.isoformat(),
    )


@router.get("/status", response_model=MarketStatusResponse)
def get_market_status() -> MarketStatusResponse:
    """
    Returns authoritative US equity market session status computed in America/New_York timezone.
    States: CLOSED, PRE_MARKET, REGULAR, AFTER_HOURS.
    Includes next_transition_utc, progress percentage for regular session, and holiday awareness.
    """
    return compute_market_status()


@router.get("/overview")
def overview(db: Session = Depends(get_db)) -> dict:
    return market_overview(db)


@router.get("/sectors")
def sectors(db: Session = Depends(get_db)) -> list[dict]:
    return market_overview(db)["sectors"]


@router.get("/screener")
def run_screener(q: str = Query("", description="Optional symbol/name query"), db: Session = Depends(get_db)) -> dict:
    return screener({"q": q}, db)


@router.get("/news-sentiment")
def market_news_sentiment(db: Session = Depends(get_db)) -> dict:
    return get_market_news_sentiment(db)

