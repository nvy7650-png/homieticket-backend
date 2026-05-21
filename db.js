const mysql = require("mysql2");

require("dotenv").config();

const db = mysql.createConnection(
  process.env.DATABASE_URL
);

db.connect((err) => {

  if (err) {

    console.log(
      "❌ MySQL connection error:",
      err
    );

  } else {

    console.log("✅ MySQL connected!");

    // VIETNAM TIME
    db.query(
      "SET time_zone = '+07:00'"
    );

  }

});

module.exports = db;