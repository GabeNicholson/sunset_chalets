document.addEventListener("DOMContentLoaded", () => {
    fetch("/footer.html")
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            const footerPlaceHolder = document.querySelector("#footer-placeholder")
            if (footerPlaceHolder) {
                footerPlaceHolder.innerHTML = html
            } else {
                // If no placeholder exists, insert at the beginning of body
                document.body.insertAdjacentHTML('afterbegin', html);
            }
        })
        .catch(error => console.log(`error loading footer: ${error}`))
})