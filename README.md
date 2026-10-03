# Expense Tracker

A simple app to track my daily expenses. I can add an expense, see all
of them in a table, filter by category, and see the total amount and
the highest expense. The data is saved in a PostgreSQL database.

## How to run

**Backend**

1. Create a database in pgAdmin named `expense_tracker`.
2. Run `backend/schema.sql` on it to create the table.
3. Copy `backend/.env.example` to `backend/.env` and add your PostgreSQL
   password.
4. Open a terminal in `backend/` and run:
   ```
   npm install express cors pg dotenv
   node server.js
   ```

**Frontend**

1. Open `frontend/index.html` with Live Server in VS Code.
2. Make sure the backend is still running.

## Features

- [x] Add an expense (with validation)
- [x] Delete an expense
- [x] Edit an expense
- [x] Filter by category
- [x] Summary cards (total, count, highest)
- [x] Data is saved in a PostgreSQL database

## Screenshots

## Screenshots

![view 1](<frontend/Screenshots/Screenshot 2026-10-03 185843.png>)
![view 2](<frontend/Screenshots/Screenshot 2026-10-03 185957.png>)
![view 3](<frontend/Screenshots/Screenshot 2026-10-03 190103.png>)
![view 4](<frontend/Screenshots/Screenshot 2026-10-03 190326.png>)

## What was the hardest part?

The hardest part was when I was testing the API and got a 500 error
instead of a 400 error on a POST request. I checked the terminal and
found the problem was in my validation code, because I sent a request
without a body by mistake. I fixed it by adding `|| {}` so the code
doesn't crash if the body is empty, and it returns a normal error
message instead.
## Demo Video
[Watch the demo](https://drive.google.com/file/d/1s2fYuDwikmFgszYvhF4MLEl-t7cnc6re/view?usp=sharing)