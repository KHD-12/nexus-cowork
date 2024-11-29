// Backend: server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://localhost/coworking-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String
});

const User = mongoose.model('User', userSchema);

// Booking Model
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  spaceType: String,
  subType: String,
  startDate: Date,
  endDate: Date,
  totalAmount: Number
});

const Booking = mongoose.model('Booking', bookingSchema);

// Authentication Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    const token = jwt.sign({ userId: user._id }, 'your-secret-key');
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error('Invalid password');
    
    const token = jwt.sign({ userId: user._id }, 'your-secret-key');
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Booking Routes
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId });
    res.json(bookings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));

// Frontend: src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import SpaceSelection from './components/SpaceSelection';
import Booking from './components/Booking';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Switch>
          <Route exact path="/">
            {token ? <Redirect to="/spaces" /> : <Redirect to="/login" />}
          </Route>
          <Route path="/login">
            <Login setToken={setToken} />
          </Route>
          <Route path="/signup">
            <Signup setToken={setToken} />
          </Route>
          <Route path="/spaces">
            {token ? <SpaceSelection /> : <Redirect to="/login" />}
          </Route>
          <Route path="/booking/:type">
            {token ? <Booking /> : <Redirect to="/login" />}
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

// src/components/Login.js
function Login({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Login
        </button>
      </form>
    </div>
  );
}

// src/components/SpaceSelection.js
function SpaceSelection() {
  const spaces = [
    {
      type: 'private-cabin',
      name: 'Private Cabins',
      options: [
        { name: 'Type 1', price: 35000 },
        { name: 'Type 2', price: 25000 },
        { name: 'Type 3', price: 20000 }
      ]
    },
    {
      type: 'open-desk',
      name: 'Open Desk Area',
      options: [
        { name: 'Monthly', price: 5000 },
        { name: 'Day Pass', price: 350 }
      ]
    },
    {
      type: 'conference',
      name: 'Conference Room',
      options: [
        { name: 'Hourly', price: 2000 }
      ]
    },
    {
      type: 'private-chamber',
      name: 'Private Chamber',
      options: [
        { name: 'Day Pass', price: 2000 }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Select a Space</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {spaces.map((space) => (
          <div key={space.type} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">{space.name}</h3>
            <div className="space-y-4">
              {space.options.map((option) => (
                <div key={option.name} className="flex justify-between items-center">
                  <span>{option.name}</span>
                  <span>₹{option.price}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate(`/booking/${space.type}`)}
              className="mt-4 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Book Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
