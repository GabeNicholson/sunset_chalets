// Make CTA button work like the main book now button
document.getElementById('cta_book_btn').addEventListener('click', function() {
    document.getElementById('book_now_btn').click();
});

// Lightbox functionality
document.addEventListener('DOMContentLoaded', function() {
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxClose = document.getElementById('lightboxClose');

    // Select all photo items AND the featured photo
    const photoItems = document.querySelectorAll('.photo-item, .featured-photo');
    
    // Open lightbox when clicking on a photo
    photoItems.forEach(item => {
        item.addEventListener('click', function() {
            const img = this.querySelector('img');
            const titleElement = this.querySelector('.photo-title');
            const title = titleElement ? titleElement.textContent : img.alt;
            
            lightboxImage.src = img.src;
            lightboxImage.alt = img.alt;
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
});