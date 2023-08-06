const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const app = express();
const port = 8000;

mongoose.connect('mongodb://127.0.0.1:27017/sugam', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// Add the express-session middleware
app.use(session({
  secret: 'your_secret_here',
  resave: false,
  saveUninitialized: true,
}));

// Define the schema for student enrollment
const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  program: {
    type: String,
    required: true,
  },
  subjects: {
    type: [String],
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  enrollmentStatus: {
    type: String,
    default: 'Enrolled',
  },
});
var messageSchema=new mongoose.Schema({
  Name:{
    type: String,
    required: true,
  },
  Email:{
    type: String,
    required: true,
  },
  Message:{
    type: String,
    required: true,
  },
});

var registerSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  phoneno: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  password1: {
    type: String,
    required: true,
  },

});

var loginSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  loginpassword: {
    type: String,
    required: true,
  }
}, { timestamps: true });

const Register = mongoose.model('Register', registerSchema);
const Login = mongoose.model('Login', loginSchema);
const MessageContainer =mongoose.model('MessageContainer',messageSchema);
const Student = mongoose.model('Student', studentSchema);
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.get('/elearn', (req, res) => {
  res.status(200).render('elearn.pug',  { currentPage: 'home' });
});

app.get('/about', (req, res) => {
  res.status(200).render('about.pug',  { currentPage: 'about' });
});

app.get('/students', (req, res) => {

  res.status(200).render('students.pug',  { currentPage: 'students' });
});

app.get('/teachers', (req, res) => {

  res.status(200).render('teachers.pug',  { currentPage: 'teachers' });
});


app.get('/help', (req, res) => {
  res.status(200).render('help.pug',  { currentPage: 'help' });
});
app.post('/help', (req, res) => {
  const { Name, Email, Message } = req.body; // Extract data from req.body

  const myData2 = new MessageContainer({
    Name,
    Email,
    Message,
  });

  myData2.save()
    .then(() => {
      res.send("Your message has been received successfully.");
    })
    .catch((error) => {
      console.error("Error while saving message:", error);
      res.status(500).send("An error occurred while saving your message.");
    });
});

app.listen(port, () => {
  console.log(`The app started running at port ${port}`);
});

// Function to validate fullname complexity
function isValidFullname(fullname) {
  const alphabetRegex = /^[a-zA-Z ]+$/;
  return alphabetRegex.test(fullname);
}

// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to validate phone number format
function isValidPhoneNumber(phoneno) {
  const digitsOnly = phoneno.replace(/\D/g, '');
  return digitsOnly.length === 10;
}

// Function to validate password complexity
function isValidPassword(password) {
  const minLength = 8;
  if (password.length < minLength) {
    return false;
  }

  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[!@#$%^&*()_+{}\[\]:;<>,.?~\\\/-]/.test(password);
}

// Function to validate password and confirmation password
function isValidPasswordAndConfirmation(password, password1) {
  return isValidPassword(password) && password === password1;
}

// Function to check if email exists in the database
async function isEmailExists(email) {
  try {
    const existingUser = await Register.findOne({ email });
    return !!existingUser;
  } catch (error) {
    console.error('Error while checking email existence:', error);
    return false;
  }
}

// Register Get/Post
app.get('/', (req, res) => {
  res.status(200).render('register.pug',  { currentPage: 'register' });
});

// Function to hash the password
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

app.post('/register', async (req, res) => {
  const { fullname, phoneno, email, password, password1 } = req.body;
  const errors = {};

  if (!isValidFullname(fullname)) {
    errors.email = 'Invalid Username';
  }

  if (!isValidEmail(email)) {
    errors.email = 'Invalid email address.';
  }

  const emailExists = await isEmailExists(email);
  if (emailExists) {
    errors.email = 'Email already exists. Please choose a different email address.';
  }

  if (!isValidPhoneNumber(phoneno)) {
    errors.phoneno = 'Enter a 10-digit number.';
  }

  if (!isValidPassword(password)) {
    errors.password = 'Password should have at least 8 characters, including one uppercase letter, one lowercase letter, one digit, and one special character.';
  }

  if (!isValidPasswordAndConfirmation(password, password1)) {
    errors.password1 = 'Passwords do not match or do not meet the criteria.';
  }

  if (Object.keys(errors).length > 0) {
    return res.render('register', { errors, fullname, phoneno, email });
  }

  try {
    const hashedPassword = await hashPassword(password);

    const myData = new Register({
      fullname,
      phoneno,
      email,
      password: hashedPassword,
      password1: hashedPassword,
    });

    await myData.save();
    res.send("You are registered successfully.");
  } catch (err) {
    console.error(err);
    res.status(400).send("Error Saving user Details.");
  }
});

// Function to check if email and password match the stored credentials
async function isValidCredentials(email, loginpassword) {
  try {
    const user = await Register.findOne({ email });
    if (!user) {
      return false;
    }

    const isPasswordValid = await bcrypt.compare(loginpassword, user.password);
    return isPasswordValid;
  } catch (error) {
    console.error('Error while checking user credentials:', error);
    return false;
  }
}

//Authentication for the login Process

app.get('/login', (req, res) => {
  res.status(200).render('login.pug',  { currentPage: 'login' });
});

app.post('/login', async (req, res) => {
  const { email, loginpassword } = req.body;
  const errors = {};

  if (!isValidEmail(email)) {
    errors.email = 'Invalid email address.';
  }

  if (Object.keys(errors).length > 0) {
    return res.render('login', { errors, email });
  }

  const isCredentialsValid = await isValidCredentials(email, loginpassword);
  if (!isCredentialsValid) {
    errors.loginpassword = 'Invalid email or password.';
    return res.render('login', { errors, email });
  }
  res.status(200).render('elearn.pug',  { currentPage: 'home' });
});

// Add a new route for logout
app.get('/logout', (req, res) => {
  // Clear the session or token here
  req.session.destroy((err) => {
    if (err) {
      console.error('Error while destroying session:', err);
      res.status(500).send("An error occurred during logout.");
    } else {
      res.redirect('/login'); // Redirect to the login page after logout
    }
  });
});

//CRUD operation 
// Home Page - Display Registered Students
app.get('/course', async (req, res) => {
  try {
    const students = await Student.find();
    const uniquePrograms = [...new Set(students.map((student) => student.program))];

    let studentsFiltered = students;
    const programFilter = req.query.program;
    if (programFilter && programFilter !== 'all') {
      studentsFiltered = students.filter((student) => student.program === programFilter);
    }
   // Get the userId from the session, assuming it's stored in req.session.userId
     const userId = req.session.userId;
    // Find the logged-in user in the Register model to get the fullname
    const user = await Register.findById(userId);
    const fullname = user ? user.fullname : 'Unknown'; // If user is not found, set fullname as 'Unknown'
    res.render('course', { students, studentsFiltered, uniquePrograms ,fullname});
  } catch (error) {
    console.error('Error fetching student data:', error);
    res.status(500).send('An error occurred while fetching student data.');
  }
});

// Enroll Student - Create
app.post('/enroll', async (req, res) => {
  try {
    const { studentName, studentProgram, studentSubjects, studentTime } = req.body;
    const subjects = studentSubjects.split(',').map((subject) => subject.trim());
 // Get the userId from the session, assuming it's stored in req.session.userId
 const userId = req.session.userId;

 // Check if the logged-in student has already enrolled
 const existingEnrollment = await Student.findOne({ userId });
 if (existingEnrollment) {
   return res.status(400).send('You have already enrolled.');
 }
    const newStudent = new Student({
      name: studentName,
      program: studentProgram,
      subjects,
      time: studentTime,
    });

    await newStudent.save();
    res.redirect('/course');
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).send('An error occurred while enrolling the student.');
  }
});

// Edit Student Enrollment - Update
app.get('/edit/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).send('Student not found.');
    }

    res.render('edit', { student });
  } catch (error) {
    console.error('Error fetching student data for edit:', error);
    res.status(500).send('An error occurred while fetching student data for edit.');
  }
});

app.post('/edit/:id', async (req, res) => {
  try {
    const { studentName, studentProgram, studentSubjects, studentTime } = req.body;
    const subjects = studentSubjects.split(',').map((subject) => subject.trim());

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).send('Student not found.');
    }

    student.name = studentName;
    student.program = studentProgram;
    student.subjects = subjects;
    student.time = studentTime;

    await student.save();
    res.redirect('/course');
  } catch (error) {
    console.error('Error updating student data:', error);
    res.status(500).send('An error occurred while updating student data.');
  }
});

// Delete Student Enrollment
app.get('/delete/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).send('Student not found.');
    }

    await student.deleteOne(); // Replace remove with deleteOne
    res.redirect('/course');
  } catch (error) {
    console.error('Error deleting student data:', error);
    res.status(500).send('An error occurred while deleting student data.');
  }
});