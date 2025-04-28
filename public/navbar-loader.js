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
            const navbarPlaceholder = document.querySelector('#navbar-placeholder');
            if (navbarPlaceholder) {
                navbarPlaceholder.innerHTML = html;
            } else {
                // If no placeholder exists, insert at the beginning of body
                document.body.insertAdjacentHTML('afterbegin', html);
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
    }
});

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
}

function redirect_to_checkout() {
    const sessionId = getCookie('session_id');
    twq('event', 'tw-pjfnw-pkx6z', {
        conversion_id: sessionId 
    });
    return window.open("https://osc.lodgify.com/", "_blank");
}