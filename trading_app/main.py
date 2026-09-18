"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from trading_app.api.router import router
from trading_app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Algorithmic and paper trading platform with Graphify knowledge graph integration.",
)

# Include all API routes
app.include_router(router)

# Mount static files for the dashboard
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/", include_in_schema=False)
    def serve_dashboard() -> FileResponse:
        """Serve the trading dashboard."""
        return FileResponse(os.path.join(static_dir, "index.html"))


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    """Simple health check endpoint."""
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}
