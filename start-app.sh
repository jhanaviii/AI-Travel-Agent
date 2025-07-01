#!/bin/bash

echo "🚀 Starting AI Travel App..."
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Please run: python -m venv .venv"
    echo "   Then activate it and install dependencies: pip install -r backend/requirements.txt"
    exit 1
fi

# Check if backend dependencies are installed
if ! python -c "import openai" 2>/dev/null; then
    echo "❌ Backend dependencies not installed. Installing..."
    cd backend
    pip install -r requirements.txt
    cd ..
fi

echo "✅ Dependencies check passed"
echo ""

# Start backend server
echo "🔧 Starting Backend Server..."
if check_port 8000; then
    cd backend
    echo "   Backend will be available at: http://localhost:8000"
    echo "   API docs at: http://localhost:8000/docs"
    echo ""
    python main.py &
    BACKEND_PID=$!
    cd ..
else
    echo "   Backend server already running or port 8000 in use"
fi

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "🎨 Starting Frontend Server..."
if check_port 5000; then
    cd frontend
    echo "   Frontend will be available at: http://localhost:5000"
    echo ""
    echo "📱 App Pages:"
    echo "   • Homepage: http://localhost:5000/index.html"
    echo "   • Upload: http://localhost:5000/upload.html"
    echo "   • Destinations: http://localhost:5000/destinations.html"
    echo "   • Visualizations: http://localhost:5000/visualizations.html"
    echo "   • Test Data: http://localhost:5000/test-data.html"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    echo ""
    python3 -m http.server 5000 &
    FRONTEND_PID=$!
    cd ..
else
    echo "   Frontend server already running or port 5000 in use"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "   Backend server stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "   Frontend server stopped"
    fi
    echo "✅ All servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
echo "✅ Both servers are running!"
echo "   Frontend: http://localhost:5000"
echo "   Backend: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for user to stop
wait 