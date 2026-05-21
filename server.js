const express = require("express");
const cors = require("cors");
const db = require("./db");
const eventRoutes = require("./routes/event.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/events", eventRoutes);

// test API
app.get("/", (req, res) => {
  res.send("EVENTRA Backend OK 🚀");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});