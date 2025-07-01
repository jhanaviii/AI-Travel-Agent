// Main JavaScript for Travel Agent App
class TravelAgentApp {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupAnalytics();
        this.setupCommonEventListeners();
        this.setupPageSpecificFeatures();
        this.loadSavedPreferences();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('upload.html')) return 'upload';
        if (path.includes('destinations.html')) return 'destinations';
        if (path.includes('visualizations.html')) return 'visualizations';
        return 'home';
    }

    setupNavigation() {
        // Update active navigation link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === this.getPageUrl(this.currentPage)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Setup smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    ui.scrollToElement(target);
                }
            });
        });
    }

    getPageUrl(page) {
        const urls = {
            home: 'index.html',
            upload: 'upload.html',
            destinations: 'destinations.html',
            visualizations: 'visualizations.html'
        };
        return urls[page] || 'index.html';
    }

    setupAnalytics() {
        // Track page views
        this.trackPageView();
        
        // Track user interactions
        this.setupEventTracking();
    }

    trackPageView() {
        const pageData = {
            page: this.currentPage,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
        };

        // Store in localStorage for analytics
        const analytics = JSON.parse(localStorage.getItem('analytics') || '[]');
        analytics.push(pageData);
        
        // Keep only last 100 entries
        if (analytics.length > 100) {
            analytics.splice(0, analytics.length - 100);
        }
        
        localStorage.setItem('analytics', JSON.stringify(analytics));
    }

    setupEventTracking() {
        // Track button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn')) {
                this.trackEvent('button_click', {
                    button: e.target.textContent.trim(),
                    page: this.currentPage
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            this.trackEvent('form_submit', {
                form: e.target.className || 'unknown',
                page: this.currentPage
            });
        });

        // Track file uploads
        document.addEventListener('change', (e) => {
            if (e.target.type === 'file') {
                this.trackEvent('file_upload', {
                    fileType: e.target.files[0]?.type || 'unknown',
                    fileSize: e.target.files[0]?.size || 0,
                    page: this.currentPage
                });
            }
        });
    }

    trackEvent(eventName, data) {
        const eventData = {
            event: eventName,
            data: data,
            timestamp: new Date().toISOString()
        };

        const events = JSON.parse(localStorage.getItem('events') || '[]');
        events.push(eventData);
        
        // Keep only last 200 events
        if (events.length > 200) {
            events.splice(0, events.length - 200);
        }
        
        localStorage.setItem('events', JSON.stringify(eventData));
    }

    setupCommonEventListeners() {
        // Setup theme toggle if available
        this.setupThemeToggle();
        
        // Setup language selector if available
        this.setupLanguageSelector();
        
        // Setup accessibility features
        this.setupAccessibility();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
            });
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update theme toggle button
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    setupLanguageSelector() {
        const languageSelect = document.querySelector('.language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    }

    setLanguage(language) {
        localStorage.setItem('language', language);
        // In a real app, you would reload the page with new language
        ui.showToast(`Language changed to ${language}`, 'success');
    }

    setupAccessibility() {
        // Add skip to main content link
        this.addSkipLink();
        
        // Setup focus management
        this.setupFocusManagement();
        
        // Setup ARIA labels
        this.setupARIALabels();
    }

    addSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            z-index: 1000;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    setupFocusManagement() {
        // Trap focus in modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && document.querySelector('.lightbox.active')) {
                const focusableElements = document.querySelector('.lightbox').querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }

    setupARIALabels() {
        // Add ARIA labels to interactive elements
        const buttons = document.querySelectorAll('button:not([aria-label])');
        buttons.forEach(button => {
            if (button.textContent.trim()) {
                button.setAttribute('aria-label', button.textContent.trim());
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Escape: Close modals/lightbox
            if (e.key === 'Escape') {
                const lightbox = document.querySelector('.lightbox.active');
                if (lightbox) {
                    ui.closeLightbox();
                }
            }
            
            // Ctrl/Cmd + S: Save/export
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.handleSaveShortcut();
            }
        });
    }

    handleSaveShortcut() {
        switch (this.currentPage) {
            case 'destinations':
                if (window.destinationsPage) {
                    destinationsPage.exportDestinations();
                }
                break;
            case 'visualizations':
                if (window.visualizationsPage) {
                    visualizationsPage.exportVisualizations();
                }
                break;
            default:
                ui.showToast('No data to save on this page', 'warning');
        }
    }

    setupPageSpecificFeatures() {
        switch (this.currentPage) {
            case 'home':
                this.setupHomePageFeatures();
                break;
            case 'upload':
                this.setupUploadPageFeatures();
                break;
            case 'destinations':
                this.setupDestinationsPageFeatures();
                break;
            case 'visualizations':
                this.setupVisualizationsPageFeatures();
                break;
        }
    }

    setupHomePageFeatures() {
        // Setup hero animations
        this.setupHeroAnimations();
        
        // Setup testimonial carousel
        this.setupTestimonialCarousel();
        
        // Setup feature highlights
        this.setupFeatureHighlights();
    }

    setupHeroAnimations() {
        const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-description, .hero-buttons');
        heroElements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    setupTestimonialCarousel() {
        const testimonials = document.querySelectorAll('.testimonial-card');
        let currentIndex = 0;

        if (testimonials.length > 1) {
            setInterval(() => {
                testimonials[currentIndex].style.opacity = '0.5';
                currentIndex = (currentIndex + 1) % testimonials.length;
                testimonials[currentIndex].style.opacity = '1';
            }, 5000);
        }
    }

    setupFeatureHighlights() {
        const features = document.querySelectorAll('.feature-card');
        features.forEach(feature => {
            feature.addEventListener('mouseenter', () => {
                feature.style.transform = 'translateY(-10px) scale(1.02)';
            });
            
            feature.addEventListener('mouseleave', () => {
                feature.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    setupUploadPageFeatures() {
        // Additional upload page features
        this.setupDragAndDropEnhancements();
    }

    setupDragAndDropEnhancements() {
        const dropZone = document.querySelector('.photo-upload');
        if (dropZone) {
            dropZone.addEventListener('dragenter', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--primary)';
                dropZone.style.backgroundColor = 'var(--primary, #0ea5e9, 0.1)';
            });
            
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '#ddd';
                dropZone.style.backgroundColor = '';
            });
        }
    }

    setupDestinationsPageFeatures() {
        // Additional destinations page features
        this.setupDestinationFilters();
    }

    setupDestinationFilters() {
        // Add advanced filtering options
        const filterContainer = document.querySelector('.search-filter-container');
        if (filterContainer) {
            const advancedFilters = document.createElement('div');
            advancedFilters.className = 'advanced-filters';
            advancedFilters.innerHTML = `
                <button class="btn btn-secondary" onclick="app.toggleAdvancedFilters()">
                    Advanced Filters
                </button>
            `;
            filterContainer.appendChild(advancedFilters);
        }
    }

    setupVisualizationsPageFeatures() {
        // Additional visualizations page features
        this.setupGalleryEnhancements();
    }

    setupGalleryEnhancements() {
        // Add lazy loading for images
        const images = document.querySelectorAll('.visualization-image');
        images.forEach(img => {
            img.loading = 'lazy';
        });
    }

    loadSavedPreferences() {
        // Load theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        }
        
        // Load language preference
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage) {
            this.setLanguage(savedLanguage);
        }
    }

    // Utility methods
    getAnalytics() {
        return {
            pageViews: JSON.parse(localStorage.getItem('analytics') || '[]'),
            events: JSON.parse(localStorage.getItem('events') || '[]')
        };
    }

    clearAnalytics() {
        localStorage.removeItem('analytics');
        localStorage.removeItem('events');
        ui.showToast('Analytics cleared', 'success');
    }

    exportAnalytics() {
        const analytics = this.getAnalytics();
        const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'travel_agent_analytics.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        ui.showToast('Analytics exported successfully!', 'success');
    }

    // Performance monitoring
    measurePageLoadTime() {
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            this.trackEvent('page_load_time', {
                page: this.currentPage,
                loadTime: Math.round(loadTime)
            });
        });
    }

    // Error handling
    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            this.trackEvent('error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                page: this.currentPage
            });
        });

        window.addEventListener('unhandledrejection', (e) => {
            this.trackEvent('unhandled_promise_rejection', {
                reason: e.reason,
                page: this.currentPage
            });
        });
    }
}

// Initialize the app
const app = new TravelAgentApp();
window.app = app;

// Setup error handling
app.setupErrorHandling();

// Measure page load time
app.measurePageLoadTime();