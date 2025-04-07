// Save this as 'navbar-loader.js' in your public folder
document.addEventListener('DOMContentLoaded', function() {
    // Fetch the navbar template
    fetch('/navbar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            // Insert the navbar at the beginning of the body
            const navbarPlaceholder = document.getElementById('navbar-placeholder');
            if (navbarPlaceholder) {
                navbarPlaceholder.innerHTML = html;
            } else {
                // If no placeholder exists, insert at the beginning of body
                document.body.insertAdjacentHTML('afterbegin', html);
            }
            
            // Add active class to current page link
            highlightCurrentPage();
            
            // Ensure the Book Now button still works after being loaded
            const bookNowBtn = document.getElementById('book_now_btn');
            if (bookNowBtn) {
                bookNowBtn.addEventListener('click', function() {
                    console.log("Book Now button clicked");
                    // Add your booking functionality here
                });
            }
        })
        .catch(error => {
            console.error('Error loading navbar:', error);
        });
    
    // Fixed function to highlight the current page in the navbar
    function highlightCurrentPage() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-links a');
        
        navLinks.forEach(link => {
            const linkPath = link.getAttribute('href');
            
            // Special case for home page
            if (currentPath === '/' && (linkPath === '/' || linkPath === '/home')) {
                link.classList.add('active');
                return;
            }
            
            // Exact match for other pages
            if (currentPath === linkPath) {
                link.classList.add('active');
                return;
            }
            
            // For pages with trailing slashes
            if (currentPath === `${linkPath}/` || `${currentPath}/` === linkPath) {
                link.classList.add('active');
                return;
            }
        });
    }
});