#!/bin/bash
echo "========================================"
echo "Heavenly Nature School - Dev Server"
echo "========================================"

# Activate virtual environment if not already active
if [ -z "$VIRTUAL_ENV" ]; then
    source venv/bin/activate
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Creating default..."
    python -c "from app.core.config import settings; print('Config loaded')"
fi

# Run the server
echo "🚀 Starting development server..."
echo "📡 API: http://localhost:8000"
echo "📚 Docs: http://localhost:8000/docs"
echo "========================================"

uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level debug \
    --reload-dir app
