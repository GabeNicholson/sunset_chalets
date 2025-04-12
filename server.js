require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const nodemailer = require('nodemailer');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BUSINESS_EMAIL = 'oceansunsetchalets@gmail.com'

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: BUSINESS_EMAIL,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

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

// Contact form submission endpoint
app.post('/api/contact', (req, res) => {
    const { name, email, phone, contactMethod, requestType, details } = req.body;
    
    // Email content
    const mailOptions = {
        from: BUSINESS_EMAIL,
        to: BUSINESS_EMAIL, 
        subject: `New Contact Form Submission from ${name}`,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Preferred Contact Method:</strong> ${contactMethod}</p>
            <p><strong>Request Type:</strong> ${requestType || 'Not specified'}</p>
            <p><strong>Message:</strong> ${details}</p>
        `
    };
    
    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ success: false, message: 'Failed to send email' });
        }
        
        console.log('Email sent:', info.response);
        res.status(200).json({ success: true, message: 'Email sent successfully' });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
