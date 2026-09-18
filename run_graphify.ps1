# Graphify knowledge graph refresh script
# Run this after code changes to update the graph

Write-Host "Building Graphify knowledge graph for Trading App..." -ForegroundColor Cyan

# AST-only extraction (no API key required)
graphify extract . --code-only

# Generate interactive HTML visualization
graphify export html

# Generate D3 collapsible tree
graphify tree --label "Trading App"

# Show top architectural hubs
Write-Host "`nTop architectural hubs:" -ForegroundColor Yellow
graphify god-nodes

Write-Host "`nDone! Open graphify-out/graph.html in your browser to explore the knowledge graph." -ForegroundColor Green
