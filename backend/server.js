// ============================================================================
// Expense Tracker - Backend API (Express + PostgreSQL)
// ============================================================================
//
// Setup (do this once):
//   1. Create a database named expense_tracker in pgAdmin, then run schema.sql on it.
//   2. Copy .env.example -> .env and write your real PostgreSQL password in it.
//   3. From the backend/ folder, run: npm install express cors pg dotenv
//
// Run the server:
//   node server.js
//   (Restart it -- Ctrl+C then run again -- every time you edit this file.)
//
// ============================================================================

// ---- 1. Imports -----------------------------------------------------------
require("dotenv").config();      // loads the variables from .env into process.env
const express = require("express"); 
const cors = require("cors");
const { Pool } = require("pg");

// ---- 2. App + middleware ---------------------------------------------------
const app = express();

app.use(cors());          // allow the frontend (different port/origin) to call this API
app.use(express.json());  // parse JSON request bodies into req.body automatically

// ---- 3. Database connection pool -------------------------------------------
// A Pool manages several DB connections for us so we don't open/close one by hand
// on every request. We read the connection details from .env (never hardcode them).
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// The five allowed categories (used for validation on POST/PUT)
const ALLOWED_CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Other"];

// Reused in every SELECT so amount comes back as a number (not a string)
// and date comes back as "YYYY-MM-DD" (not a shifted JS Date object).
const SELECT_COLUMNS = `
  id,
  title,
  amount::float8 AS amount,
  category,
  to_char(date, 'YYYY-MM-DD') AS date
`;

// ---- 4. Small validation helper ---------------------------------------------
// Checks the body of a POST/PUT request and returns a list of problems.
// Returns an empty array [] when everything is valid.
function validateExpense(body) {
  const errors = [];
  const { title, amount, category, date } = body || {};

  if (!title || typeof title !== "string" || title.trim() === "") {
    errors.push("title is required");
  }

  const amountNumber = Number(amount);
  if (amount === undefined || amount === null || amount === "" || isNaN(amountNumber) || amountNumber <= 0) {
    errors.push("amount must be a number greater than 0");
  }

  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }

  if (!date || isNaN(Date.parse(date))) {
    errors.push("date is required and must be a valid date");
  }

  return errors;
}

// Checks that :id from the URL is a real positive integer.
// Without this, PostgreSQL throws its own ugly error for something like /api/expenses/abc.
function isValidId(id) {
  return /^\d+$/.test(id);
}

// ============================================================================
// ROUTES
// ============================================================================

// GET /api/expenses -> return every expense
app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM expenses ORDER BY date DESC, id DESC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
  }
});

// GET /api/expenses/:id -> return one expense
app.get("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(404).json({ message: `Expense ${id} not found.` });
  }

  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM expenses WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Expense ${id} not found.` });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
  }
});

// POST /api/expenses -> add a new expense
app.post("/api/expenses", async (req, res) => {
  const errors = validateExpense(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(", ") });
  }

  const { title, amount, category, date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO expenses (title, amount, category, date)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_COLUMNS}`,
      [title.trim(), amount, category, date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
  }
});

// PUT /api/expenses/:id -> update an existing expense
app.put("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(404).json({ message: `Expense ${id} not found.` });
  }

  const errors = validateExpense(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(", ") });
  }

  const { title, amount, category, date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE expenses
       SET title = $1, amount = $2, category = $3, date = $4
       WHERE id = $5
       RETURNING ${SELECT_COLUMNS}`,
      [title.trim(), amount, category, date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Expense ${id} not found.` });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
  }
});

// DELETE /api/expenses/:id -> delete an expense
app.delete("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(404).json({ message: `Expense ${id} not found.` });
  }

  try {
    const result = await pool.query(
      `DELETE FROM expenses WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Expense ${id} not found.` });
    }

    res.status(200).json({ message: `Expense ${id} deleted.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
  }
});

// ---- 5. Start the server ----------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
