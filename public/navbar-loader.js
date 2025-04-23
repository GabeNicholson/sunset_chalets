// Improved navbar-loader.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, fetching navbar...');
    
    // Fetch the navbar template
    fetch('/navbar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            console.log('Navbar fetch successful');
            return response.text();
        })
        .then(html => {
            console.log('Processing navbar HTML');
            // Insert the navbar at the beginning of the body
            const navbarPlaceholder = document.querySelector('#navbar-placeholder');
            if (navbarPlaceholder) {
                navbarPlaceholder.innerHTML = html;
                console.log('Navbar inserted into placeholder');
            } else {
                // If no placeholder exists, insert at the beginning of body
                document.body.insertAdjacentHTML('afterbegin', html);
                console.log('Navbar inserted at beginning of body');
            }
            
            // Add active class to current page link
            highlightCurrentPage();

            // Add event listener to book now button
            const navBookNowButton = document.querySelector("#book_now_btn")
            if (navBookNowButton){
                navBookNowButton.addEventListener("click", () => {
                    if (window.OceanSunsetAnalytics) {
                        window.OceanSunsetAnalytics.trackBookNow();
                    }
                    redirect_to_checkout()
                });
            }

            // Dispatch an event indicating the navbar has been loaded
            const navbarLoadedEvent = new CustomEvent('navbarLoaded');
            document.dispatchEvent(navbarLoadedEvent);
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
        console.log('Current page highlighted in navbar');
    }
});

function redirect_to_checkout() {
    twq('event', 'tw-pjfnw-pkx6z', {
        conversion_id: null // use this to pass a unique ID for the conversion event for deduplication (e.g. order id '1a2b3c')
    });
    return window.open("https://oceansunsetchalets.client.innroad.com/", "_blank");
}