// Recommendations Page JavaScript
class RecommendationsPage {
    constructor() {
        this.api = new APIService();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupBudgetSlider();
        this.setupInterestCheckboxes();
    }

    setupEventListeners() {
        const form = document.getElementById('recommendationsForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateRecommendations();
            });
        }
    }

    setupBudgetSlider() {
        const budgetSlider = document.getElementById('budgetRange');
        const budgetValue = document.getElementById('budgetValue');
        
        if (budgetSlider && budgetValue) {
            budgetSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                budgetValue.textContent = `$${value.toLocaleString()}`;
            });
        }
    }

    setupInterestCheckboxes() {
        const checkboxes = document.querySelectorAll('.interest-checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const label = e.target.closest('.interest-checkbox');
                if (e.target.checked) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
            });
        });
    }

    getFormData() {
        const ageGroup = document.getElementById('ageGroup').value;
        const groupSize = document.getElementById('groupSize').value;
        const budgetRange = document.getElementById('budgetRange').value;
        const tripDuration = document.getElementById('tripDuration').value;
        const additionalNotes = document.getElementById('additionalNotes').value;

        // Get selected interests
        const selectedInterests = [];
        const interestCheckboxes = document.querySelectorAll('.interest-checkbox input[type="checkbox"]:checked');
        interestCheckboxes.forEach(checkbox => {
            selectedInterests.push(checkbox.value);
        });

        return {
            ageGroup,
            groupSize,
            budgetRange: parseInt(budgetRange),
            tripDuration,
            interests: selectedInterests,
            additionalNotes
        };
    }

    validateForm() {
        const data = this.getFormData();
        
        if (!data.ageGroup) {
            uiComponents.showToast('Please select your age group', 'error');
            return false;
        }
        
        if (!data.groupSize) {
            uiComponents.showToast('Please select your group size', 'error');
            return false;
        }
        
        if (!data.tripDuration) {
            uiComponents.showToast('Please select your trip duration', 'error');
            return false;
        }
        
        if (data.interests.length === 0) {
            uiComponents.showToast('Please select at least one interest', 'error');
            return false;
        }
        
        return true;
    }

    async generateRecommendations() {
        if (!this.validateForm()) {
            return;
        }

        const formData = this.getFormData();
        
        // Show loading state
        this.showLoadingState();
        
        try {
            const response = await this.api.generatePersonalizedRecommendations(formData);
            
            if (response.success) {
                this.displayRecommendations(response.data);
            } else {
                throw new Error(response.message || 'Failed to generate recommendations');
            }
        } catch (error) {
            console.error('Recommendations generation failed:', error);
            uiComponents.showToast(`Failed to generate recommendations: ${error.message}`, 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        const form = document.querySelector('.preferences-form');
        const loadingState = document.getElementById('loadingState');
        const results = document.getElementById('recommendationsResults');
        
        if (form) form.style.display = 'none';
        if (loadingState) loadingState.style.display = 'block';
        if (results) results.style.display = 'none';
    }

    hideLoadingState() {
        const form = document.querySelector('.preferences-form');
        const loadingState = document.getElementById('loadingState');
        
        if (form) form.style.display = 'block';
        if (loadingState) loadingState.style.display = 'none';
    }

    displayRecommendations(data) {
        const results = document.getElementById('recommendationsResults');
        const content = document.getElementById('recommendationsContent');
        
        if (!results || !content) return;
        
        let html = '';
        
        // Display destinations
        if (data.destinations && data.destinations.length > 0) {
            html += '<div class="recommendation-card">';
            html += '<h4><i class="fas fa-map-marker-alt"></i> Recommended Destinations</h4>';
            html += '<p>Based on your preferences, here are the perfect destinations for your trip:</p>';
            
            data.destinations.forEach((dest, index) => {
                html += `
                    <div style="margin: 15px 0; padding: 15px; background: white; border-radius: 8px; border-left: 3px solid #3498db;">
                        <h5 style="margin: 0 0 10px 0; color: #2c3e50;">${index + 1}. ${dest.name}</h5>
                        <p style="margin: 0 0 8px 0; color: #7f8c8d;">${dest.country}, ${dest.continent}</p>
                        <p style="margin: 0; font-size: 14px;">${dest.description}</p>
                        <div style="margin-top: 10px;">
                            <span style="background: #e8f5e8; color: #27ae60; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px;">
                                Rating: ${dest.rating}/5
                            </span>
                            <span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                Budget: ${dest.price}
                            </span>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        // Display itinerary
        if (data.itinerary && data.itinerary.length > 0) {
            html += '<div class="recommendation-card">';
            html += '<h4><i class="fas fa-calendar-alt"></i> Custom Itinerary</h4>';
            html += '<p>Here\'s a personalized itinerary based on your interests and preferences:</p>';
            
            data.itinerary.forEach((day, index) => {
                html += `
                    <div class="itinerary-day">
                        <h5>Day ${index + 1}: ${day.title}</h5>
                        <ul>
                            ${day.activities.map(activity => `<li>${activity}</li>`).join('')}
                        </ul>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        // Display travel tips
        if (data.travelTips && data.travelTips.length > 0) {
            html += '<div class="recommendation-card">';
            html += '<h4><i class="fas fa-lightbulb"></i> Travel Tips & Recommendations</h4>';
            html += '<ul style="margin: 0; padding-left: 20px;">';
            data.travelTips.forEach(tip => {
                html += `<li style="margin-bottom: 8px; color: #7f8c8d;">${tip}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }
        
        // Display budget breakdown
        if (data.budgetBreakdown) {
            html += '<div class="recommendation-card">';
            html += '<h4><i class="fas fa-calculator"></i> Budget Breakdown</h4>';
            html += '<p>Estimated costs for your trip:</p>';
            html += `
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Accommodation:</span>
                        <span style="font-weight: 600;">$${data.budgetBreakdown.accommodation}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Transportation:</span>
                        <span style="font-weight: 600;">$${data.budgetBreakdown.transportation}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Food & Dining:</span>
                        <span style="font-weight: 600;">$${data.budgetBreakdown.food}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Activities:</span>
                        <span style="font-weight: 600;">$${data.budgetBreakdown.activities}</span>
                    </div>
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #ecf0f1;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 18px;">
                        <span>Total Estimated Cost:</span>
                        <span style="color: #27ae60;">$${data.budgetBreakdown.total}</span>
                    </div>
                </div>
            `;
            html += '</div>';
        }
        
        content.innerHTML = html;
        results.style.display = 'block';
        
        // Scroll to results
        results.scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize recommendations page
const recommendationsPage = new RecommendationsPage();
window.recommendationsPage = recommendationsPage; 