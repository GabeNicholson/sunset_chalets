// Simplified Mobile Menu
document.addEventListener('DOMContentLoaded', function() {
    // After DOM loads, prepare the mobile menu structure
    prepareMenu();
    
    // Also listen for the navbar loaded event
    document.addEventListener('navbarLoaded', prepareMenu);
    
    function prepareMenu() {
      // Check if we've already added the mobile toggle
      if (document.querySelector('.mobile-menu-toggle')) {
        return;
      }
      
      // Get the nav container
      const navContainer = document.querySelector('.nav-container');
      if (!navContainer) {
        return; // Exit if no navbar is found
      }
      
      // Create mobile toggle button
      const menuToggle = document.createElement('button');
      menuToggle.className = 'mobile-menu-toggle';
      menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
      menuToggle.innerHTML = '☰';
      
      // Add it directly to the nav container (will be positioned by CSS)
      navContainer.appendChild(menuToggle);
      
      // Toggle menu visibility when clicked
      menuToggle.addEventListener('click', function() {
        const navbar = document.querySelector('nav');
        navbar.classList.toggle('menu-expanded');
      });
      
      // Close menu when nav links are clicked
      const navLinks = document.querySelectorAll('.nav-links a, #book_now_btn');
      navLinks.forEach(link => {
        link.addEventListener('click', function() {
          const navbar = document.querySelector('nav');
          navbar.classList.remove('menu-expanded');
          menuToggle.innerHTML = '☰';
        });
      });
    }
  });