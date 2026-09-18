"""Orders API router."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from trading_app.models.order import Order, OrderRequest
from trading_app.services.execution import execution_service

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=Order, status_code=201)
def place_order(request: OrderRequest) -> Order:
    """Place a new paper trading order."""
    order = execution_service.place_order(request)
    return order


@router.get("", response_model=List[Order])
def list_orders(ticker: Optional[str] = Query(default=None)) -> List[Order]:
    """Return all orders, optionally filtered by ticker."""
    return execution_service.get_orders(ticker=ticker)


@router.get("/{order_id}", response_model=Order)
def get_order(order_id: str) -> Order:
    """Return a specific order by ID."""
    all_orders = execution_service.get_orders()
    for order in all_orders:
        if order.id == order_id:
            return order
    raise HTTPException(status_code=404, detail=f"Order {order_id} not found.")
