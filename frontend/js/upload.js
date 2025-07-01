// Upload Page JavaScript
class UploadPage {
    constructor() {
        this.api = new APIService();
        this.currentFile = null;
        this.uploadedPhotoUrl = null;
        this.init();
    }

    init() {
        this.setupFileUpload();
        this.setupFormSubmission();
        this.setupProgressIndicator();
        this.setupTextToImage();
        this.loadSavedData();
        this.checkBackendStatus();
    }

    async checkBackendStatus() {
        const backendAvailable = await this.api.checkBackendHealth();
        if (!backendAvailable) {
            uiComponents.showToast('Backend server is not available. Using demo mode.', 'warning');
        }
    }

    setupFileUpload() {
        const dropZone = document.querySelector('.photo-upload');
        const fileInput = document.querySelector('#file-input');
        const previewContainer = document.querySelector('.upload-preview');

        if (dropZone && fileInput && previewContainer) {
            this.setupFileUploadHandlers(dropZone, fileInput, previewContainer);
        }
    }

    setupFileUploadHandlers(dropZone, fileInput, previewContainer) {
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
            uiComponents.showToast(validation.error, 'error');
            return;
        }

        // Update file input
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;

        // Show preview
        this.showImagePreview(file, previewContainer);
        
        uiComponents.showToast('Image selected successfully!', 'success');
    }

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

    showImagePreview(file, container) {
        const reader = new FileReader();
        reader.onload = (e) => {
            container.innerHTML = `
                <div class="preview-container">
                    <img src="${e.target.result}" alt="Preview" class="preview-image">
                    <button class="preview-remove" onclick="uploadPage.removeImagePreview(this)">×</button>
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
        if (container) {
            container.innerHTML = '';
        }
        
        // Clear file input
        const fileInput = document.querySelector('#file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }

    setupFormSubmission() {
        const form = document.querySelector('.upload-form');
        const submitBtn = document.querySelector('.upload-btn');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpload();
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleUpload();
            });
        }
    }

    setupProgressIndicator() {
        // Update progress based on current step
        this.updateProgress(1);
    }

    updateProgress(step) {
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach((stepEl, index) => {
            if (index < step) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.remove('active');
            }
        });
    }

    async handleUpload() {
        const fileInput = document.querySelector('#file-input');
        const submitBtn = document.querySelector('.upload-btn');
        const uploadSection = document.querySelector('.upload-section');

        if (!fileInput.files.length) {
            uiComponents.showToast('Please select an image first', 'error');
            return;
        }

        const file = fileInput.files[0];
        const validation = this.validateFile(file);
        
        if (!validation.valid) {
            uiComponents.showToast(validation.error, 'error');
            return;
        }

        this.currentFile = file;
        
        // Show loading state with progress
        const loading = this.showUploadProgress(uploadSection);
        submitBtn.disabled = true;
        this.updateProgress(2);

        try {
            // Check if backend is available
            const backendAvailable = await this.api.checkBackendHealth();
            
            if (backendAvailable) {
                // Use real API with progress tracking
                const result = await this.api.uploadPhoto(file, (progress) => {
                    this.updateUploadProgress(loading, progress);
                });

                console.log('Upload result:', result); // Debug log

                if (result.success) {
                    this.uploadedPhotoUrl = result.photo_url;
                    console.log('Photo URL set to:', this.uploadedPhotoUrl); // Debug log
                    uiComponents.showToast('Photo uploaded successfully!', 'success');
                } else {
                    throw new Error('Upload failed');
                }
            } else {
                // Use mock data for demo
                this.uploadedPhotoUrl = this.getMockPhotoUrl(file);
                console.log('Mock photo URL set to:', this.uploadedPhotoUrl); // Debug log
                await this.simulateProcessing();
                uiComponents.showToast('Demo mode: Photo processed successfully!', 'success');
            }

            // Save to local storage
            this.saveUploadResult();
            
            // Show success state
            this.showSuccessState();
            this.updateProgress(3);
            
        } catch (error) {
            console.error('Upload failed:', error);
            uiComponents.showToast(`Upload failed: ${error.message}`, 'error');
            this.updateProgress(1);
        } finally {
            this.hideLoading(uploadSection);
            submitBtn.disabled = false;
        }
    }

    showUploadProgress(container) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'upload-loading';
        progressContainer.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Uploading your photo...</div>
            <div class="loading-subtext">Please wait while we process your image</div>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">0%</div>
            </div>
        `;
        
        container.style.position = 'relative';
        container.appendChild(progressContainer);
        return progressContainer;
    }

    updateUploadProgress(progressContainer, percent) {
        const progressFill = progressContainer.querySelector('.progress-fill');
        const progressText = progressContainer.querySelector('.progress-text');
        
        if (progressFill && progressText) {
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${Math.round(percent)}%`;
        }
    }

    hideLoading(element) {
        const loading = element.querySelector('.upload-loading');
        if (loading) {
            loading.remove();
        }
    }

    getMockPhotoUrl(file) {
        // Create a mock URL for demo purposes
        return URL.createObjectURL(file);
    }

    async simulateProcessing() {
        // Simulate processing time
        return new Promise(resolve => {
            setTimeout(resolve, 2000 + Math.random() * 2000);
        });
    }

    showSuccessState() {
        const uploadSection = document.querySelector('.upload-section');
        const successState = document.querySelector('.success-state');
        
        if (uploadSection && successState) {
            uploadSection.style.display = 'none';
            successState.style.display = 'block';
            
            // Update success content
            this.updateSuccessContent();
        }
    }

    updateSuccessContent() {
        const successTitle = document.querySelector('.success-title');
        const successDescription = document.querySelector('.success-description');
        const viewDestinationsBtn = document.querySelector('.success-buttons .btn-primary');

        if (successTitle) {
            successTitle.textContent = `Photo Uploaded Successfully!`;
        }

        if (successDescription) {
            successDescription.textContent = `Your photo has been uploaded and is ready for destination matching. Let's find you the perfect travel destinations!`;
        }

        if (viewDestinationsBtn) {
            viewDestinationsBtn.textContent = 'Browse Destinations';
            viewDestinationsBtn.onclick = () => this.navigateToDestinations();
        }
    }

    navigateToDestinations() {
        // Store uploaded photo URL in session storage for destinations page
        console.log('Navigating to destinations with photo URL:', this.uploadedPhotoUrl); // Debug log
        if (this.uploadedPhotoUrl) {
            sessionStorage.setItem('uploadedPhotoUrl', this.uploadedPhotoUrl);
            console.log('Photo URL saved to session storage'); // Debug log
        } else {
            console.log('No photo URL to save'); // Debug log
        }
        window.location.href = 'destinations.html';
    }

    saveUploadResult() {
        if (this.uploadedPhotoUrl) {
            const uploadData = {
                photoUrl: this.uploadedPhotoUrl,
                timestamp: new Date().toISOString(),
                fileName: this.currentFile ? this.currentFile.name : 'unknown'
            };
            
            localStorage.setItem('lastUpload', JSON.stringify(uploadData));
        }
    }

    loadSavedData() {
        const savedUpload = localStorage.getItem('lastUpload');
        if (savedUpload) {
            try {
                const uploadData = JSON.parse(savedUpload);
                const timeDiff = Date.now() - new Date(uploadData.timestamp).getTime();
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                
                // Show recent upload if less than 24 hours old
                if (hoursDiff < 24) {
                    this.showRecentUpload(uploadData);
                }
            } catch (error) {
                console.error('Error loading saved upload:', error);
            }
        }
    }

    showRecentUpload(uploadData) {
        const recentUpload = document.createElement('div');
        recentUpload.className = 'upload-info';
        recentUpload.innerHTML = `
            <div class="info-icon">📋</div>
            <div class="info-title">Recent Upload Available</div>
            <div class="info-content">
                <p>We found a recent upload from ${this.formatDate(uploadData.timestamp)}</p>
                <p>File: ${uploadData.fileName}</p>
                <button class="btn btn-secondary" onclick="uploadPage.loadRecentUpload()">Use Recent Upload</button>
            </div>
        `;

        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.appendChild(recentUpload);
        }
    }

    setupTextToImage() {
        const generateBtn = document.getElementById('generate-image-btn');
        const textPrompt = document.getElementById('text-prompt');
        const imageStyle = document.getElementById('image-style');
        const generatedGrid = document.getElementById('generated-images-grid');
        const generationLoading = document.getElementById('generation-loading');

        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                await this.generateImageFromText(textPrompt, imageStyle, generatedGrid, generationLoading);
            });
        }

        // Allow Enter key to generate
        if (textPrompt) {
            textPrompt.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    await this.generateImageFromText(textPrompt, imageStyle, generatedGrid, generationLoading);
                }
            });
        }
    }

    async generateImageFromText(textPrompt, imageStyle, generatedGrid, generationLoading) {
        const prompt = textPrompt.value.trim();
        const style = imageStyle.value;

        if (!prompt) {
            uiComponents.showToast('Please enter a description for your image', 'error');
            return;
        }

        if (prompt.length < 10) {
            uiComponents.showToast('Please provide a more detailed description (at least 10 characters)', 'error');
            return;
        }

        // Show loading state
        generationLoading.style.display = 'flex';
        generatedGrid.style.display = 'none';

        try {
            const response = await this.api.generateTextToImage(prompt, style);
            
            if (response.success) {
                this.addGeneratedImage(generatedGrid, prompt, response.image_url, response.provider);
                uiComponents.showToast('Image generated successfully!', 'success');
            } else {
                throw new Error(response.message || 'Failed to generate image');
            }
        } catch (error) {
            console.error('Text-to-image generation failed:', error);
            uiComponents.showToast(`Failed to generate image: ${error.message}`, 'error');
        } finally {
            // Hide loading state
            generationLoading.style.display = 'none';
            generatedGrid.style.display = 'flex';
        }
    }

    addGeneratedImage(container, prompt, imageUrl, provider) {
        // Remove placeholder if it exists
        const placeholder = container.querySelector('.placeholder-message');
        if (placeholder) {
            placeholder.remove();
        }

        const imageItem = document.createElement('div');
        imageItem.className = 'generated-image-item';
        
        const providerBadge = provider === 'openai' ? 'OpenAI DALL-E' : 
                             provider === 'deepai' ? 'DeepAI' : 'Placeholder';

        imageItem.innerHTML = `
            <img src="${imageUrl}" alt="Generated image" class="generated-image" onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'">
            <div class="generated-image-info">
                <p class="generated-prompt">${prompt}</p>
                <div class="generated-actions">
                    <button class="generated-action-btn" onclick="uploadPage.downloadImage('${imageUrl}', '${prompt}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="generated-action-btn secondary" onclick="uploadPage.shareImage('${imageUrl}', '${prompt}')">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
            <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 0.5rem;">
                Generated with ${providerBadge}
            </div>
        `;

        container.appendChild(imageItem);
    }

    downloadImage(imageUrl, prompt) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `generated-image-${Date.now()}.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        uiComponents.showToast('Image download started!', 'success');
    }

    shareImage(imageUrl, prompt) {
        if (navigator.share) {
            navigator.share({
                title: 'AI Generated Image',
                text: `Check out this AI-generated image: ${prompt}`,
                url: imageUrl
            }).catch(() => {
                this.copyToClipboard(imageUrl);
            });
        } else {
            this.copyToClipboard(imageUrl);
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            uiComponents.showToast('Image URL copied to clipboard!', 'success');
        }).catch(() => {
            uiComponents.showToast('Failed to copy to clipboard', 'error');
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    loadRecentUpload() {
        const savedUpload = localStorage.getItem('lastUpload');
        if (savedUpload) {
            const uploadData = JSON.parse(savedUpload);
            this.uploadedPhotoUrl = uploadData.photoUrl;
            this.showSuccessState();
            this.updateProgress(3);
            uiComponents.showToast('Recent upload loaded successfully!', 'success');
        }
    }

    // Reset upload form
    resetUpload() {
        const fileInput = document.querySelector('#file-input');
        const previewContainer = document.querySelector('.upload-preview');
        const uploadSection = document.querySelector('.upload-section');
        const successState = document.querySelector('.success-state');

        if (fileInput) fileInput.value = '';
        if (previewContainer) previewContainer.innerHTML = '';
        if (uploadSection) uploadSection.style.display = 'block';
        if (successState) successState.style.display = 'none';

        this.currentFile = null;
        this.uploadedPhotoUrl = null;
        this.updateProgress(1);
    }
}

// Initialize upload page
const uploadPage = new UploadPage();
window.uploadPage = uploadPage; 