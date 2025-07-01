# AI Travel App

An AI-powered travel visualization application that lets you see yourself in amazing destinations around the world.

## 🚀 Quick Start

### Option 1: Easy Start (Recommended)
```bash
./start-app.sh
```

This will automatically:
- Check dependencies
- Start the backend server (port 8000)
- Start the frontend server (port 5000)
- Open the app in your browser

### Option 2: Manual Start

#### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

#### 2. Start Backend Server
```bash
cd backend
python main.py
```
Backend will be available at: http://localhost:8000

#### 3. Start Frontend Server (in a new terminal)
```bash
cd frontend
python3 -m http.server 5000
```
Frontend will be available at: http://localhost:5000

## 📱 App Pages

- **Homepage**: http://localhost:5000/index.html
- **Upload Photo**: http://localhost:5000/upload.html
- **Destinations**: http://localhost:5000/destinations.html
- **Visualizations**: http://localhost:5000/visualizations.html
- **Test Data**: http://localhost:5000/test-data.html

## 🔧 Features

### Frontend
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ Drag & drop photo upload
- ✅ Destination browsing with search and filters
- ✅ Visualization gallery
- ✅ Toast notifications
- ✅ Mobile-friendly design

### Backend
- ✅ FastAPI REST API
- ✅ Photo upload and processing
- ✅ Destination data management
- ✅ OpenAI integration for destination generation
- ✅ Supabase database integration
- ✅ CORS support for frontend communication

## 🛠️ Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Tailwind CSS for styling
- Font Awesome icons
- Responsive design

### Backend
- Python 3.10+
- FastAPI framework
- Uvicorn ASGI server
- OpenAI API integration
- Supabase database
- Pillow for image processing

## 📁 Project Structure

```
Travel Agent/
├── frontend/                 # Frontend files
│   ├── index.html           # Homepage
│   ├── upload.html          # Photo upload page
│   ├── destinations.html    # Destinations page
│   ├── visualizations.html  # Visualizations page
│   ├── css/
│   │   └── style.css        # Main stylesheet
│   └── js/
│       ├── api.js           # API service
│       ├── components.js    # UI components
│       ├── main.js          # Main app logic
│       ├── upload.js        # Upload page logic
│       ├── destinations.js  # Destinations page logic
│       └── visualizations.js # Visualizations page logic
├── backend/                  # Backend files
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── env.example          # Environment variables template
├── start-app.sh             # Startup script
└── README.md                # This file
```

## 🔑 Environment Setup

### Backend Environment Variables
Create a `.env` file in the `backend/` directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# API Configuration
API_HOST=127.0.0.1
API_PORT=8000
DEBUG=False

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,https://your-app.vercel.app
```

## 🧪 Testing

### Test Data Loading
Visit http://localhost:5000/test-data.html to test:
- Backend health check
- Destinations data loading
- Continents data loading
- Visualizations data loading

### API Documentation
Visit http://localhost:8000/docs for interactive API documentation.

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - Backend: Change port in `backend/main.py`
   - Frontend: Use different port: `python3 -m http.server 5001`

2. **Dependencies not found**
   - Run: `pip install -r backend/requirements.txt`

3. **Backend not starting**
   - Check if virtual environment is activated
   - Verify all dependencies are installed
   - Check console for error messages

4. **Frontend not loading data**
   - Ensure backend is running on port 8000
   - Check browser console for CORS errors
   - Verify API endpoints are accessible

### Debug Mode
To run in debug mode, set `DEBUG=True` in your `.env` file.

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy Traveling! ✈️🌍** 