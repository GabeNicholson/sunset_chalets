// Mobile menu functionality - Simple working version
document.addEventListener('DOMContentLoaded', function() {
    // Wait for navbar to be loaded (since it's loaded via JS)
    setTimeout(function() {
      // Create and add hamburger menu toggle button
      const navContainer = document.querySelector('.nav-container');
      const navbar = document.querySelector('nav');
      
      if (navContainer && !document.querySelector('.mobile-menu-toggle')) {
        // Create mobile toggle button
        const menuToggle = document.createElement('div');
        menuToggle.className = 'mobile-menu-toggle';
        menuToggle.innerHTML = '☰';
        menuToggle.style.display = 'none'; // Hide by default, show in CSS
        
        // Insert toggle button after logo
        const navLogo = document.querySelector('.nav-logo');
        if (navLogo && navLogo.parentNode) {
          navLogo.parentNode.insertBefore(menuToggle, navLogo.nextSibling);
        }
        
        // Add toggle functionality
        menuToggle.addEventListener('click', function() {
          navbar.classList.toggle('menu-expanded');
          menuToggle.innerHTML = navbar.classList.contains('menu-expanded') ? '✕' : '☰';
        });
        
        // Close menu when a link is clicked
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
          link.addEventListener('click', function() {
            navbar.classList.remove('menu-expanded');
            menuToggle.innerHTML = '☰';
          });
        });
      }
    }, 500); // Wait for navbar-loader.js to complete
  });