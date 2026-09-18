"""Order models for Trading App."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class OrderSide(str, Enum):
    """Direction of the order."""
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    """Execution type of the order."""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"


class OrderStatus(str, Enum):
    """Lifecycle status of the order."""
    PENDING = "PENDING"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class Order(BaseModel):
    """Represents a trading order."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticker: str = Field(..., description="Ticker symbol, e.g. AAPL")
    side: OrderSide
    order_type: OrderType = OrderType.MARKET
    quantity: float = Field(..., gt=0, description="Number of shares/units")
    limit_price: Optional[float] = Field(default=None, description="Limit price for LIMIT orders")
    stop_price: Optional[float] = Field(default=None, description="Stop price for STOP orders")
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: float = 0.0
    filled_avg_price: Optional[float] = None
    commission: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def is_complete(self) -> bool:
        """Return True if the order is in a terminal state."""
        return self.status in (OrderStatus.FILLED, OrderStatus.CANCELLED, OrderStatus.REJECTED)


class OrderRequest(BaseModel):
    """Request body for placing a new order."""
    ticker: str
    side: OrderSide
    order_type: OrderType = OrderType.MARKET
    quantity: float = Field(..., gt=0)
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
