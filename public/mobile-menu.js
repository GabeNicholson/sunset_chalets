// Mobile menu functionality - Improved iOS compatible version
document.addEventListener('DOMContentLoaded', function() {
    // Create a function to initialize the mobile menu
    function initializeMobileMenu() {
      const navContainer = document.querySelector('.nav-container');
      const navbar = document.querySelector('nav');
      const navLinks = document.querySelector('.nav-links');
      
      // Only proceed if navigation container exists and toggle doesn't exist yet
      if (navContainer && !document.querySelector('.mobile-menu-toggle')) {
        console.log('Initializing mobile menu...');
        
        // Create mobile toggle button
        const menuToggle = document.createElement('button'); // Using button for better accessibility
        menuToggle.className = 'mobile-menu-toggle';
        menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
        menuToggle.innerHTML = '☰';
        
        // Insert toggle button at the appropriate location
        const navLogo = document.querySelector('.nav-logo');
        if (navLogo && navLogo.parentNode) {
          navLogo.parentNode.insertBefore(menuToggle, navLogo.nextSibling);
        }
        
        // Add toggle functionality
        menuToggle.addEventListener('click', function() {
          navbar.classList.toggle('menu-expanded');
          
          // Update the toggle button icon
          if (navbar.classList.contains('menu-expanded')) {
            menuToggle.innerHTML = '✕';
            navLinks.style.display = 'flex'; // Force display on iOS
          } else {
            menuToggle.innerHTML = '☰';
            // Don't hide immediately to allow for transition
            setTimeout(() => {
              if (!navbar.classList.contains('menu-expanded')) {
                navLinks.style.display = ''; // Reset to CSS value
              }
            }, 300);
          }
        });
        
        // Close menu when a link is clicked
        const navLinksAnchors = document.querySelectorAll('.nav-links a');
        navLinksAnchors.forEach(link => {
          link.addEventListener('click', function() {
            navbar.classList.remove('menu-expanded');
            menuToggle.innerHTML = '☰';
            
            // Allow time for the transition
            setTimeout(() => {
              if (!navbar.classList.contains('menu-expanded')) {
                navLinks.style.display = ''; // Reset to CSS value
              }
            }, 300);
          });
        });
        
        // Add Book Now button click handler
        const bookNowBtn = document.querySelector('#book_now_btn');
        if (bookNowBtn) {
          bookNowBtn.addEventListener('click', function() {
            navbar.classList.remove('menu-expanded');
            menuToggle.innerHTML = '☰';
            
            // Allow time for the transition
            setTimeout(() => {
              if (!navbar.classList.contains('menu-expanded')) {
                navLinks.style.display = ''; // Reset to CSS value
              }
            }, 300);
          });
        }
        
        console.log('Mobile menu initialized');
      } else {
        console.log('Waiting for navbar to load...');
      }
    }
  
    // First attempt immediately
    initializeMobileMenu();
    
    // If not successful, try again after navbar loader likely completed
    setTimeout(initializeMobileMenu, 500);
    
    // Final attempt with longer timeout
    setTimeout(initializeMobileMenu, 1500);
  });