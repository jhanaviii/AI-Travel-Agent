// Booking Page JavaScript - Enhanced with OpenAI API integration

document.addEventListener('DOMContentLoaded', function() {
    // Initialize date pickers
    const dateInputs = document.querySelectorAll('.datepicker');
    if (typeof flatpickr !== 'undefined') {
        dateInputs.forEach(input => {
            flatpickr(input, {
                dateFormat: "Y-m-d",
                minDate: "today",
                disableMobile: true
            });
        });
    }

    // Initialize autocomplete for destination inputs
    initializeAutocomplete();

    // Tab switching functionality
    const tabs = document.querySelectorAll('.booking-tab');
    const contents = document.querySelectorAll('.booking-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            contents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // Search functionality
    const searchButtons = {
        'flights': document.getElementById('search-flights'),
        'hotels': document.getElementById('search-hotels'),
        'activities': document.getElementById('search-activities'),
        'packages': document.getElementById('search-packages'),
        'agents': document.getElementById('search-agents')
    };

    Object.entries(searchButtons).forEach(([type, button]) => {
        if (button) {
            button.addEventListener('click', () => performSearch(type));
        }
    });

    // Quick actions
    const quickActionButtons = document.querySelectorAll('.quick-action-btn');
    quickActionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const destination = button.dataset.destination;
            handleQuickAction(destination);
        });
    });

    function handleQuickAction(destination) {
        const destinationMap = {
            'paris': { tab: 'hotels', city: 'Paris, France' },
            'tokyo': { tab: 'activities', city: 'Tokyo, Japan' },
            'bali': { tab: 'packages', city: 'Bali, Indonesia' },
            'new-york': { tab: 'flights', city: 'New York, USA' },
            'dubai': { tab: 'hotels', city: 'Dubai, UAE' },
            'santorini': { tab: 'packages', city: 'Santorini, Greece' }
        };

        const config = destinationMap[destination];
        if (config) {
            // Switch to appropriate tab
            const tab = document.querySelector(`[data-tab="${config.tab}"]`);
            if (tab) {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                contents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${config.tab}-tab`).classList.add('active');
            }

            // Fill destination field
            const destinationInput = document.getElementById(`${config.tab}-destination`);
            if (destinationInput) {
                destinationInput.value = config.city;
            }

            // Perform search
            setTimeout(() => {
                performSearch(config.tab);
            }, 100);
        }
    }

    // Autocomplete functionality
    function initializeAutocomplete() {
        const destinationInputs = [
            'flight-from', 'flight-to', 'hotel-destination', 'activity-destination'
        ];
        
        destinationInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                let suggestionsContainer = null;
                let debounceTimer = null;
                
                input.addEventListener('input', function() {
                    const query = this.value.trim();
                    
                    // Clear previous timer
                    if (debounceTimer) {
                        clearTimeout(debounceTimer);
                    }
                    
                    // Remove existing suggestions
                    if (suggestionsContainer) {
                        suggestionsContainer.remove();
                        suggestionsContainer = null;
                    }
                    
                    // Don't search if query is too short
                    if (query.length < 2) {
                        return;
                    }
                    
                    // Debounce the API call
                    debounceTimer = setTimeout(async () => {
                        try {
                            const response = await fetch(`https://ai-travel-agent-backend.onrender.com/api/destination-suggestions?query=${encodeURIComponent(query)}`);
                            const data = await response.json();
                            
                            if (data.suggestions && data.suggestions.length > 0) {
                                showSuggestions(input, data.suggestions);
                            }
                        } catch (error) {
                            console.error('Autocomplete error:', error);
                        }
                    }, 300);
                });
                
                // Hide suggestions when clicking outside
                document.addEventListener('click', function(e) {
                    if (suggestionsContainer && !input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                        suggestionsContainer.remove();
                        suggestionsContainer = null;
                    }
                });
            }
        });
    }
    
    function showSuggestions(input, suggestions) {
        // Remove existing suggestions
        const existing = document.querySelector('.suggestions-container');
        if (existing) {
            existing.remove();
        }
        
        // Create suggestions container
        const container = document.createElement('div');
        container.className = 'suggestions-container';
        container.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e1e5e9;
            border-top: none;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
        `;
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s;
            `;
            item.textContent = suggestion;
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#f8f9fa';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'white';
            });
            
            item.addEventListener('click', () => {
                input.value = suggestion;
                container.remove();
            });
            
            container.appendChild(item);
        });
        
        // Position the container
        const inputRect = input.getBoundingClientRect();
        container.style.top = `${inputRect.bottom}px`;
        container.style.left = `${inputRect.left}px`;
        container.style.width = `${inputRect.width}px`;
        
        document.body.appendChild(container);
        
        // Store reference for cleanup
        const inputId = input.id;
        window[`suggestions_${inputId}`] = container;
    }

    async function performSearch(type) {
        const searchButton = document.getElementById(`search-${type}`);
        const resultsGrid = document.getElementById(`${type}-results-grid`);
        
        if (searchButton) {
            searchButton.disabled = true;
            searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        }

        if (resultsGrid) {
            resultsGrid.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Searching for ${type}...</div>
                    <div class="loading-subtext">This may take a few moments</div>
                </div>
            `;
        }

        try {
            // Get form data based on search type
            const searchData = getSearchData(type);
            
            // Call the API
            const response = await fetch('https://ai-travel-agent-backend.onrender.com/api/search-bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                displayResults(type, data.results);
                showToast(`Found ${data.results.length} ${type} options! (${data.provider})`, 'success');
            } else {
                // Fallback to mock data if no results
                const mockResults = getMockResults(type);
                displayResults(type, mockResults);
                showToast(`Found ${mockResults.length} ${type} options! (mock data)`, 'success');
            }
            
        } catch (error) {
            console.error('Search error:', error);
            showToast('Search failed. Using mock data...', 'warning');
            
            // Fallback to mock data
            const mockResults = getMockResults(type);
            displayResults(type, mockResults);
            
        } finally {
            if (searchButton) {
                searchButton.disabled = false;
                searchButton.innerHTML = '<i class="fas fa-search"></i> Search ' + type.charAt(0).toUpperCase() + type.slice(1);
            }
        }
    }
    
    function getSearchData(type) {
        const data = {
            search_type: type,
            passengers: 1,
            class_type: "economy"
        };
        
        switch (type) {
            case 'flights':
                data.from_location = document.getElementById('flight-from')?.value || null;
                data.to_location = document.getElementById('flight-to')?.value || null;
                data.departure_date = document.getElementById('flight-depart')?.value || null;
                data.return_date = document.getElementById('flight-return')?.value || null;
                data.passengers = parseInt(document.getElementById('flight-passengers')?.value || 1);
                data.class_type = document.getElementById('flight-class')?.value || 'economy';
                break;
                
            case 'hotels':
                data.to_location = document.getElementById('hotel-destination')?.value || null;
                data.departure_date = document.getElementById('hotel-checkin')?.value || null;
                data.return_date = document.getElementById('hotel-checkout')?.value || null;
                data.passengers = parseInt(document.getElementById('hotel-guests')?.value || 1);
                break;
                
            case 'activities':
                data.to_location = document.getElementById('activity-destination')?.value || null;
                data.departure_date = document.getElementById('activity-date')?.value || null;
                data.passengers = parseInt(document.getElementById('activity-participants')?.value || 1);
                break;
                
            case 'packages':
                data.from_location = document.getElementById('package-from')?.value || null;
                data.to_location = document.getElementById('package-to')?.value || null;
                data.departure_date = document.getElementById('package-depart')?.value || null;
                data.return_date = document.getElementById('package-return')?.value || null;
                data.passengers = parseInt(document.getElementById('package-travelers')?.value || 1);
                break;
        }
        
        return data;
    }

    function displayResults(type, results) {
        const resultsGrid = document.getElementById(`${type}-results-grid`);
        if (!resultsGrid) return;

        if (results.length === 0) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-search"></i></div>
                    <div class="empty-title">No ${type} found</div>
                    <div class="empty-description">Try adjusting your search criteria.</div>
                </div>
            `;
            return;
        }

        switch (type) {
            case 'flights':
                resultsGrid.innerHTML = results.map(flight => createFlightCard(flight)).join('');
                break;
            case 'hotels':
                resultsGrid.innerHTML = results.map(hotel => createHotelCard(hotel)).join('');
                break;
            case 'activities':
                resultsGrid.innerHTML = results.map(activity => createActivityCard(activity)).join('');
                break;
            case 'packages':
                resultsGrid.innerHTML = results.map(package => createPackageCard(package)).join('');
                break;
            case 'agents':
                resultsGrid.innerHTML = results.map(agent => createAgentCard(agent)).join('');
                break;
        }

        // Add booking event listeners
        addBookingEventListeners(type);
    }

    function createFlightCard(flight) {
        // Handle both API and mock data formats
        const from = flight.from || flight.departure || 'Unknown';
        const to = flight.to || flight.destination || 'Unknown';
        const airline = flight.airline || 'Unknown Airline';
        const flightNumber = flight.flightNumber || flight.number || 'XX1234';
        const aircraft = flight.aircraft || 'Boeing 737';
        const departureTime = flight.departureTime || flight.time || '12:00 PM';
        const departureDate = flight.departureDate || flight.date || '2024-06-15';
        const duration = flight.duration || '3h 30m';
        const price = flight.price || 299;
        const stops = flight.stops || 0;
        const classType = flight.class || flight.class_type || 'Economy';
        
        return `
            <div class="flight-card">
                <div class="flight-route">
                    <div class="flight-route-info">
                        <div class="flight-cities">${from} → ${to}</div>
                        <div class="flight-airlines">${airline}</div>
                        <div class="flight-details">Flight ${flightNumber} • ${aircraft} • ${stops} stop${stops !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                <div class="flight-times">
                    <div class="flight-time">${departureTime}</div>
                    <div class="flight-date">${departureDate}</div>
                </div>
                <div class="flight-duration">${duration}</div>
                <div class="flight-price">
                    <div class="price-amount">$${price}</div>
                    <div class="price-per">per person</div>
                    <div class="price-class">${classType}</div>
                </div>
                <div class="flight-actions">
                    <button class="btn btn-primary btn-small" onclick="handleBooking('flights', '${flight.id}')">
                        <i class="fas fa-plane"></i>
                        Book Flight
                    </button>
                </div>
            </div>
        `;
    }

    function createHotelCard(hotel) {
        // Handle both API and mock data formats
        const name = hotel.name || 'Hotel';
        const location = hotel.location || 'Unknown Location';
        const rating = hotel.rating || 4.0;
        const price = hotel.price || 150;
        const amenities = hotel.amenities || ['WiFi', 'Pool'];
        const description = hotel.description || 'Comfortable accommodation';
        const distance = hotel.distance || '0.5 km from center';
        const image = hotel.image || 'https://via.placeholder.com/200x150/f3f4f6/6b7280?text=Hotel';
        
        return `
            <div class="hotel-card">
                <img src="${image}" alt="${name}" class="hotel-image" onerror="this.src='https://via.placeholder.com/200x150/f3f4f6/6b7280?text=Hotel'">
                <div class="hotel-info">
                    <div>
                        <div class="hotel-name">${name}</div>
                        <div class="hotel-location">
                            <i class="fas fa-map-marker-alt"></i> ${location}
                        </div>
                        <div class="hotel-description">${description}</div>
                        <div class="hotel-distance">
                            <i class="fas fa-location-arrow"></i> ${distance}
                        </div>
                        <div class="hotel-amenities">
                            ${amenities.map(amenity => `
                                <span class="amenity">
                                    <i class="fas fa-${getAmenityIcon(amenity)}"></i> ${amenity}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                    <div class="hotel-rating">
                        <div class="rating-stars">${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5 - Math.floor(rating))}</div>
                        <div class="rating-score">${rating.toFixed(1)}/5</div>
                    </div>
                </div>
                <div class="hotel-price">
                    <div class="price-amount">$${price}</div>
                    <div class="price-per">per night</div>
                </div>
                <div class="hotel-actions">
                    <button class="btn btn-primary btn-small" onclick="handleBooking('hotels', '${hotel.id}')">
                        <i class="fas fa-bed"></i>
                        Book Hotel
                    </button>
                </div>
            </div>
        `;
    }
    
    function getAmenityIcon(amenity) {
        const iconMap = {
            'WiFi': 'wifi',
            'Pool': 'swimming-pool',
            'Spa': 'spa',
            'Gym': 'dumbbell',
            'Restaurant': 'utensils',
            'Bar': 'glass-martini-alt',
            'Parking': 'car',
            'Room Service': 'concierge-bell',
            'Air Conditioning': 'snowflake',
            'Free Breakfast': 'coffee'
        };
        return iconMap[amenity] || 'check';
    }

    function createActivityCard(activity) {
        // Handle both API and mock data formats
        const name = activity.name || 'Activity';
        const category = activity.category || 'Adventure';
        const description = activity.description || 'Exciting activity';
        const duration = activity.duration || '3 hours';
        const rating = activity.rating || 4.0;
        const price = activity.price || 50;
        const location = activity.location || 'Unknown Location';
        const image = activity.image || 'https://via.placeholder.com/200x150/f3f4f6/6b7280?text=Activity';
        
        return `
            <div class="activity-card">
                <img src="${image}" alt="${name}" class="activity-image" onerror="this.src='https://via.placeholder.com/200x150/f3f4f6/6b7280?text=Activity'">
                <div class="activity-info">
                    <div>
                        <div class="activity-name">${name}</div>
                        <div class="activity-category">${category}</div>
                        <div class="activity-location">
                            <i class="fas fa-map-marker-alt"></i> ${location}
                        </div>
                        <div class="activity-description">${description}</div>
                        <div class="activity-details">
                            <span class="activity-detail">
                                <i class="fas fa-clock"></i> ${duration}
                            </span>
                            <span class="activity-detail">
                                <i class="fas fa-star"></i> ${rating.toFixed(1)}/5
                            </span>
                        </div>
                    </div>
                </div>
                <div class="activity-price">
                    <div class="price-amount">$${price}</div>
                    <div class="price-per">per person</div>
                </div>
                <div class="activity-actions">
                    <button class="btn btn-primary btn-small" onclick="handleBooking('activities', '${activity.id}')">
                        <i class="fas fa-hiking"></i>
                        Book Activity
                    </button>
                </div>
            </div>
        `;
    }

    function createPackageCard(package) {
        // Handle both API and mock data formats
        const name = package.name || 'Travel Package';
        const from = package.from || 'Unknown';
        const to = package.to || 'Unknown';
        const duration = package.duration || '7 days';
        const price = package.price || 800;
        const description = package.description || 'Complete travel experience';
        const inclusions = package.inclusions || package.includes || ['Flight', 'Hotel', 'Transfers'];
        const image = package.image || 'https://via.placeholder.com/250x180/f3f4f6/6b7280?text=Package';
        
        return `
            <div class="package-card">
                <img src="${image}" alt="${name}" class="package-image" onerror="this.src='https://via.placeholder.com/250x180/f3f4f6/6b7280?text=Package'">
                <div class="package-info">
                    <div>
                        <div class="package-name">${name}</div>
                        <div class="package-route">
                            <i class="fas fa-plane"></i> ${from} → ${to}
                        </div>
                        <div class="package-description">${description}</div>
                        <div class="package-duration">
                            <i class="fas fa-calendar"></i> ${duration}
                        </div>
                        <div class="package-includes">
                            ${inclusions.map(item => `
                                <span class="package-include">
                                    <i class="fas fa-check"></i> ${item}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="package-price">
                    <div class="price-amount">$${price}</div>
                    <div class="price-per">per person</div>
                </div>
                <div class="package-actions">
                    <button class="btn btn-primary btn-small" onclick="handleBooking('packages', '${package.id}')">
                        <i class="fas fa-suitcase"></i>
                        Book Package
                    </button>
                </div>
            </div>
        `;
    }

    function createAgentCard(agent) {
        return `
            <div class="agent-card">
                <img src="${agent.avatar}" alt="${agent.name}" class="agent-avatar" onerror="this.src='https://via.placeholder.com/120x120/f3f4f6/6b7280?text=Agent'">
                <div class="agent-info">
                    <div>
                        <div class="agent-name">${agent.name}</div>
                        <div class="agent-specialty">${agent.specialty}</div>
                        <div class="agent-description">${agent.description}</div>
                        <div class="agent-stats">
                            <span class="agent-stat">
                                <i class="fas fa-star"></i> ${agent.rating}/5
                            </span>
                            <span class="agent-stat">
                                <i class="fas fa-users"></i> ${agent.clients} clients
                            </span>
                            <span class="agent-stat">
                                <i class="fas fa-globe"></i> ${agent.experience} years
                            </span>
                        </div>
                    </div>
                </div>
                <div class="agent-actions">
                    <button class="contact-agent-btn" data-agent-id="${agent.id}">
                        <i class="fas fa-phone"></i> Contact
                    </button>
                    <button class="view-profile-btn" data-agent-id="${agent.id}">
                        <i class="fas fa-user"></i> View Profile
                    </button>
                </div>
            </div>
        `;
    }

    function addBookingEventListeners(type) {
        const buttons = document.querySelectorAll(`[data-${type}-id]`);
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.dataset[`${type}Id`];
                handleBooking(type, id);
            });
        });
    }

    function handleBooking(type, id) {
        showBookingModal(type, id);
    }

    function showBookingModal(type, id) {
        const modal = document.createElement('div');
        modal.className = 'booking-modal';
        modal.innerHTML = `
            <div class="booking-modal-content">
                <div class="booking-modal-header">
                    <h3>Book ${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                    <button class="modal-close" onclick="this.closest('.booking-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="booking-modal-body">
                    <p>Redirecting to booking partner...</p>
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            showToast(`Redirecting to ${type} booking...`, 'success');
            modal.remove();
        }, 2000);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        }
    }

    function getMockResults(type) {
        switch (type) {
            case 'flights':
                return getMockFlights();
            case 'hotels':
                return getMockHotels();
            case 'activities':
                return getMockActivities();
            case 'packages':
                return getMockPackages();
            case 'agents':
                return getMockAgents();
            default:
                return [];
        }
    }

    function getMockFlights() {
        return [
            {
                id: 'f1',
                from: 'New York',
                to: 'Paris',
                airline: 'Air France',
                flightNumber: 'AF123',
                aircraft: 'Boeing 777',
                departureTime: '10:30 AM',
                departureDate: 'Dec 15, 2024',
                duration: '7h 45m',
                price: 899
            },
            {
                id: 'f2',
                from: 'New York',
                to: 'Paris',
                airline: 'Delta Airlines',
                flightNumber: 'DL456',
                aircraft: 'Airbus A350',
                departureTime: '2:15 PM',
                departureDate: 'Dec 15, 2024',
                duration: '8h 20m',
                price: 745
            }
        ];
    }

    function getMockHotels() {
        return [
            {
                id: 'h1',
                name: 'Le Grand Hotel Paris',
                location: 'Champs-Élysées, Paris',
                image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
                price: 350,
                rating: 4.8,
                amenities: [
                    { name: 'WiFi', icon: 'wifi' },
                    { name: 'Pool', icon: 'swimming-pool' },
                    { name: 'Spa', icon: 'spa' },
                    { name: 'Restaurant', icon: 'utensils' }
                ]
            },
            {
                id: 'h2',
                name: 'Hotel Ritz Paris',
                location: 'Place Vendôme, Paris',
                image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
                price: 850,
                rating: 4.9,
                amenities: [
                    { name: 'WiFi', icon: 'wifi' },
                    { name: 'Gym', icon: 'dumbbell' },
                    { name: 'Spa', icon: 'spa' },
                    { name: 'Bar', icon: 'glass-martini' }
                ]
            }
        ];
    }

    function getMockActivities() {
        return [
            {
                id: 'a1',
                name: 'Eiffel Tower Skip-the-Line Tour',
                category: 'Culture',
                description: 'Skip the long lines and enjoy priority access to the iconic Eiffel Tower.',
                image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400',
                price: 89,
                duration: '2 hours',
                maxParticipants: 15,
                rating: 4.6
            },
            {
                id: 'a2',
                name: 'Seine River Dinner Cruise',
                category: 'Food',
                description: 'Enjoy a romantic dinner cruise along the Seine River with stunning views.',
                image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
                price: 125,
                duration: '3 hours',
                maxParticipants: 50,
                rating: 4.8
            }
        ];
    }

    function getMockPackages() {
        return [
            {
                id: 'p1',
                name: 'Paris Romantic Getaway',
                type: 'Romantic',
                description: 'Perfect for couples, this package includes luxury hotel and romantic dinner.',
                image: 'https://images.unsplash.com/photo-1502602898534-47d22c0d8064?w=400',
                price: 1299,
                duration: '5 days, 4 nights',
                includes: ['Luxury Hotel', 'Airport Transfer', 'Romantic Dinner', 'Private Tours']
            },
            {
                id: 'p2',
                name: 'Paris Family Adventure',
                type: 'Family',
                description: 'Family-friendly package with activities for all ages.',
                image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9e1?w=400',
                price: 899,
                duration: '6 days, 5 nights',
                includes: ['Family Hotel', 'Airport Transfer', 'Family Tours', 'Museum Passes']
            }
        ];
    }

    function getMockAgents() {
        return [
            {
                id: 'ag1',
                name: 'Marie Dubois',
                specialty: 'Luxury Travel',
                description: 'Specializing in luxury European travel with over 15 years of experience.',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120',
                rating: 4.9,
                clients: 250,
                experience: 15
            },
            {
                id: 'ag2',
                name: 'Jean-Pierre Martin',
                specialty: 'Adventure Travel',
                description: 'Expert in adventure and outdoor travel experiences across Europe.',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
                rating: 4.7,
                clients: 180,
                experience: 12
            }
        ];
    }
});

// Add booking modal styles
const modalStyles = `
<style>
.booking-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.booking-modal-content {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    text-align: center;
}

.booking-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.booking-modal-header h3 {
    margin: 0;
    color: #1f2937;
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
}

.modal-close:hover {
    color: #374151;
}

.booking-modal-body {
    color: #6b7280;
}

.booking-modal-body .loading-spinner {
    margin: 1rem auto;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', modalStyles);
