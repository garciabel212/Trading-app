"""Configuration settings for Trading App."""

from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Global application settings."""
    app_name: str = "Trading App"
    app_version: str = "0.1.0"
    initial_cash: float = Field(default=100000.0, description="Initial paper trading balance in USD")
    commission_rate: float = Field(default=0.001, description="Commission per trade (0.1%)")
    default_slippage_bps: float = Field(default=5.0, description="Slippage basis points (5 bps = 0.05%)")
    supported_tickers: list[str] = Field(
        default=["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "SPY", "BTC-USD"]
    )


settings = Settings()
