// API Service for Travel Agent App
class APIService {
    constructor() {
        this.baseURL = 'https://ai-travel-agent-backend.onrender.com'; // Deployed backend URL
        this.endpoints = {
            upload: '/api/upload-photo',
            destinations: '/api/destinations',
            continents: '/api/continents',
            visualizations: '/api/visualizations',
            generateVisualization: '/api/generate-visualization',
            health: '/health',
            generatePersonalizedRecommendations: '/api/generate-personalized-recommendations',
            generateTextToImage: '/api/generate-text-to-image'
        };
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    // Generic request method with retry logic
    async request(endpoint, options = {}, retryCount = 0) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            
            // Retry logic for network errors
            if (retryCount < this.retryAttempts && this.isRetryableError(error)) {
                console.log(`Retrying request (${retryCount + 1}/${this.retryAttempts})...`);
                await this.delay(this.retryDelay * Math.pow(2, retryCount));
                return this.request(endpoint, options, retryCount + 1);
            }
            
            throw error;
        }
    }

    isRetryableError(error) {
        return error.name === 'TypeError' || error.message.includes('Failed to fetch');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Upload photo with progress tracking
    async uploadPhoto(file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const xhr = new XMLHttpRequest();
            
            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && onProgress) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (error) {
                            reject(new Error('Invalid response format'));
                        }
                    } else {
                        try {
                            const errorData = JSON.parse(xhr.responseText);
                            reject(new Error(errorData.detail || `Upload failed: ${xhr.status}`));
                        } catch (error) {
                            reject(new Error(`Upload failed: ${xhr.status}`));
                        }
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.addEventListener('timeout', () => {
                    reject(new Error('Upload timeout'));
                });

                xhr.open('POST', `${this.baseURL}${this.endpoints.upload}`);
                xhr.timeout = 30000; // 30 seconds timeout
                xhr.send(formData);
            });

        } catch (error) {
            console.error('Photo upload failed:', error);
            throw error;
        }
    }

    // Get destinations with filtering
    async getDestinations(continent = null, limit = 50) {
        const params = new URLSearchParams();
        if (continent) params.append('continent', continent);
        if (limit) params.append('limit', limit.toString());

        const endpoint = `${this.endpoints.destinations}?${params.toString()}`;
        return this.request(endpoint, { method: 'GET' });
    }

    // Get continents
    async getContinents() {
        return this.request(this.endpoints.continents, { method: 'GET' });
    }

    // Get all visualizations
    async getVisualizations(limit = 20) {
        const endpoint = `${this.endpoints.visualizations}?limit=${limit}`;
        return this.request(endpoint, { method: 'GET' });
    }

    // Generate visualization
    async generateVisualization(userPhotoUrl, destinationId) {
        const data = {
            user_photo_url: userPhotoUrl,
            destination_id: destinationId
        };

        return this.request(this.endpoints.generateVisualization, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Generate personalized recommendations
    async generatePersonalizedRecommendations(preferences) {
        return this.request(this.endpoints.generatePersonalizedRecommendations, {
            method: 'POST',
            body: JSON.stringify(preferences)
        });
    }

    // Generate text-to-image
    async generateTextToImage(prompt, style = null) {
        const data = {
            prompt: prompt,
            style: style
        };
        
        return this.request(this.endpoints.generateTextToImage, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Check backend health
    async checkBackendHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseURL}${this.endpoints.health}`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.warn('Backend not available:', error);
            return false;
        }
    }

    // Mock data for development (when backend is not available)
    getMockDestinations() {
        return [
            {
                id: "550e8400-e29b-41d4-a716-446655440001",
                name: "Santorini, Greece",
                country: "Greece",
                city: "Santorini",
                continent: "Europe",
                description: "Famous for its stunning sunsets, white-washed buildings, and crystal-clear waters. Perfect for romantic getaways and photography enthusiasts.",
                image_url: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop",
                rating: 4.8,
                price: "$$$",
                bestTime: "May-October",
                highlights: ["Oia Sunset", "Blue Domes", "Wine Tasting", "Beach Hopping"]
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440002",
                name: "Kyoto, Japan",
                country: "Japan",
                city: "Kyoto",
                continent: "Asia",
                description: "Ancient capital with traditional temples, beautiful gardens, and cherry blossoms. A perfect blend of history and natural beauty.",
                image_url: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop",
                rating: 4.7,
                price: "$$",
                bestTime: "March-May, October-November",
                highlights: ["Cherry Blossoms", "Temples", "Tea Ceremony", "Bamboo Forest"]
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440003",
                name: "Banff National Park",
                country: "Canada",
                city: "Banff",
                continent: "North America",
                description: "Stunning mountain landscapes, turquoise lakes, and abundant wildlife. A paradise for nature lovers and outdoor enthusiasts.",
                image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
                rating: 4.9,
                price: "$$",
                bestTime: "June-September",
                highlights: ["Lake Louise", "Hiking", "Wildlife", "Hot Springs"]
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440004",
                name: "Marrakech, Morocco",
                country: "Morocco",
                city: "Marrakech",
                continent: "Africa",
                description: "Vibrant souks, stunning architecture, and rich culture. Experience the magic of the Red City with its bustling markets and historic medina.",
                image_url: "https://images.unsplash.com/photo-1553603229-0f1a5d2c735c?w=400&h=300&fit=crop",
                rating: 4.6,
                price: "$",
                bestTime: "March-May, September-November",
                highlights: ["Medina", "Jardin Majorelle", "Atlas Mountains", "Traditional Riads"]
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440005",
                name: "Queenstown, New Zealand",
                country: "New Zealand",
                city: "Queenstown",
                continent: "Oceania",
                description: "Adventure capital of the world with breathtaking landscapes, adrenaline activities, and world-class wine regions.",
                image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
                rating: 4.8,
                price: "$$",
                bestTime: "December-February",
                highlights: ["Bungee Jumping", "Milford Sound", "Wine Tasting", "Hiking"]
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440006",
                name: "Reykjavik, Iceland",
                country: "Iceland",
                city: "Reykjavik",
                continent: "Europe",
                description: "Land of fire and ice with geothermal hot springs, northern lights, and dramatic landscapes. A unique Nordic experience.",
                image_url: "https://images.unsplash.com/photo-1553603229-0f1a5d2c735c?w=400&h=300&fit=crop",
                rating: 4.7,
                price: "$$$",
                bestTime: "June-August, September-March",
                highlights: ["Northern Lights", "Blue Lagoon", "Golden Circle", "Geysers"]
            }
        ];
    }

    getMockVisualizations() {
        return [
            {
                id: "550e8400-e29b-41d4-a716-446655440007",
                title: "Santorini Sunset Analysis",
                location: "Oia, Greece",
                date: "2024-01-15",
                image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop",
                type: "sunset",
                confidence: 0.95,
                recommendations: ["Best viewing spots", "Optimal timing", "Photography tips"]
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440008",
                title: "Kyoto Temple Architecture",
                location: "Kyoto, Japan",
                date: "2024-01-10",
                image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop",
                type: "architecture",
                confidence: 0.92,
                recommendations: ["Historical significance", "Cultural context", "Visit timing"]
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440009",
                title: "Banff Mountain Landscape",
                location: "Banff, Canada",
                date: "2024-01-05",
                image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
                type: "landscape",
                confidence: 0.88,
                recommendations: ["Hiking trails", "Wildlife spotting", "Seasonal highlights"]
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440010",
                title: "Marrakech Market Scene",
                location: "Marrakech, Morocco",
                date: "2024-01-01",
                image: "https://images.unsplash.com/photo-1553603229-0f1a5d2c735c?w=400&h=300&fit=crop",
                type: "culture",
                confidence: 0.90,
                recommendations: ["Market etiquette", "Bargaining tips", "Local customs"]
            }
        ];
    }
}

// Export for use in other modules
window.APIService = APIService;
