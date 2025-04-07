const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// serves the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/property', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'property.html'));
});

app.get('/things_to_do', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'things_to_do.html'));
});

app.get('/dining', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dining.html'));
});

app.get('/contact_us', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact_us.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
