const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const mongoose = require('mongoose');
const MongoDBStore = require('connect-mongodb-session')(session);

const app = express();
const port = 3000;

// Set the views directory
app.use(express.static(path.join(__dirname, 'views')));

// MongoDB connection string
const mongoUri =  'mongodb+srv://ezra6987:Ubd00-317782@hrms-login-enquiry.5vztfrw.mongodb.net/HR-MANAGEMENT-SYSTEM?retryWrites=true&w=majority';

// Improved connection handling
mongoose.connect(mongoUri, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000 // 30 seconds
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => {
  console.error('Error connecting to MongoDB', err);
});

const db = mongoose.connection;
db.on('error', (error) => console.error('MongoDB connection error:', error));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Mongoose User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const store = new MongoDBStore({
  uri: mongoUri,
  collection: 'leave-management'
});

store.on('error', function(error) {
  console.error('Session store error:', error);
});

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/registration', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
  } else {
    res.redirect('/login');
  }
});

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true }
});

const Enquiry = mongoose.model('Enquiry', enquirySchema);

app.post('/enquiry', async (req, res) => {
  const { name, email, message } = req.body;
  console.log(`Enquiry Received: Name - ${name}, Email - ${email}, Message - ${message}`);
  try {
    const enquiry = new Enquiry({ name, email, message });
    await enquiry.save();
    console.log('Enquiry saved to MongoDB:', enquiry);
    setTimeout(() => {
      res.redirect('/dashboard');
    }, 1000);
  } catch (error) {
    console.error('Error saving enquiry to MongoDB:', error);
    res.status(500).send('Error saving enquiry.');
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    console.log('User registered:', username);
    req.session.user = { username };
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Registration failed.');
  }
});

app.post('/authenticate', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).send('Authentication failed.');
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      req.session.user = { username };
      res.redirect('/dashboard');
    } else {
      console.log('Password mismatch for user:', username);
      res.status(401).send('Authentication failed.');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).send('Login failed.');
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Server listening
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
