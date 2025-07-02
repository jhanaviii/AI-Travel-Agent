from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, field_validator
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import uuid
from PIL import Image
import io
import httpx
import logging
from typing import Optional, List
from datetime import datetime
import time
from openai import OpenAI

# Load environment variables
load_dotenv()

# Configure OpenAI
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "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"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Travel App API",
    description="AI-powered travel visualization API with face swap capabilities",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enhanced CORS for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "https://your-app.vercel.app",
        "https://your-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
supabase: Optional[Client] = None
try:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if supabase_url and supabase_key:
        # Simple initialization without extra options
        supabase = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully")
    else:
        logger.warning("Supabase credentials not found")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    supabase = None

# Initialize face swap service with fallback
face_swap_service = None
try:
    from face_swap_service import FaceSwapService
    face_swap_service = FaceSwapService()
    logger.info("Face swap service initialized successfully")
except ImportError as e:
    logger.warning(f"Full face swap service not available (PIL/Pillow not installed): {e}")
    try:
        from simple_face_swap import SimpleFaceSwapService
        face_swap_service = SimpleFaceSwapService()
        logger.info("Simple face swap service initialized successfully")
    except ImportError as e2:
        logger.error(f"Simple face swap service also not available: {e2}")
        logger.info("Face swap functionality will be disabled")
except Exception as e:
    logger.error(f"Failed to initialize face swap service: {e}")
    logger.info("Face swap functionality will be disabled")

# Pydantic models for validation
class VisualizationRequest(BaseModel):
    user_photo_url: str
    destination_id: str

    @field_validator('user_photo_url')
    @classmethod
    def validate_photo_url(cls, v):
        if not v or not v.startswith(('http://', 'https://')):
            raise ValueError('Invalid photo URL')
        return v

    @field_validator('destination_id')
    @classmethod
    def validate_destination_id(cls, v):
        if not v:
            raise ValueError('Destination ID is required')
        return v

class RecommendationsRequest(BaseModel):
    ageGroup: str
    groupSize: str
    budgetRange: int
    tripDuration: str
    interests: List[str]
    additionalNotes: Optional[str] = None

    @field_validator('ageGroup')
    @classmethod
    def validate_age_group(cls, v):
        valid_groups = ['18-25', '26-35', '36-50', '51-65', '65+']
        if v not in valid_groups:
            raise ValueError('Invalid age group')
        return v

    @field_validator('groupSize')
    @classmethod
    def validate_group_size(cls, v):
        valid_sizes = ['solo', 'couple', 'family', 'friends', 'large-group']
        if v not in valid_sizes:
            raise ValueError('Invalid group size')
        return v

    @field_validator('budgetRange')
    @classmethod
    def validate_budget(cls, v):
        if v < 500 or v > 10000:
            raise ValueError('Budget must be between $500 and $10,000')
        return v

    @field_validator('tripDuration')
    @classmethod
    def validate_duration(cls, v):
        valid_durations = ['weekend', 'week', 'two-weeks', 'month', 'long-term']
        if v not in valid_durations:
            raise ValueError('Invalid trip duration')
        return v

    @field_validator('interests')
    @classmethod
    def validate_interests(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one interest must be selected')
        valid_interests = ['romantic', 'adventure', 'culture', 'relaxation', 'food', 
                          'history', 'nature', 'shopping', 'nightlife', 'photography', 
                          'sports', 'luxury']
        for interest in v:
            if interest not in valid_interests:
                raise ValueError(f'Invalid interest: {interest}')
        return v

class TextToImageRequest(BaseModel):
    prompt: str
    style: Optional[str] = None

    @field_validator('prompt')
    @classmethod
    def validate_prompt(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError('Prompt must be at least 10 characters long')
        if len(v) > 500:
            raise ValueError('Prompt must be less than 500 characters')
        return v.strip()

    @field_validator('style')
    @classmethod
    def validate_style(cls, v):
        if v and v not in ['artistic', 'cartoon', 'photographic', 'painting', 'sketch']:
            raise ValueError('Invalid style')
        return v

class BookingSearchRequest(BaseModel):
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    passengers: int = 1
    class_type: str = "economy"
    search_type: str = "flights"  # flights, hotels, activities, packages

    @field_validator('passengers')
    @classmethod
    def validate_passengers(cls, v):
        if v < 1 or v > 9:
            raise ValueError('Passengers must be between 1 and 9')
        return v

    @field_validator('class_type')
    @classmethod
    def validate_class_type(cls, v):
        valid_classes = ['economy', 'premium', 'business', 'first']
        if v not in valid_classes:
            raise ValueError('Invalid class type')
        return v

    @field_validator('search_type')
    @classmethod
    def validate_search_type(cls, v):
        valid_types = ['flights', 'hotels', 'activities', 'packages']
        if v not in valid_types:
            raise ValueError('Invalid search type')
        return v

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    timestamp: str

# Rate limiting (simple in-memory implementation)
from collections import defaultdict
import time

request_counts = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # 1 minute
RATE_LIMIT_MAX_REQUESTS = 100  # 100 requests per minute

def check_rate_limit(client_ip: str):
    now = time.time()
    # Remove old requests outside the window
    request_counts[client_ip] = [req_time for req_time in request_counts[client_ip] 
                                if now - req_time < RATE_LIMIT_WINDOW]
    
    if len(request_counts[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    request_counts[client_ip].append(now)

# OpenAI Destination Generation
async def generate_destinations_with_openai(continent: Optional[str] = None, limit: int = 6) -> List[dict]:
    """Generate destination data using OpenAI API"""
    try:
        # Create a comprehensive prompt for destination generation
        continent_filter = f" from {continent}" if continent else ""
        prompt = f"""Generate {limit} diverse and exciting travel destinations from around the world{continent_filter}. Include destinations from different continents, countries, and cultures.

For each destination, provide:

1. A unique name (city/place name)
2. Country
3. Continent
4. A compelling description (2-3 sentences)
5. A realistic rating (4.0-5.0)
6. Price level ($, $$, or $$$)
7. Best time to visit
8. 4 key highlights/attractions

Format as a valid JSON array with these exact fields:
- id (UUID format)
- name
- country  
- city
- continent
- description
- image_url (use Unsplash URLs like: https://images.unsplash.com/photo-[ID]?w=800&h=600&fit=crop)
- rating
- price
- bestTime
- highlights (array of 4 strings)

Make destinations diverse, exciting, and realistic. Include popular and hidden gems from all continents. Ensure the JSON is properly formatted with no trailing commas.

Example format:
[
  {{
    "id": "uuid-here",
    "name": "Destination Name",
    "country": "Country",
    "city": "City",
    "continent": "Continent",
    "description": "Description here",
    "image_url": "https://images.unsplash.com/photo-1234567890?w=800&h=600&fit=crop",
    "rating": 4.5,
    "price": "$$",
    "bestTime": "Month-Month",
    "highlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4"]
  }}
]"""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a travel expert. Generate realistic, exciting travel destinations with detailed information."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.7
        )
        
        # Parse the response
        content = response.choices[0].message.content
        if not content:
            logger.warning("OpenAI returned empty content")
            return []
            
        logger.info(f"OpenAI generated destinations: {content[:200]}...")
        
        # Try to extract JSON from the response
        import json
        import re
        
        # First, try to find JSON array in the response
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            try:
                destinations_data = json.loads(json_match.group())
                
                # Ensure all required fields are present
                for dest in destinations_data:
                    if 'id' not in dest:
                        dest['id'] = str(uuid.uuid4())
                    if 'image_url' not in dest or not dest['image_url']:
                        # Generate a placeholder Unsplash URL
                        dest['image_url'] = f"https://images.unsplash.com/photo-{uuid.uuid4().hex[:8]}?w=800&h=600&fit=crop"
                    # Ensure other required fields
                    if 'rating' not in dest:
                        dest['rating'] = 4.5
                    if 'price' not in dest:
                        dest['price'] = "$$"
                    if 'bestTime' not in dest:
                        dest['bestTime'] = "Year-round"
                    if 'highlights' not in dest:
                        dest['highlights'] = ["Local Attractions", "Cultural Sites", "Natural Beauty", "Local Cuisine"]
                
                return destinations_data
            except json.JSONDecodeError as e:
                logger.warning(f"Could not parse JSON from OpenAI response: {e}")
        
        # If JSON parsing failed, try to extract individual destinations
        try:
            # Look for individual destination objects
            dest_matches = re.findall(r'\{[^{}]*"name"[^{}]*\}', content, re.DOTALL)
            if dest_matches:
                destinations_data = []
                for match in dest_matches:
                    try:
                        dest = json.loads(match)
                        dest['id'] = str(uuid.uuid4())
                        if 'image_url' not in dest:
                            dest['image_url'] = f"https://images.unsplash.com/photo-{uuid.uuid4().hex[:8]}?w=800&h=600&fit=crop"
                        if 'rating' not in dest:
                            dest['rating'] = 4.5
                        if 'price' not in dest:
                            dest['price'] = "$$"
                        if 'bestTime' not in dest:
                            dest['bestTime'] = "Year-round"
                        if 'highlights' not in dest:
                            dest['highlights'] = ["Local Attractions", "Cultural Sites", "Natural Beauty", "Local Cuisine"]
                        destinations_data.append(dest)
                    except json.JSONDecodeError:
                        continue
                
                if destinations_data:
                    logger.info(f"Extracted {len(destinations_data)} destinations from malformed JSON")
                    return destinations_data
        except Exception as e:
            logger.warning(f"Failed to extract destinations from malformed response: {e}")
        
        logger.warning("Could not parse any destinations from OpenAI response")
        return []
            
    except Exception as e:
        logger.error(f"OpenAI destination generation failed: {e}")
        return []

# Dependency for getting client IP
def get_client_ip(request: Request):
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return request.client.host if request.client else "unknown"

@app.get("/")
async def root():
    return {
        "message": "AI Travel App API v1.0", 
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "supabase": supabase is not None,
            "face_swap": face_swap_service is not None
        }
    }
    
    # Check Supabase connection
    if supabase:
        try:
            # Simple query to test connection
            result = supabase.table("destinations").select("id").limit(1).execute()
            health_status["services"]["supabase"] = True
        except Exception as e:
            logger.error(f"Supabase health check failed: {e}")
            health_status["services"]["supabase"] = False
            health_status["status"] = "degraded"
    
    return health_status

@app.post("/api/upload-photo")
async def upload_photo(
    file: UploadFile = File(...)
):
    logger.info(f"Photo upload request received")
    
    try:
        # Enhanced validation
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="File must be an image (JPEG, PNG, WebP)"
            )

        # Size validation (max 10MB)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="File too large (max 10MB)"
            )

        # Image validation and optimization
        try:
            img = Image.open(io.BytesIO(content))
            img.verify()
            # Reopen for processing
            img = Image.open(io.BytesIO(content))

            # Optimize image
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Resize if too large
            max_size = (1200, 1200)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)

            # Save optimized image
            output = io.BytesIO()
            img.save(output, format="JPEG", quality=85, optimize=True)
            content = output.getvalue()

        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Invalid image file"
            )

        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"user_{file_id}.jpg"

        # Try to upload to Supabase first
        if supabase:
            try:
                result = supabase.storage.from_("user-photos").upload(filename, content)

                if hasattr(result, 'status_code') and result.status_code != 200:
                    logger.warning(f"Supabase upload failed: {result}")
                    raise Exception("Supabase upload failed")

                # Get public URL
                public_url = supabase.storage.from_("user-photos").get_public_url(filename)

                logger.info(f"Photo uploaded successfully to Supabase: {filename}")
        
                return {
                    "success": True,
                    "photo_url": public_url,
                    "filename": filename,
                    "size": len(content),
                    "uploaded_at": datetime.now().isoformat(),
                    "storage": "supabase"
                }
                
            except Exception as e:
                logger.warning(f"Supabase upload failed, using fallback: {e}")
        
        # Fallback: Save to local storage or return a mock URL
        # For now, we'll return a mock URL that points to a placeholder image
        mock_url = f"https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=Uploaded+Photo"
        
        logger.info(f"Photo processed successfully (mock storage): {filename}")
        
        return {
            "success": True,
            "photo_url": mock_url,
            "filename": filename,
            "size": len(content),
            "uploaded_at": datetime.now().isoformat(),
            "storage": "mock"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Upload error: {str(e)}"
        )

@app.get("/api/destinations")
async def get_destinations(
    continent: Optional[str] = None, 
    limit: int = 50
):
    try:
        # First try to get from database
        if supabase:
            try:
                query = supabase.table("destinations").select("*")
                if continent:
                    query = query.eq("continent", continent)
                result = query.limit(limit).order("name").execute()
                
                if result.data and len(result.data) > 0:
                    # Add missing fields to database destinations
                    enhanced_destinations = []
                    for dest in result.data:
                        enhanced_dest = {
                            **dest,
                            "rating": dest.get("rating", 4.5),
                            "price": dest.get("price", "$$"),
                            "bestTime": dest.get("bestTime", "Year-round"),
                            "highlights": dest.get("highlights", [
                                "Local Attractions", 
                                "Cultural Sites", 
                                "Natural Beauty", 
                                "Local Cuisine"
                            ])
                        }
                        enhanced_destinations.append(enhanced_dest)
                    
                    logger.info(f"Retrieved {len(enhanced_destinations)} destinations from database")
                    return {
                        "success": True,
                        "data": enhanced_destinations,
                        "count": len(enhanced_destinations),
                        "continent": continent,
                        "limit": limit,
                        "source": "database"
                    }
            except Exception as e:
                logger.warning(f"Database query failed, using OpenAI: {e}")
        
        # Use OpenAI to generate destinations
        try:
            openai_destinations = await generate_destinations_with_openai(continent, min(limit, 12))
            
            if openai_destinations:
                logger.info(f"Generated {len(openai_destinations)} destinations with OpenAI")
                return {
                    "success": True,
                    "data": openai_destinations,
                    "count": len(openai_destinations),
                    "continent": continent,
                    "limit": limit,
                    "source": "openai"
                }
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
        
        # Fallback to mock data
        mock_destinations = [
            {
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "name": "Santorini, Greece",
                "country": "Greece",
                "city": "Santorini",
                "continent": "Europe",
                "description": "Famous for its stunning sunsets, white-washed buildings, and crystal-clear waters. Perfect for romantic getaways and photography enthusiasts.",
                "image_url": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&h=600&fit=crop",
                "rating": 4.8,
                "price": "$$$",
                "bestTime": "May-October",
                "highlights": ["Oia Sunset", "Blue Domes", "Wine Tasting", "Beach Hopping"]
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440002",
                "name": "Kyoto, Japan",
                "country": "Japan",
                "city": "Kyoto",
                "continent": "Asia",
                "description": "Ancient capital with traditional temples, beautiful gardens, and cherry blossoms. A perfect blend of history and natural beauty.",
                "image_url": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=600&fit=crop",
                "rating": 4.7,
                "price": "$$",
                "bestTime": "March-May, October-November",
                "highlights": ["Cherry Blossoms", "Temples", "Tea Ceremony", "Bamboo Forest"]
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440003",
                "name": "Banff National Park",
                "country": "Canada",
                "city": "Banff",
                "continent": "North America",
                "description": "Stunning mountain landscapes, turquoise lakes, and abundant wildlife. A paradise for nature lovers and outdoor enthusiasts.",
                "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
                "rating": 4.9,
                "price": "$$",
                "bestTime": "June-September",
                "highlights": ["Lake Louise", "Hiking", "Wildlife", "Hot Springs"]
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440004",
                "name": "Machu Picchu",
                "country": "Peru",
                "city": "Cusco",
                "continent": "South America",
                "description": "Ancient Incan citadel set high in the Andes Mountains. One of the most impressive archaeological sites in the world.",
                "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800&h=600&fit=crop",
                "rating": 4.8,
                "price": "$$",
                "bestTime": "April-October",
                "highlights": ["Inca Trail", "Sun Gate", "Temple of the Sun", "Huayna Picchu"]
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440005",
                "name": "Safari in Serengeti",
                "country": "Tanzania",
                "city": "Serengeti",
                "continent": "Africa",
                "description": "Experience the wild beauty of Africa with incredible wildlife viewing, including the Great Migration.",
                "image_url": "https://images.unsplash.com/photo-1549366021-9f761d450615?w=800&h=600&fit=crop",
                "rating": 4.9,
                "price": "$$$",
                "bestTime": "June-October",
                "highlights": ["Wildlife Safari", "Great Migration", "Lion Spotting", "Sunset Drives"]
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440006",
                "name": "Sydney Opera House",
                "country": "Australia",
                "city": "Sydney",
                "continent": "Oceania",
                "description": "Iconic performing arts center with stunning harbor views. A masterpiece of modern architecture.",
                "image_url": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop",
                "rating": 4.6,
                "price": "$$",
                "bestTime": "September-May",
                "highlights": ["Opera Performances", "Harbor Bridge", "Bondi Beach", "Royal Botanic Garden"]
            }
        ]
        
        # Filter by continent if specified
        if continent:
            mock_destinations = [d for d in mock_destinations if d["continent"].lower() == continent.lower()]
        
        # Apply limit
        mock_destinations = mock_destinations[:limit]
        
        logger.info(f"Returning {len(mock_destinations)} mock destinations")
        return {
            "success": True,
            "data": mock_destinations,
            "count": len(mock_destinations),
            "continent": continent,
            "limit": limit,
            "source": "mock"
        }
        
    except Exception as e:
        logger.error(f"Failed to get destinations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )

@app.get("/api/continents")
async def get_continents():
    try:
        # First try to get from database
        if supabase:
            try:
                result = supabase.table("destinations").select("continent").execute()
                continents = list(set([d["continent"] for d in result.data if d["continent"]]))

                # Get count for each continent
                continent_data = []
                for continent in continents:
                    count_result = supabase.table("destinations").select("id").eq("continent", continent).execute()
                    continent_data.append({
                        "name": continent,
                        "count": len(count_result.data)
                    })

                if continent_data:
                    logger.info(f"Retrieved {len(continent_data)} continents from database")
                    return {
                        "success": True,
                        "data": sorted(continent_data, key=lambda x: x["name"])
                    }
            except Exception as e:
                logger.warning(f"Database query failed, using mock data: {e}")
        
        # Fallback to mock data
        mock_continents = [
            {"name": "Africa", "count": 1},
            {"name": "Asia", "count": 1},
            {"name": "Europe", "count": 1},
            {"name": "North America", "count": 1},
            {"name": "Oceania", "count": 1},
            {"name": "South America", "count": 1}
        ]
        
        logger.info(f"Returning {len(mock_continents)} mock continents")
        return {
            "success": True,
            "data": mock_continents
        }
        
    except Exception as e:
        logger.error(f"Failed to get continents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )

@app.post("/api/generate-visualization")
async def generate_visualization(
    data: VisualizationRequest
):
    logger.info(f"Visualization generation request")

    try:
        if not face_swap_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Face swap service unavailable"
            )

        # Get destination - try database first, then fallback to mock data
        destination = None
        
        if supabase:
            try:
                dest_result = supabase.table("destinations").select("*").eq("id", data.destination_id).execute()
                if dest_result.data:
                    destination = dest_result.data[0]
            except Exception as e:
                logger.warning(f"Database query failed: {e}")
        
        # If not found in database, use mock destinations
        if not destination:
            mock_destinations = [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440001",
                    "name": "Santorini, Greece",
                    "country": "Greece",
                    "city": "Santorini",
                    "continent": "Europe",
                    "image_url": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&h=600&fit=crop"
                },
                {
                    "id": "550e8400-e29b-41d4-a716-446655440002",
                    "name": "Kyoto, Japan",
                    "country": "Japan",
                    "city": "Kyoto",
                    "continent": "Asia",
                    "image_url": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=600&fit=crop"
                },
                {
                    "id": "550e8400-e29b-41d4-a716-446655440003",
                    "name": "Banff National Park",
                    "country": "Canada",
                    "city": "Banff",
                    "continent": "North America",
                    "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"
                },
                {
                    "id": "550e8400-e29b-41d4-a716-446655440004",
                    "name": "Machu Picchu",
                    "country": "Peru",
                    "city": "Cusco",
                    "continent": "South America",
                    "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800&h=600&fit=crop"
                },
                {
                    "id": "550e8400-e29b-41d4-a716-446655440005",
                    "name": "Safari in Serengeti",
                    "country": "Tanzania",
                    "city": "Serengeti",
                    "continent": "Africa",
                    "image_url": "https://images.unsplash.com/photo-1549366021-9f761d450615?w=800&h=600&fit=crop"
                },
                {
                    "id": "550e8400-e29b-41d4-a716-446655440006",
                    "name": "Sydney Opera House",
                    "country": "Australia",
                    "city": "Sydney",
                    "continent": "Oceania",
                    "image_url": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop"
                }
            ]
            
            # Find destination by ID
            for dest in mock_destinations:
                if dest["id"] == data.destination_id:
                    destination = dest
                    break
        
        if not destination:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Destination not found"
            )

        # Generate visualization
        logger.info(f"Generating visualization for destination: {destination['name']}")
        result_image_path = face_swap_service.swap_face_with_destination(
            data.user_photo_url,
            destination["image_url"]
        )

        if not result_image_path:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Visualization generation failed"
            )

        # Handle result upload
        result_url = result_image_path
        if result_image_path.startswith('/tmp/') and supabase:
            try:
                with open(result_image_path, 'rb') as f:
                    content = f.read()

                filename = f"generated_{uuid.uuid4().hex}.jpg"
                upload_result = supabase.storage.from_("generated-images").upload(filename, content)

                if hasattr(upload_result, 'status_code') and upload_result.status_code == 200:
                    result_url = supabase.storage.from_("generated-images").get_public_url(filename)
                else:
                    logger.error(f"Failed to upload generated image: {upload_result}")

                # Clean up temporary file
                try:
                    os.remove(result_image_path)
                except:
                    pass
            except Exception as e:
                logger.warning(f"Failed to upload to Supabase, using local path: {e}")

        # Save record if Supabase is available
        if supabase:
            try:
                viz_record = {
                    "destination_id": data.destination_id,
                    "user_photo_url": data.user_photo_url,
                    "generated_image_url": result_url,
                    "created_at": datetime.now().isoformat()
                }

                supabase.table("user_visualizations").insert(viz_record).execute()
            except Exception as e:
                logger.warning(f"Failed to save visualization record: {e}")

        logger.info(f"Visualization generated successfully: {result_url}")

        return {
            "success": True,
            "visualization_url": result_url,
            "destination": {
                "id": destination["id"],
                "name": destination["name"],
                "country": destination["country"],
                "city": destination["city"],
                "continent": destination["continent"]
            },
            "generated_at": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Visualization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Visualization error: {str(e)}"
        )

@app.get("/api/visualizations")
async def get_visualizations(
    limit: int = 20
):
    try:
        # Try to get from database if available
        if supabase:
            try:
                result = supabase.table("user_visualizations").select("""
                    *,
                    destinations (id, name, country, city, continent)
                """).order("created_at", desc=True).limit(limit).execute()

                logger.info(f"Retrieved {len(result.data)} visualizations from database")

                return {
                    "success": True,
                    "data": result.data,
                    "count": len(result.data),
                    "limit": limit
                }
            except Exception as e:
                logger.warning(f"Database query failed, using mock data: {e}")
        
        # Fallback to mock data
        mock_visualizations = [
            {
                "id": "550e8400-e29b-41d4-a716-446655440007",
                "title": "Santorini Sunset Analysis",
                "location": "Oia, Greece",
                "date": "2024-01-15",
                "image": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop",
                "type": "sunset",
                "confidence": 0.95,
                "recommendations": ["Best viewing spots", "Optimal timing", "Photography tips"]
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440008",
                "title": "Kyoto Temple Architecture",
                "location": "Kyoto, Japan",
                "date": "2024-01-10",
                "image": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop",
                "type": "architecture",
                "confidence": 0.92,
                "recommendations": ["Historical significance", "Cultural context", "Visit timing"]
            }
        ]
        
        logger.info(f"Returning {len(mock_visualizations)} mock visualizations")
        return {
            "success": True,
            "data": mock_visualizations,
            "count": len(mock_visualizations),
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Failed to get visualizations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )

@app.post("/api/generate-personalized-recommendations")
async def generate_personalized_recommendations(
    data: RecommendationsRequest,
    request: Request
):
    """Generate personalized travel recommendations based on user preferences"""
    try:
        # Rate limiting
        client_ip = get_client_ip(request)
        check_rate_limit(client_ip)
        
        logger.info(f"Generating personalized recommendations for {data.ageGroup} {data.groupSize} group with ${data.budgetRange} budget")
        
        # Create comprehensive prompt for OpenAI
        interests_text = ", ".join(data.interests)
        additional_context = f" Additional notes: {data.additionalNotes}" if data.additionalNotes else ""
        
        prompt = f"""Generate personalized travel recommendations for a {data.ageGroup} age group traveling as {data.groupSize} with a budget of ${data.budgetRange} for a {data.tripDuration} trip. Their interests include: {interests_text}.{additional_context}

Please provide a comprehensive response including:

1. 3-5 recommended destinations with detailed descriptions
2. A custom itinerary for the trip duration
3. Travel tips and recommendations
4. Budget breakdown

Format the response as a valid JSON object with this exact structure:
{{
    "destinations": [
        {{
            "name": "Destination Name",
            "country": "Country",
            "continent": "Continent", 
            "description": "Detailed description",
            "rating": 4.5,
            "price": "$$"
        }}
    ],
    "itinerary": [
        {{
            "title": "Day Title",
            "activities": ["Activity 1", "Activity 2", "Activity 3"]
        }}
    ],
    "travelTips": [
        "Tip 1",
        "Tip 2", 
        "Tip 3"
    ],
    "budgetBreakdown": {{
        "accommodation": 1200,
        "transportation": 800,
        "food": 600,
        "activities": 400,
        "total": 3000
    }}
}}

Make the recommendations realistic, exciting, and tailored to the specific preferences. Consider the age group, group size, budget, and interests when making suggestions."""

        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert travel consultant specializing in personalized travel recommendations. Provide detailed, realistic, and exciting travel suggestions tailored to specific user preferences."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2500,
            temperature=0.7
        )
        
        # Parse the response
        content = response.choices[0].message.content
        if not content:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate recommendations"
            )
        
        # Try to extract JSON from the response
        try:
            # Find JSON content in the response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON found in response")
            
            json_content = content[start_idx:end_idx]
            import json
            recommendations = json.loads(json_content)
            
            # Validate the structure
            required_keys = ['destinations', 'itinerary', 'travelTips', 'budgetBreakdown']
            for key in required_keys:
                if key not in recommendations:
                    raise ValueError(f"Missing required key: {key}")
            
            logger.info(f"Successfully generated recommendations with {len(recommendations.get('destinations', []))} destinations")
            
            return {
                "success": True,
                "data": recommendations,
                "generated_at": datetime.now().isoformat()
            }
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse OpenAI response: {e}")
            logger.error(f"Raw response: {content}")
            
            # Return fallback recommendations
            fallback_recommendations = {
                "destinations": [
                    {
                        "name": "Bali, Indonesia",
                        "country": "Indonesia",
                        "continent": "Asia",
                        "description": "Perfect for relaxation and cultural experiences with beautiful beaches and temples.",
                        "rating": 4.5,
                        "price": "$$"
                    },
                    {
                        "name": "Barcelona, Spain",
                        "country": "Spain", 
                        "continent": "Europe",
                        "description": "Great for food, culture, and architecture with vibrant nightlife.",
                        "rating": 4.3,
                        "price": "$$"
                    },
                    {
                        "name": "Costa Rica",
                        "country": "Costa Rica",
                        "continent": "North America", 
                        "description": "Ideal for adventure and nature with rainforests and beaches.",
                        "rating": 4.4,
                        "price": "$$"
                    }
                ],
                "itinerary": [
                    {
                        "title": "Day 1: Arrival and Exploration",
                        "activities": ["Check into hotel", "Local market visit", "Welcome dinner"]
                    },
                    {
                        "title": "Day 2: Cultural Immersion", 
                        "activities": ["Museum visit", "Local cooking class", "Evening entertainment"]
                    },
                    {
                        "title": "Day 3: Adventure Day",
                        "activities": ["Outdoor activity", "Scenic viewpoints", "Relaxation time"]
                    }
                ],
                "travelTips": [
                    "Book accommodations in advance for better rates",
                    "Pack according to the local climate",
                    "Learn basic local phrases for better experience",
                    "Keep copies of important documents"
                ],
                "budgetBreakdown": {
                    "accommodation": int(data.budgetRange * 0.4),
                    "transportation": int(data.budgetRange * 0.25),
                    "food": int(data.budgetRange * 0.2),
                    "activities": int(data.budgetRange * 0.15),
                    "total": data.budgetRange
                }
            }
            
            return {
                "success": True,
                "data": fallback_recommendations,
                "generated_at": datetime.now().isoformat(),
                "note": "Used fallback recommendations due to API parsing issue"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Personalized recommendations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate personalized recommendations: {str(e)}"
        )

@app.post("/api/generate-text-to-image")
async def generate_text_to_image(
    data: TextToImageRequest,
    request: Request
):
    """Generate images from text prompts using AI"""
    try:
        # Rate limiting
        client_ip = get_client_ip(request)
        check_rate_limit(client_ip)
        
        logger.info(f"Generating image from text: {data.prompt[:50]}...")
        
        # Try OpenAI DALL-E first (better quality)
        try:
            # Prepare the prompt with style if specified
            prompt = data.prompt
            if data.style:
                style_mappings = {
                    'artistic': 'in an artistic style',
                    'cartoon': 'in a cartoon style',
                    'photographic': 'in a realistic photographic style',
                    'painting': 'in a painting style',
                    'sketch': 'in a sketch style'
                }
                prompt += f" {style_mappings.get(data.style, '')}"
            
            # Call OpenAI DALL-E API
            response = openai_client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            if response.data and len(response.data) > 0:
                image_url = response.data[0].url
                logger.info("Successfully generated image with OpenAI DALL-E")
                
                return {
                    "success": True,
                    "image_url": image_url,
                    "provider": "openai",
                    "generated_at": datetime.now().isoformat()
                }
            else:
                raise ValueError("No image data returned from OpenAI")
            
        except Exception as openai_error:
            logger.warning(f"OpenAI DALL-E failed, trying DeepAI: {openai_error}")
            
            # Fallback to DeepAI
            try:
                deepai_api_key = os.getenv("FACE_SWAP_API_KEY")
                if not deepai_api_key:
                    raise ValueError("DeepAI API key not found")
                
                # Use DeepAI text-to-image endpoint
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.deepai.org/api/text2img",
                        data={
                            'text': data.prompt,
                            'image_type': 'photo' if not data.style else data.style
                        },
                        headers={
                            'api-key': deepai_api_key
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if 'output_url' in result:
                            image_url = result['output_url']
                            logger.info("Successfully generated image with DeepAI")
                            
                            return {
                                "success": True,
                                "image_url": image_url,
                                "provider": "deepai",
                                "generated_at": datetime.now().isoformat()
                            }
                        else:
                            raise ValueError("No image URL in DeepAI response")
                    else:
                        raise ValueError(f"DeepAI API error: {response.status_code}")
                        
            except Exception as deepai_error:
                logger.error(f"DeepAI also failed: {deepai_error}")
                
                # Return a placeholder image as final fallback
                placeholder_url = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop"
                
                return {
                    "success": True,
                    "image_url": placeholder_url,
                    "provider": "placeholder",
                    "note": "Using placeholder image due to API issues",
                    "generated_at": datetime.now().isoformat()
                }
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Text-to-image generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate image: {str(e)}"
        )

# Booking API Endpoints
@app.get("/api/destination-suggestions")
async def get_destination_suggestions(
    query: str,
    request: Request
):
    """Get destination suggestions based on user input using OpenAI"""
    client_ip = get_client_ip(request)
    check_rate_limit(client_ip)
    
    try:
        if not query or len(query.strip()) < 2:
            return {"suggestions": []}
        
        query = query.strip()
        logger.info(f"Getting destination suggestions for: {query}")
        
        # Try OpenAI for intelligent suggestions
        try:
            if not openai_client.api_key or openai_client.api_key == "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":
                raise Exception("OpenAI API key not configured")
            
            prompt = f"""Given the user input "{query}", suggest 8 popular travel destinations (cities, countries, or regions) that match or are related to this query. 

Return only a JSON array of strings with destination names in this exact format:
["Destination 1", "Destination 2", "Destination 3", ...]

Examples:
- For "par" → ["Paris, France", "Barcelona, Spain", "Milan, Italy", "Bangkok, Thailand", "Mumbai, India", "Buenos Aires, Argentina", "Cairo, Egypt", "Osaka, Japan"]
- For "tok" → ["Tokyo, Japan", "Toronto, Canada", "Stockholm, Sweden", "Istanbul, Turkey", "Bangkok, Thailand", "Moscow, Russia", "Seoul, South Korea", "Melbourne, Australia"]
- For "beach" → ["Bali, Indonesia", "Maldives", "Hawaii, USA", "Santorini, Greece", "Phuket, Thailand", "Cancun, Mexico", "Fiji", "Seychelles"]

Focus on popular, well-known destinations that travelers would actually search for."""
            
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            import json
            import re
            
            # Extract JSON array from response
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                suggestions = json.loads(json_match.group())
                logger.info(f"OpenAI suggestions: {suggestions}")
                return {"suggestions": suggestions[:8]}
            else:
                raise Exception("Invalid JSON response from OpenAI")
                
        except Exception as openai_error:
            logger.warning(f"OpenAI suggestions failed: {openai_error}")
            
            # Fallback to static suggestions
            static_suggestions = {
                'par': ['Paris, France', 'Barcelona, Spain', 'Milan, Italy', 'Bangkok, Thailand'],
                'tok': ['Tokyo, Japan', 'Toronto, Canada', 'Stockholm, Sweden', 'Istanbul, Turkey'],
                'lon': ['London, UK', 'Los Angeles, USA', 'Lyon, France', 'Lima, Peru'],
                'new': ['New York, USA', 'New Delhi, India', 'Newcastle, UK', 'New Orleans, USA'],
                'san': ['San Francisco, USA', 'Santorini, Greece', 'Santiago, Chile', 'San Diego, USA'],
                'dub': ['Dubai, UAE', 'Dublin, Ireland', 'Dubrovnik, Croatia', 'Durban, South Africa'],
                'bea': ['Bali, Indonesia', 'Barcelona, Spain', 'Bangkok, Thailand', 'Berlin, Germany'],
                'rom': ['Rome, Italy', 'Roma, Italy', 'Romania', 'Romantic destinations'],
                'sea': ['Seattle, USA', 'Seoul, South Korea', 'Seattle, USA', 'Seville, Spain'],
                'chi': ['Chicago, USA', 'China', 'Chile', 'Chiang Mai, Thailand']
            }
            
            # Find matching suggestions
            suggestions = []
            for key, values in static_suggestions.items():
                if query.lower().startswith(key.lower()):
                    suggestions.extend(values)
                    break
            
            # Add some popular destinations if no match
            if not suggestions:
                popular_destinations = [
                    'Paris, France', 'Tokyo, Japan', 'New York, USA', 'London, UK',
                    'Barcelona, Spain', 'Rome, Italy', 'Bali, Indonesia', 'Dubai, UAE',
                    'Singapore', 'Sydney, Australia', 'Amsterdam, Netherlands', 'Prague, Czech Republic'
                ]
                suggestions = [dest for dest in popular_destinations if query.lower() in dest.lower()]
            
            return {"suggestions": suggestions[:8]}
    
    except Exception as e:
        logger.error(f"Destination suggestions failed: {e}")
        return {"suggestions": []}

@app.post("/api/search-bookings")
async def search_bookings(
    data: BookingSearchRequest,
    request: Request
):
    """Search for flights, hotels, activities, or packages using OpenAI for pricing and availability"""
    client_ip = get_client_ip(request)
    check_rate_limit(client_ip)
    
    try:
        logger.info(f"Searching {data.search_type} for: {data.from_location} to {data.to_location}")
        
        # Try OpenAI for intelligent booking data
        try:
            if not openai_client.api_key or openai_client.api_key == "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":
                raise Exception("OpenAI API key not configured")
            
            # Create context-aware prompt based on search type
            if data.search_type == "flights":
                prompt = f"""Generate 6 realistic flight options from {data.from_location or 'any major city'} to {data.to_location or 'any major city'} for {data.passengers} passenger(s) in {data.class_type} class.

Consider:
- Real airline names (Delta, United, American, Emirates, Lufthansa, etc.)
- Realistic prices based on distance and class
- Realistic flight durations
- Realistic departure times
- Aircraft types

Return as JSON array with these exact fields:
```json
[
  {{
    "id": "unique_id",
    "airline": "Airline Name",
    "flightNumber": "XX1234",
    "from": "Departure City",
    "to": "Destination City", 
    "departureTime": "HH:MM AM/PM",
    "departureDate": "YYYY-MM-DD",
    "duration": "Xh Ym",
    "price": 123,
    "aircraft": "Boeing 737/Airbus A320/etc",
    "stops": 0,
    "class": "{data.class_type}"
  }}
]```"""
            
            elif data.search_type == "hotels":
                prompt = f"""Generate 6 realistic hotel options in {data.to_location or 'a popular destination'} for {data.passengers} guest(s).

Consider:
- Real hotel chains (Marriott, Hilton, Hyatt, etc.) and boutique hotels
- Realistic prices based on location and quality
- Realistic ratings (4.0-5.0)
- Realistic amenities
- Realistic locations

Return as JSON array with these exact fields:
```json
[
  {{
    "id": "unique_id",
    "name": "Hotel Name",
    "location": "City, Country",
    "rating": 4.5,
    "price": 123,
    "amenities": ["WiFi", "Pool", "Spa"],
    "description": "Brief description",
    "image": "https://images.unsplash.com/photo-...",
    "distance": "0.5 km from center"
  }}
]```"""
            
            elif data.search_type == "activities":
                prompt = f"""Generate 6 realistic activity options in {data.to_location or 'a popular destination'} for {data.passengers} participant(s).

Consider:
- Popular tourist activities
- Realistic prices
- Realistic durations
- Realistic ratings
- Realistic descriptions

Return as JSON array with these exact fields:
```json
[
  {{
    "id": "unique_id",
    "name": "Activity Name",
    "location": "City, Country",
    "rating": 4.5,
    "price": 123,
    "duration": "3 hours",
    "description": "Brief description",
    "image": "https://images.unsplash.com/photo-...",
    "category": "Adventure/Culture/Food/etc"
  }}
]```"""
            
            else:  # packages
                prompt = f"""Generate 6 realistic travel package options from {data.from_location or 'any major city'} to {data.to_location or 'any major city'} for {data.passengers} traveler(s).

Consider:
- All-inclusive packages
- Realistic prices
- Realistic durations
- Realistic inclusions
- Realistic descriptions

Return as JSON array with these exact fields:
```json
[
  {{
    "id": "unique_id",
    "name": "Package Name",
    "from": "Departure City",
    "to": "Destination City",
    "duration": "7 days",
    "price": 1234,
    "description": "Brief description",
    "inclusions": ["Flight", "Hotel", "Transfers"],
    "image": "https://images.unsplash.com/photo-..."
  }}
]```"""
            
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            import json
            import re
            
            # Extract JSON array from response
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                results = json.loads(json_match.group())
                logger.info(f"OpenAI {data.search_type} results: {len(results)} items")
                return {"results": results, "provider": "openai"}
            else:
                raise Exception("Invalid JSON response from OpenAI")
                
        except Exception as openai_error:
            logger.warning(f"OpenAI booking search failed: {openai_error}")
            
            # Fallback to mock data
            results = get_mock_booking_results(data.search_type, data.from_location, data.to_location, data.passengers, data.class_type)
            return {"results": results, "provider": "mock"}
    
    except Exception as e:
        logger.error(f"Booking search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search bookings: {str(e)}"
        )

def get_mock_booking_results(search_type: str, from_location: str = None, to_location: str = None, passengers: int = 1, class_type: str = "economy"):
    """Generate realistic mock booking data"""
    
    if search_type == "flights":
        airlines = ["Delta", "United", "American", "Emirates", "Lufthansa", "British Airways", "Air France", "KLM", "Singapore Airlines", "Qatar Airways"]
        aircraft = ["Boeing 737", "Airbus A320", "Boeing 787", "Airbus A350", "Boeing 777", "Airbus A380"]
        
        flights = []
        for i in range(6):
            # Generate realistic prices based on class
            base_price = 200 + (i * 50)
            if class_type == "premium":
                base_price *= 1.5
            elif class_type == "business":
                base_price *= 2.5
            elif class_type == "first":
                base_price *= 4
            
            # Generate realistic duration based on distance
            duration_hours = 2 + (i % 4)  # 2-5 hours
            duration_minutes = (i * 15) % 60
            
            flights.append({
                "id": f"flight_{i+1}",
                "airline": airlines[i % len(airlines)],
                "flightNumber": f"{airlines[i % len(airlines)][:2].upper()}{1000 + i}",
                "from": from_location or "New York",
                "to": to_location or "London",
                "departureTime": f"{8 + (i * 2) % 12}:{30 + (i * 15) % 30:02d} {'AM' if (8 + (i * 2) % 12) < 12 else 'PM'}",
                "departureDate": "2024-06-15",
                "duration": f"{duration_hours}h {duration_minutes}m",
                "price": int(base_price * passengers),
                "aircraft": aircraft[i % len(aircraft)],
                "stops": i % 2,
                "class": class_type
            })
        return flights
    
    elif search_type == "hotels":
        hotel_chains = ["Marriott", "Hilton", "Hyatt", "InterContinental", "Four Seasons", "Ritz-Carlton", "W Hotels", "Sheraton", "Westin", "Renaissance"]
        amenities = [["WiFi", "Pool", "Spa"], ["WiFi", "Gym", "Restaurant"], ["WiFi", "Pool", "Gym", "Spa"], ["WiFi", "Restaurant", "Bar"], ["WiFi", "Pool", "Gym", "Restaurant", "Spa"]]
        
        hotels = []
        for i in range(6):
            base_price = 150 + (i * 75)
            hotels.append({
                "id": f"hotel_{i+1}",
                "name": f"{hotel_chains[i % len(hotel_chains)]} {to_location or 'Grand Hotel'}",
                "location": to_location or "New York, USA",
                "rating": 4.0 + (i * 0.1),
                "price": int(base_price * passengers),
                "amenities": amenities[i % len(amenities)],
                "description": f"Luxurious {hotel_chains[i % len(hotel_chains)]} property in the heart of {to_location or 'the city'}",
                "image": f"https://images.unsplash.com/photo-{1550000000 + i * 100000}?w=400&h=300&fit=crop",
                "distance": f"{0.5 + (i * 0.3):.1f} km from center"
            })
        return hotels
    
    elif search_type == "activities":
        activities = ["City Tour", "Museum Visit", "Adventure Hike", "Cooking Class", "Wine Tasting", "Boat Cruise", "Photography Tour", "Historical Walk", "Food Tour", "Spa Treatment"]
        categories = ["Culture", "Adventure", "Food", "Nature", "Wellness", "History"]
        
        activity_results = []
        for i in range(6):
            base_price = 50 + (i * 25)
            activity_results.append({
                "id": f"activity_{i+1}",
                "name": activities[i % len(activities)],
                "location": to_location or "New York, USA",
                "rating": 4.0 + (i * 0.1),
                "price": int(base_price * passengers),
                "duration": f"{2 + (i % 4)} hours",
                "description": f"Experience the best {activities[i % len(activities)].lower()} in {to_location or 'the city'}",
                "image": f"https://images.unsplash.com/photo-{1560000000 + i * 100000}?w=400&h=300&fit=crop",
                "category": categories[i % len(categories)]
            })
        return activity_results
    
    else:  # packages
        package_types = ["All-Inclusive Beach", "City Break", "Adventure Tour", "Cultural Experience", "Luxury Escape", "Family Fun"]
        
        packages = []
        for i in range(6):
            base_price = 800 + (i * 200)
            packages.append({
                "id": f"package_{i+1}",
                "name": f"{package_types[i % len(package_types)]} Package",
                "from": from_location or "New York",
                "to": to_location or "Paris",
                "duration": f"{5 + (i % 7)} days",
                "price": int(base_price * passengers),
                "description": f"Complete {package_types[i % len(package_types)].lower()} experience from {from_location or 'New York'} to {to_location or 'Paris'}",
                "inclusions": ["Flight", "Hotel", "Transfers", "Some Meals", "Guided Tours"],
                "image": f"https://images.unsplash.com/photo-{1570000000 + i * 100000}?w=400&h=300&fit=crop"
            })
        return packages

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    error_response = ErrorResponse(
        detail=exc.detail,
        error_code=f"HTTP_{exc.status_code}",
        timestamp=datetime.now().isoformat()
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(error_response)
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    error_response = ErrorResponse(
        detail="Internal server error",
        error_code="INTERNAL_ERROR",
        timestamp=datetime.now().isoformat()
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=jsonable_encoder(error_response)
    )


if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")

    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=False,
        access_log=True,
        log_level="info"
    )
