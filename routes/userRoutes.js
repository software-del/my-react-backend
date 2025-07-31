const express = require('express');
const router = express.Router();
const db = require('../db'); // We'll fix this in Step 2

// Promote to Admin
router.put('/promote/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'UPDATE application SET admin = true WHERE id = ?';

  db.query(sql, [userId], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to promote user' });
    res.json({ message: 'User promoted to admin' });
  });
});

// Toggle Active
router.put('/toggle-active/:id', (req, res) => {
  const userId = req.params.id;
  const getSql = 'SELECT active FROM application WHERE id = ?';

  db.query(getSql, [userId], (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ error: 'User not found' });

    const newStatus = !results[0].active;
    const updateSql = 'UPDATE application SET active = ? WHERE id = ?';

    db.query(updateSql, [newStatus, userId], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to toggle status' });
      res.json({ message: 'User status toggled', active: newStatus });
    });
  });
});

// Delete User
router.delete('/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM application WHERE id = ?';

  db.query(sql, [userId], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete user' });
    res.json({ message: 'User deleted' });
  });
});

module.exports = router;
