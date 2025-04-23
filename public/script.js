
const heroBookButton = document.querySelector("#hero_book_btn")
const ctaBookButton = document.querySelector("#cta_book_btn")
const contactFormSubmitButton = document.querySelector(".submit-button")
const contactForm = document.querySelector("#contactForm")

if (heroBookButton) {
    // Make hero button work like the main book now button
    heroBookButton.addEventListener('click', function(event) {
        event.preventDefault();
        const navBookNowButton = document.querySelector("#book_now_btn")
        navBookNowButton.click();

        // Add this line for analytics tracking
        if (window.OceanSunsetAnalytics) {
            window.OceanSunsetAnalytics.trackBookNow('hero_book_btn');
        }
    });
}

if (ctaBookButton) {
    // Make CTA button work like the main book now button
    ctaBookButton.addEventListener('click', function() {
        const navBookNowButton = document.querySelector("#book_now_btn")
        navBookNowButton.click();

        if (window.OceanSunsetAnalytics) {
            window.OceanSunsetAnalytics.trackBookNow('cta_book_btn');
        }
    });
}

async function sendContactRequest(formDataObj) {
    // Send data to server
    const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataObj)
    });
    return await response.json()
}

if (contactForm && contactFormSubmitButton) {
    contactFormSubmitButton.addEventListener("click", (event) => {
        event.preventDefault();

        // Show loading state
        contactFormSubmitButton.innerHTML = '<span>Sending...</span>';
        contactFormSubmitButton.disabled = true;
        
        // Get form data
        const formData = new FormData(contactForm);
        const formDataObj = Object.fromEntries(formData);

        // Get email value
        const email = formData.get('email');
    
        // Check if email is empty
        if (!email || email.trim() === '' || !email.includes("@")) {
            showErrorMessage("Email address is required.");
            return false;
        }

        // Use .then() and place finally at the end of the chain
        sendContactRequest(formDataObj)
            .then((response) => {
                if (response.success) {

                    // Track successful submission
                    if (window.OceanSunsetAnalytics) {
                        window.OceanSunsetAnalytics.trackContactSubmission(formDataObj);
                    }

                    // Hide the form and show success message
                    contactForm.style.display = 'none';
                    successMessage.style.display = 'block';
                    
                    // Scroll to success message if needed
                    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Error message for failed submission
                    showErrorMessage("There was a problem sending your message. Please try again later.");
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                showErrorMessage("Connection error. Please check your internet connection and try again.");
            })
            .finally(() => {
                // Reset button state
                contactFormSubmitButton.innerHTML = '<span>Send Message</span><i class="fas fa-paper-plane"></i>';
                contactFormSubmitButton.disabled = false;
            });
    });
}

// Handle showing error message
function showErrorMessage(message) {
    // Create error message element if it doesn't exist
    let errorMsg = document.querySelector('#formErrorMessage');
    
    if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.id = 'formErrorMessage';
        errorMsg.className = 'form-error-message';
        contactForm.prepend(errorMsg);
    }
    
    // Set message and show with animation
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    
    // Scroll to error
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Reset form button
const newMessageBtn = document.getElementById('newMessageBtn');
if (newMessageBtn) {
    newMessageBtn.addEventListener('click', () => {
        // Hide success message and show form again
        successMessage.style.display = 'none';
        contactForm.style.display = 'flex';
        contactForm.reset();
        
        // Remove any error messages
        const errorMsg = document.querySelector('#formErrorMessage');
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
    });
}