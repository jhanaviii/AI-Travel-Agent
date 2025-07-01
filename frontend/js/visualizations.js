// Visualizations Page JavaScript
class VisualizationsPage {
    constructor() {
        this.api = new APIService();
        this.visualizations = [];
        this.filteredVisualizations = [];
        this.selectedDestination = null;
        this.generatedVisualization = null;
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.loadSelectedDestination();
        this.loadGeneratedVisualization();
        this.loadVisualizations();
        this.setupFilterTabs();
        this.setupEventListeners();
        this.updateStats();
        this.checkBackendStatus();
    }

    async checkBackendStatus() {
        const backendAvailable = await this.api.checkBackendHealth();
        if (!backendAvailable) {
            uiComponents.showToast('Backend server is not available. Using demo data.', 'warning');
        }
    }

    loadSelectedDestination() {
        // Load selected destination from session storage (from destinations page)
        const savedDestination = sessionStorage.getItem('selectedDestination');
        if (savedDestination) {
            try {
                this.selectedDestination = JSON.parse(savedDestination);
                this.showDestinationInfo();
            } catch (error) {
                console.error('Error loading selected destination:', error);
            }
        }
    }

    loadGeneratedVisualization() {
        // Load generated visualization from session storage (from destinations page)
        const savedVisualization = sessionStorage.getItem('generatedVisualization');
        if (savedVisualization) {
            try {
                this.generatedVisualization = JSON.parse(savedVisualization);
                this.showGeneratedVisualization();
            } catch (error) {
                console.error('Error loading generated visualization:', error);
            }
        }
    }

    showDestinationInfo() {
        if (!this.selectedDestination) return;

        const destinationInfo = document.createElement('div');
        destinationInfo.className = 'upload-info';
        destinationInfo.innerHTML = `
            <div class="info-icon">🎯</div>
            <div class="info-title">Selected Destination</div>
            <div class="info-content">
                <p><strong>${this.selectedDestination.name}</strong></p>
                <p>${this.selectedDestination.city ? `${this.selectedDestination.city}, ` : ''}${this.selectedDestination.country}</p>
                <p>Rating: ${this.formatRating(this.selectedDestination.rating || 4.5)} ⭐</p>
                <p>Best Time: ${this.selectedDestination.bestTime || 'Year-round'}</p>
            </div>
        `;

        const header = document.querySelector('.visualizations-header');
        if (header) {
            header.appendChild(destinationInfo);
        }
    }

    showGeneratedVisualization() {
        if (!this.generatedVisualization) return;

        const generatedInfo = document.createElement('div');
        generatedInfo.className = 'upload-info';
        generatedInfo.innerHTML = `
            <div class="info-icon">✨</div>
            <div class="info-title">Generated Visualization</div>
            <div class="info-content">
                <p>Your personalized visualization is ready!</p>
                <img src="${this.generatedVisualization.visualization_url}" alt="Generated visualization" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; margin: 10px 0;">
                <p><strong>Destination:</strong> ${this.generatedVisualization.destination.name}</p>
                <p><strong>Generated:</strong> ${this.formatDate(this.generatedVisualization.timestamp)}</p>
                <div class="visualization-actions">
                    <button class="btn btn-primary" onclick="visualizationsPage.downloadVisualization()">Download</button>
                    <button class="btn btn-secondary" onclick="visualizationsPage.shareVisualization()">Share</button>
                </div>
            </div>
        `;

        const header = document.querySelector('.visualizations-header');
        if (header) {
            header.appendChild(generatedInfo);
        }
    }

    formatRating(rating) {
        return rating.toFixed(1);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    async loadVisualizations() {
        const loadingState = document.querySelector('.loading-state');
        const galleryGrid = document.querySelector('.gallery-grid');
        const emptyState = document.querySelector('.empty-state');

        if (loadingState) loadingState.style.display = 'flex';
        if (galleryGrid) galleryGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';

        try {
            const backendAvailable = await this.api.checkBackendHealth();
            
            if (backendAvailable) {
                // Use real API
                const response = await this.api.getVisualizations();
                if (response.success) {
                    this.visualizations = response.data.map(viz => ({
                        id: viz.id,
                        title: `Visualization at ${viz.destinations?.name || 'Unknown Destination'}`,
                        location: `${viz.destinations?.city || ''}${viz.destinations?.city && viz.destinations?.country ? ', ' : ''}${viz.destinations?.country || ''}`,
                        date: viz.created_at,
                        image: viz.generated_image_url,
                        type: this.getVisualizationType(viz.destinations?.continent),
                        confidence: 0.95, // Mock confidence for now
                        recommendations: this.getRecommendations(viz.destinations?.continent)
                    }));
                } else {
                    throw new Error('Failed to load visualizations');
                }
            } else {
                // Use mock data
                this.visualizations = this.api.getMockVisualizations();
                
                // Add generated visualization to the list if available
                if (this.generatedVisualization) {
                    this.visualizations.unshift({
                        id: 'generated-' + Date.now(),
                        title: `Your Visualization at ${this.generatedVisualization.destination.name}`,
                        location: `${this.generatedVisualization.destination.city || ''}${this.generatedVisualization.destination.city && this.generatedVisualization.destination.country ? ', ' : ''}${this.generatedVisualization.destination.country || ''}`,
                        date: this.generatedVisualization.timestamp,
                        image: this.generatedVisualization.visualization_url,
                        type: this.getVisualizationType(this.generatedVisualization.destination.continent),
                        confidence: 0.98,
                        recommendations: this.getRecommendations(this.generatedVisualization.destination.continent),
                        isGenerated: true
                    });
                }
            }

            this.filteredVisualizations = [...this.visualizations];
            this.renderVisualizations();

        } catch (error) {
            console.error('Failed to load visualizations:', error);
            uiComponents.showToast('Failed to load visualizations. Please try again.', 'error');
            this.showEmptyState();
        } finally {
            if (loadingState) loadingState.style.display = 'none';
        }
    }

    getVisualizationType(continent) {
        const types = {
            'Europe': 'architecture',
            'Asia': 'culture',
            'North America': 'landscape',
            'Africa': 'wildlife',
            'Oceania': 'adventure'
        };
        return types[continent] || 'travel';
    }

    getRecommendations(continent) {
        const recommendations = {
            'Europe': ['Best viewing spots', 'Cultural context', 'Historical significance'],
            'Asia': ['Traditional customs', 'Local etiquette', 'Cultural experiences'],
            'North America': ['Outdoor activities', 'Wildlife spotting', 'Adventure tips'],
            'Africa': ['Safari tips', 'Cultural experiences', 'Local customs'],
            'Oceania': ['Adventure activities', 'Indigenous culture', 'Natural beauty']
        };
        return recommendations[continent] || ['Travel tips', 'Local insights', 'Cultural highlights'];
    }

    setupFilterTabs() {
        const filterTabs = document.querySelectorAll('.filter-tab');
        
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const filter = tab.dataset.filter;
                this.setActiveFilter(filter);
                this.filterVisualizations(filter);
            });
        });
    }

    setActiveFilter(filter) {
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            if (tab.dataset.filter === filter) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        this.currentFilter = filter;
    }

    filterVisualizations(filter) {
        if (filter === 'all') {
            this.filteredVisualizations = [...this.visualizations];
        } else {
            this.filteredVisualizations = this.visualizations.filter(viz => viz.type === filter);
        }
        this.renderVisualizations();
    }

    setupEventListeners() {
        this.setupQuickActions();
        this.setupBackToDestinations();
    }

    setupQuickActions() {
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    setupBackToDestinations() {
        const backButton = document.querySelector('.btn-secondary');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = 'destinations.html';
            });
        }
    }

    handleQuickAction(action) {
        switch (action) {
            case 'download-all':
                this.downloadAllVisualizations();
                break;
            case 'share-gallery':
                this.shareGallery();
                break;
            case 'export-data':
                this.exportVisualizations();
                break;
            case 'clear-filters':
                this.clearFilters();
                break;
            default:
                uiComponents.showToast(`Action ${action} not implemented yet`, 'warning');
        }
    }

    renderVisualizations() {
        const galleryGrid = document.querySelector('.gallery-grid');
        const emptyState = document.querySelector('.empty-state');

        if (!galleryGrid) return;

        if (this.filteredVisualizations.length === 0) {
            galleryGrid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        galleryGrid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        galleryGrid.innerHTML = this.filteredVisualizations.map(viz => 
            this.createVisualizationCard(viz)
        ).join('');

        this.setupCardInteractions();
    }

    createVisualizationCard(visualization) {
        const confidencePercent = Math.round(visualization.confidence * 100);
        const recommendations = visualization.recommendations ? visualization.recommendations.slice(0, 2).join(' • ') : '';
        
        return `
            <div class="visualization-card ${visualization.isGenerated ? 'generated' : ''}" data-id="${visualization.id}">
                ${visualization.isGenerated ? '<div class="generated-badge">New</div>' : ''}
                <img src="${visualization.image}" alt="${visualization.title}" class="visualization-image">
                <div class="visualization-content">
                    <h3 class="visualization-title">${visualization.title}</h3>
                    <div class="visualization-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${visualization.location}</span>
                    </div>
                    <div class="visualization-date">
                        <i class="fas fa-calendar"></i>
                        <span>${this.formatDate(visualization.date)}</span>
                    </div>
                    ${recommendations ? `<div class="visualization-recommendations">${recommendations}</div>` : ''}
                    <div class="visualization-actions">
                        <button class="btn btn-primary" onclick="visualizationsPage.openVisualization('${visualization.id}')">
                            <i class="fas fa-eye"></i>
                            View
                        </button>
                        <button class="btn btn-secondary" onclick="visualizationsPage.shareVisualization('${visualization.id}')">
                            <i class="fas fa-share"></i>
                            Share
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupCardInteractions() {
        const cards = document.querySelectorAll('.visualization-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn')) {
                    const id = card.dataset.id;
                    this.openVisualization(id);
                }
            });
        });
    }

    openVisualization(id) {
        const visualization = this.visualizations.find(v => v.id === id);
        if (visualization) {
            // Open in lightbox or navigate to detail page
            uiComponents.showToast(`Opening ${visualization.title}`, 'success');
        }
    }

    shareVisualization(id = null) {
        const visualization = id ? this.visualizations.find(v => v.id === id) : this.generatedVisualization;
        
        if (!visualization) {
            uiComponents.showToast('No visualization to share', 'error');
            return;
        }

        const shareText = `Check out my AI-generated travel visualization at ${visualization.title}! 🎯✈️`;
        const shareUrl = visualization.image || window.location.href;

        if (navigator.share) {
            navigator.share({
                title: visualization.title,
                text: shareText,
                url: shareUrl
            });
        } else {
            navigator.clipboard.writeText(shareText + '\n' + shareUrl).then(() => {
                uiComponents.showToast('Visualization shared to clipboard!', 'success');
            });
        }
    }

    downloadVisualization() {
        if (!this.generatedVisualization) {
            uiComponents.showToast('No visualization to download', 'error');
            return;
        }

        const link = document.createElement('a');
        link.href = this.generatedVisualization.visualization_url;
        link.download = `travel_visualization_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        uiComponents.showToast('Visualization downloaded successfully!', 'success');
    }

    showEmptyState() {
        const galleryGrid = document.querySelector('.gallery-grid');
        const emptyState = document.querySelector('.empty-state');
        
        if (galleryGrid) galleryGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }

    updateStats() {
        const stats = this.getVisualizationStats();
        
        const totalEl = document.querySelector('.stat-number[data-stat="total"]');
        const recentEl = document.querySelector('.stat-number[data-stat="recent"]');
        const avgConfidenceEl = document.querySelector('.stat-number[data-stat="confidence"]');

        if (totalEl) totalEl.textContent = stats.total;
        if (recentEl) recentEl.textContent = stats.recent;
        if (avgConfidenceEl) avgConfidenceEl.textContent = stats.avgConfidence;
    }

    getVisualizationStats() {
        const total = this.visualizations.length;
        const recent = this.visualizations.filter(v => {
            const date = new Date(v.date);
            const now = new Date();
            const diffDays = (now - date) / (1000 * 60 * 60 * 24);
            return diffDays <= 7;
        }).length;
        const avgConfidence = this.visualizations.length > 0 
            ? Math.round(this.visualizations.reduce((sum, v) => sum + v.confidence, 0) / this.visualizations.length * 100)
            : 0;

        return { total, recent, avgConfidence: `${avgConfidence}%` };
    }

    downloadAllVisualizations() {
        uiComponents.showToast('Downloading all visualizations...', 'success');
        // Implementation for downloading all visualizations
    }

    shareGallery() {
        const shareText = `Check out my AI Travel visualizations! I've created ${this.visualizations.length} amazing travel scenes. 🎯✈️`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My AI Travel Visualizations',
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(shareText + '\n' + window.location.href).then(() => {
                uiComponents.showToast('Gallery shared to clipboard!', 'success');
            });
        }
    }

    exportVisualizations() {
        const data = {
            visualizations: this.visualizations,
            stats: this.getVisualizationStats(),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'travel_visualizations.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        uiComponents.showToast('Visualizations exported successfully!', 'success');
    }

    clearFilters() {
        this.setActiveFilter('all');
        this.filterVisualizations('all');
        uiComponents.showToast('Filters cleared', 'success');
    }

    searchVisualizations(query) {
        if (!query) {
            this.filteredVisualizations = [...this.visualizations];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredVisualizations = this.visualizations.filter(viz => 
                viz.title.toLowerCase().includes(searchTerm) ||
                viz.location.toLowerCase().includes(searchTerm)
            );
        }
        this.renderVisualizations();
    }
}

// Initialize visualizations page
const visualizationsPage = new VisualizationsPage();
window.visualizationsPage = visualizationsPage; 