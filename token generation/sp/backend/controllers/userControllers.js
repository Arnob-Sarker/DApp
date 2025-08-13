const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const nodemailer = require('nodemailer');
require("dotenv").config()

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    // Ignore walletAddress for SP registration
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    const user = await User.create({
        name,
        email,
        password
        // Do not include walletAddress
    });
    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            description: user.description,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});


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

const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.description = req.body.description || user.description;
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        const mailOptions = {
            from: {
                name: 'Rentology',
                address: process.env.EMAIL,
            },
            to: updatedUser.email,
            subject: 'Profile Updated',
            text: 'Your profile has been updated successfully.',
        };

        await sendMail(transporter, mailOptions);

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            description: updatedUser.description,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});


module.exports = { registerUser, authUser, getUserProfile, updateUserProfile, transporter, sendMail };
