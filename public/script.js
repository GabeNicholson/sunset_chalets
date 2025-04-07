
const heroBookButton = document.querySelector("#hero_book_btn")
const ctaBookButton = document.querySelector("#cta_book_btn")
const contactFormSubmitButton = document.querySelector(".submit-button")

if (heroBookButton) {
    // Make hero button work like the main book now button
    heroBookButton.addEventListener('click', function(event) {
        event.preventDefault();
        const navBookNowButton = document.querySelector("#book_now_btn")
        navBookNowButton.click();
    });
}

if (ctaBookButton) {
    // Make CTA button work like the main book now button
    ctaBookButton.addEventListener('click', function() {
        const navBookNowButton = document.querySelector("#book_now_btn")
        navBookNowButton.click();
    });
}

if (contactFormSubmitButton){
    contactFormSubmitButton.addEventListener("click", (event) => {
        event.preventDefault();
        alert('Thank you for your message! We will get back to you soon.');
    })
}