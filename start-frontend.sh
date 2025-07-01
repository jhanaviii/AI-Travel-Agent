#!/bin/bash

echo "🚀 Starting AI Travel Frontend Server..."
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found"
    cd frontend
    echo "📁 Serving frontend from: $(pwd)"
    echo "🌐 Frontend will be available at: http://localhost:8000"
    echo ""
    echo "📝 To test upload functionality:"
    echo "   1. Open http://localhost:8000/upload.html"
    echo "   2. Select a photo"
    echo "   3. Click 'Upload Photo' button"
    echo ""
    echo "🧪 For testing: http://localhost:8000/test-upload.html"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Python found"
    cd frontend
    echo "📁 Serving frontend from: $(pwd)"
    echo "🌐 Frontend will be available at: http://localhost:8000"
    echo ""
    echo "📝 To test upload functionality:"
    echo "   1. Open http://localhost:8000/upload.html"
    echo "   2. Select a photo"
    echo "   3. Click 'Upload Photo' button"
    echo ""
    echo "🧪 For testing: http://localhost:8000/test-upload.html"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python -m http.server 8000
else
    echo "❌ Python not found. Please install Python 3 to run the frontend server."
    echo ""
    echo "Alternative: Use any web server to serve the frontend directory."
    exit 1
fi 