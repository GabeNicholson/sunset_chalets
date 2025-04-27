function initLightbox(imageSelector) {
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxClose = document.getElementById('lightboxClose');

    // Open lightbox when clicking on a photo
    imageSelector.forEach(item => {
        item.addEventListener('click', function() {
            const img = this.querySelector('img');
            const titleElement = this.querySelector('.photo-title');
            const title = titleElement ? titleElement.textContent : img.alt;
            
            lightboxImage.src = img.src;
            lightboxImage.alt = img.alt;
            lightboxImage.style.maxWidth = '100vw';   // 90% of viewport width
            lightboxImage.style.maxHeight = '90vh';  // 80% of viewport height
            lightboxTitle.textContent = title;
            lightbox.classList.add('active');
            
            // Prevent scrolling on the body when lightbox is open
            document.body.style.overflow = 'hidden';
        });
    });
    
    // Close lightbox when clicking the close button
    lightboxClose.addEventListener('click', function() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
    
    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Close lightbox when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname
    const pageConfig = {
        '/': '.feature-card',
        '/property': '.photo-item, .featured-photo'
    }
    const selector = pageConfig[currentPath]
    const photoItems = document.querySelectorAll(selector)
    if (photoItems) {
        initLightbox(photoItems)
    }
});
