#!/bin/bash

# AudiFX Backend Startup Script

set -e

echo "🎵 Starting AudiFX Audio-to-MIDI Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found, copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please review and configure it."
fi

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg not found. Please install it:"
    echo "   Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "   macOS: brew install ffmpeg"
    exit 1
fi

# Create artifacts directory
mkdir -p artifacts

echo "✅ All checks passed!"
echo ""
echo "🚀 Starting server on http://localhost:8000"
echo ""

# Start server
python -m app.main
