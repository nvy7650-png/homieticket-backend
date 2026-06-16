const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/holds
router.post('/', (req, res) => {
  const { user_id, event_id, showtime_id, zone_id, seat_id } = req.body;

  if (!user_id || !event_id || !showtime_id || !zone_id || !seat_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const checkSql = `
    SELECT *
    FROM ticket_holds
    WHERE showtime_id = ?
      AND seat_id = ?
      AND status = 'ACTIVE'
      AND expires_at > NOW()
  `;

  db.query(checkSql, [showtime_id, seat_id], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results && results.length > 0) {
      return res.status(409).json({ message: 'Ghế đang được người khác giữ' });
    }

    const insertSql = `
      INSERT INTO ticket_holds
        (user_id, event_id, showtime_id, zone_id, seat_id, expires_at, status)
      VALUES
        (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 'ACTIVE')
    `;

    db.query(
      insertSql,
      [user_id, event_id, showtime_id, zone_id, seat_id],
      (insErr) => {
        if (insErr) {
          console.log(insErr);
          return res.status(500).json({ message: 'Server error' });
        }

        res.json({ message: 'Giữ ghế thành công' });
      }
    );

  });

});

module.exports = router;
