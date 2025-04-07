const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// A basic route that serves your homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Not sure if this is correct but need to do for server side rendering I think?
app.get('/things_to_do', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'things_to_do.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
