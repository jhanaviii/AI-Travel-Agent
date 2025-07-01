// UI Utilities for Travel Agent App
class UIUtils {
    constructor() {
        this.toastContainer = null;
        this.lightbox = null;
        this.init();
    }

    init() {
        this.createToastContainer();
        this.createLightbox();
        this.setupMobileMenu();
    }

    // Toast Notifications
    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    showToast(message, type = 'success', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.removeToast(toast);

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
        `;
        toast.appendChild(closeBtn);

        this.toastContainer.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        return toast;
    }

    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠'
        };
        return icons[type] || icons.success;
    }

    // Lightbox for image viewing
    createLightbox() {
        this.lightbox = document.createElement('div');
        this.lightbox.className = 'lightbox';
        this.lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close">×</button>
                <img class="lightbox-image" src="" alt="">
                <div class="lightbox-info">
                    <h3 class="lightbox-title"></h3>
                    <p class="lightbox-location"></p>
                    <div class="lightbox-actions">
                        <button class="lightbox-action" data-action="download">
                            <span>📥</span> Download
                        </button>
                        <button class="lightbox-action" data-action="share">
                            <span>📤</span> Share
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.lightbox);

        // Close lightbox
        this.lightbox.querySelector('.lightbox-close').onclick = () => this.closeLightbox();
        this.lightbox.onclick = (e) => {
            if (e.target === this.lightbox) this.closeLightbox();
        };
    }

    openLightbox(imageSrc, title, location) {
        const image = this.lightbox.querySelector('.lightbox-image');
        const titleEl = this.lightbox.querySelector('.lightbox-title');
        const locationEl = this.lightbox.querySelector('.lightbox-location');

        image.src = imageSrc;
        image.alt = title;
        titleEl.textContent = title;
        locationEl.textContent = location;

        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Setup action buttons
        this.setupLightboxActions(imageSrc, title);
    }

    closeLightbox() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    setupLightboxActions(imageSrc, title) {
        const downloadBtn = this.lightbox.querySelector('[data-action="download"]');
        const shareBtn = this.lightbox.querySelector('[data-action="share"]');

        downloadBtn.onclick = () => this.downloadImage(imageSrc, title);
        shareBtn.onclick = () => this.shareImage(imageSrc, title);
    }

    downloadImage(imageSrc, title) {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('Image downloaded successfully!');
    }

    shareImage(imageSrc, title) {
        if (navigator.share) {
            navigator.share({
                title: title,
                text: `Check out this amazing travel destination: ${title}`,
                url: imageSrc
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(imageSrc).then(() => {
                this.showToast('Image URL copied to clipboard!');
            });
        }
    }

    // Loading States
    showLoading(element, message = 'Loading...') {
        const loading = document.createElement('div');
        loading.className = 'upload-loading';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
            <div class="loading-subtext">Please wait while we process your request</div>
        `;
        
        element.style.position = 'relative';
        element.appendChild(loading);
        return loading;
    }

    hideLoading(element) {
        const loading = element.querySelector('.upload-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Form Validation
    validateFile(file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxSize = 10 * 1024 * 1024) {
        if (!file) {
            return { valid: false, error: 'Please select a file' };
        }

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Please select a valid image file (JPEG, PNG, or WebP)' };
        }

        if (file.size > maxSize) {
            return { valid: false, error: 'File size must be less than 10MB' };
        }

        return { valid: true };
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // File Upload UI
    setupFileUpload(dropZone, fileInput, previewContainer) {
        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0], fileInput, previewContainer);
            }
        });

        // Click to upload
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0], fileInput, previewContainer);
            }
        });
    }

    handleFileSelect(file, fileInput, previewContainer) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showToast(validation.error, 'error');
            return;
        }

        // Update file input
        fileInput.files = new DataTransfer().files;
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;

        // Show preview
        this.showImagePreview(file, previewContainer);
        
        this.showToast('Image selected successfully!', 'success');
    }

    showImagePreview(file, container) {
        const reader = new FileReader();
        reader.onload = (e) => {
            container.innerHTML = `
                <div class="preview-container">
                    <img src="${e.target.result}" alt="Preview" class="preview-image">
                    <button class="preview-remove" onclick="ui.removeImagePreview(this)">×</button>
                </div>
                <div class="preview-status">
                    <span class="status-icon">✓</span>
                    <span>Image ready for upload</span>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }

    removeImagePreview(button) {
        const container = button.closest('.upload-preview');
        container.innerHTML = '';
        
        // Clear file input
        const fileInput = document.querySelector('#file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }

    // Mobile Menu
    setupMobileMenu() {
        const toggle = document.querySelector('.nav-toggle');
        const menu = document.querySelector('.nav-menu');
        
        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                menu.classList.toggle('active');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!toggle.contains(e.target) && !menu.contains(e.target)) {
                    menu.classList.remove('active');
                }
            });
        }
    }

    // Search and Filter
    setupSearchFilter(searchInput, filterSelect, items, renderFunction) {
        let currentItems = [...items];
        let currentSearch = '';
        let currentFilter = 'all';

        const filterItems = () => {
            let filtered = currentItems;

            // Apply search
            if (currentSearch) {
                filtered = filtered.filter(item => 
                    item.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                    item.location.toLowerCase().includes(currentSearch.toLowerCase()) ||
                    item.description.toLowerCase().includes(currentSearch.toLowerCase())
                );
            }

            // Apply filter
            if (currentFilter !== 'all') {
                filtered = filtered.filter(item => {
                    switch (currentFilter) {
                        case 'rating':
                            return item.rating >= 4.5;
                        case 'price-low':
                            return item.price === '$';
                        case 'price-medium':
                            return item.price === '$$';
                        case 'price-high':
                            return item.price === '$$$';
                        default:
                            return true;
                    }
                });
            }

            renderFunction(filtered);
            this.updateResultsSummary(filtered.length, currentItems.length);
        };

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                filterItems();
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                filterItems();
            });
        }

        // Clear buttons
        const clearSearch = document.querySelector('.clear-search');
        const clearFilters = document.querySelector('.clear-filters');

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                currentSearch = '';
                searchInput.value = '';
                filterItems();
            });
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                currentFilter = 'all';
                filterSelect.value = 'all';
                filterItems();
            });
        }

        return { filterItems };
    }

    updateResultsSummary(filteredCount, totalCount) {
        const summary = document.querySelector('.results-summary');
        if (summary) {
            const countEl = summary.querySelector('.results-count');
            if (countEl) {
                countEl.textContent = `Showing ${filteredCount} of ${totalCount} destinations`;
            }
        }
    }

    // Smooth scrolling
    scrollToElement(element, offset = 80) {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }

    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy to clipboard', 'error');
        });
    }

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Format rating
    formatRating(rating) {
        return rating.toFixed(1);
    }

    // Generate star rating HTML
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = '';
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<span>★</span>';
        }
        if (hasHalfStar) {
            starsHTML += '<span>☆</span>';
        }
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<span>☆</span>';
        }

        return starsHTML;
    }
}

// Initialize UI utilities
const ui = new UIUtils();
window.ui = ui; 