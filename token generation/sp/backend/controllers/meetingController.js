const nodemailer = require('nodemailer');
require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    },
});


const sendMail = async (transporter, mailOptions) => {
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email has been sent.');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};


const sendMeetingEmail = async (req, res) => {
    const { date, time, meetLink, hostName, hostEmail, email } = req.body;

    if (!date || !time || !meetLink || !email || !hostName || !hostEmail) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const mailOptions = {
            from: {
                name: 'Rentology',
                address: process.env.EMAIL,
            },
            to: email,
            subject: 'Scheduled Meeting Notification',
            text: `You have a meeting scheduled on ${date} at ${time}. Here is the link: ${meetLink}. You are invited by ${hostName} (${hostEmail}).`,
        };

        
        await sendMail(transporter, mailOptions);

        res.status(200).json({ message: 'Email sent successfully.' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send email.' });
    }
};

module.exports = { sendMeetingEmail,sendMail,transporter };
