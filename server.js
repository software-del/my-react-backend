require('dotenv').config(); // Load environment variables

const express = require('express');
const mysql = require('mysql2'); // Switch to mysql2
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());



app.get('/db-check', (req, res) => {
  db.query('SELECT 1', (err) => {
    if (err) {
      console.error('DB check failed:', err);
      return res.status(500).send('Database not connected');
    }
    res.send('✅ Backend and DB are live!');
  });
});



// MySQL connection using Railway credentials
const db = mysql.createConnection({
  host: process.env.DB_HOST,       // e.g. mysql.railway.internal
  port: process.env.DB_PORT,       // e.g. 3306
  user: process.env.DB_USER,       // e.g. root
  password: process.env.DB_PASSWORD, // your Railway password
  database: process.env.DB_NAME    // e.g. railway
});

// Test connection
db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Connected to Railway MySQL');
  }
});


// 🔐 Registration
app.post('/register', (req, res) => {
  const { name, email, po_box, dob, phone, country, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send('Missing required fields');
  }

  const sql = 'INSERT INTO application (name, email, po_box, dob, phone, country, password) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [name, email, po_box, dob, phone, country, password], (err) => {
    if (err) {
      console.error('Insert error:', err);
      return res.status(500).send('Server error');
    }
    res.status(200).send('Registration successful');
  });
});

// 🔐 Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Missing email or password');
  }

  const sql = 'SELECT * FROM application WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(401).send('User not found');
    }

    const user = results[0];
    if (user.password !== password) {
      return res.status(401).send('Invalid password');
    }

    res.status(200).json({ message: 'Login successful', user: { id: user.id, name: user.name } });
  });
});

// 🔐 Admin Auth
app.post('/api/admin-auth', (req, res) => {
  const { email, passkey } = req.body;

  if (!email || !passkey) {
    return res.status(400).send('Missing email or passkey');
  }

  const sql = 'SELECT * FROM application WHERE email = ? AND admin = true AND passkey = ?';
  db.query(sql, [email, passkey], (err, results) => {
    if (err) {
      console.error('Admin auth error:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(401).send('Invalid credentials or not an admin');
    }

    res.status(200).json({ success: true, user: results[0] });
  });
});

// 📋 Get all users
app.get('/api/users', (req, res) => {
  const sql = 'SELECT id, name, email, admin, active FROM application';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Fetch users error:', err);
      return res.status(500).send('Server error');
    }
    res.status(200).json(results);
  });
});

// 📋 Get single user by ID (for UpdateOverviewPage)
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT id, name, email, phone, country FROM application WHERE id = ?';

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Fetch single user error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(results[0]);
  });
});

// 🛡️ Promote to admin
app.put('/api/users/promote/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'UPDATE application SET admin = true WHERE id = ?';

  db.query(sql, [userId], (err) => {
    if (err) {
      console.error('Promote error:', err);
      return res.status(500).json({ error: 'Failed to promote user' });
    }
    res.json({ message: 'User promoted to admin' });
  });
});

// 🔄 Toggle active status
app.put('/api/users/toggle-active/:id', (req, res) => {
  const userId = req.params.id;
  const getSql = 'SELECT active FROM application WHERE id = ?';

  db.query(getSql, [userId], (err, results) => {
    if (err || results.length === 0) {
      console.error('Toggle fetch error:', err);
      return res.status(500).json({ error: 'User not found' });
    }

    const currentStatus = results[0].active;
    const newStatus = !currentStatus;
    const updateSql = 'UPDATE application SET active = ? WHERE id = ?';

    db.query(updateSql, [newStatus, userId], (err) => {
      if (err) {
        console.error('Toggle update error:', err);
        return res.status(500).json({ error: 'Failed to toggle status' });
      }
      res.json({ message: 'User status toggled', active: newStatus });
    });
  });
});

// ❌ Delete user
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM application WHERE id = ?';

  db.query(sql, [userId], (err) => {
    if (err) {
      console.error('Delete error:', err);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    res.json({ message: 'User deleted' });
  });
});

// ✏️ Update user info
app.put('/api/users/update/:id', (req, res) => {
  const userId = req.params.id;
  const { password, ...updates } = req.body;

  const checkSql = 'SELECT password FROM application WHERE id = ?';
  db.query(checkSql, [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({ error: 'User not found' });
    }

    if (results[0].password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const updateSql = `UPDATE application SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;

    db.query(updateSql, [...values, userId], (err) => {
      if (err) return res.status(500).json({ error: 'Update failed' });
      res.json({ message: 'Update successful' });
    });
  });
});

// 🚀 Start server
app.listen(5000, () => {
  console.log('🚀 Server running on port 5000');
});
