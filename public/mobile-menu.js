// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for navbar to be loaded (since it's loaded via JS)
    setTimeout(function() {
      // Check if we're on a mobile device or iOS
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      console.log(`isMobile Device: ${isMobile}`)
      
      if (isMobile) {
        const navContainer = document.querySelector('.nav-container');
        const navbar = document.querySelector('nav');
        
        if (navContainer) {
          // Create and add hamburger menu toggle button
          const menuToggle = document.createElement('div');
          menuToggle.className = 'mobile-menu-toggle';
          menuToggle.innerHTML = '☰';
          
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
      }
    }, 500); // Wait for navbar-loader.js to complete
  });
  
  // Fix for iOS vh units (100vh issue on iOS)
  function fixVhUnits() {
    // First we get the viewport height and multiply it by 1% to get a value for a vh unit
    let vh = window.innerHeight * 0.01;
    // Then we set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  // Run the function on first load
  fixVhUnits();
  
  // Re-run the function on resize and orientation change
  window.addEventListener('resize', fixVhUnits);
  window.addEventListener('orientationchange', fixVhUnits);