// ============================================================================
// Expense Tracker - frontend logic (Phase 2)
// Talks to the backend from Phase 1 with fetch. No local/in-memory data.
// ============================================================================

const API_URL = "http://localhost:3000/api/expenses";

// One array kept in memory ONLY as the source for rendering + filtering.
// It is always overwritten with whatever the server just returned (refresh()),
// never edited by hand after an add/edit/delete.
let allExpenses = [];

// ---- DOM references ---------------------------------------------------------
const tableBody      = document.getElementById("expensesTableBody");
const spinner        = document.getElementById("spinner");
const alertPlaceholder = document.getElementById("alertPlaceholder");
const categoryFilter = document.getElementById("categoryFilter");

const expenseForm = document.getElementById("expenseForm");
const editForm     = document.getElementById("editForm");
const editModalEl  = document.getElementById("editModal");
const editModal    = new bootstrap.Modal(editModalEl);

// ============================================================================
// API calls - one small function per endpoint
// ============================================================================

async function getExpenses() {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error("Could not load expenses.");
  return response.json();
}

async function addExpense(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Could not add expense.");
  return body;
}

async function updateExpense(id, data) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Could not update expense.");
  return body;
}

async function deleteExpense(id) {
  const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Could not delete expense.");
  return body;
}

// ============================================================================
// UI helpers
// ============================================================================

function showSpinner(show) {
  spinner.classList.toggle("d-none", !show);
}

function showAlert(message, type = "danger") {
  alertPlaceholder.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

const CATEGORY_BADGE = {
  Food: "success",
  Transport: "info",
  Bills: "warning",
  Entertainment: "primary",
  Other: "secondary",
};

// ---- Rendering ---------------------------------------------------------------
// These two functions never fetch anything themselves - they only draw
// whatever array they are given. That keeps "get data" and "show data" separate.

function renderSummary(list) {
  const total = list.reduce((sum, e) => sum + Number(e.amount), 0);
  const highest = list.reduce((max, e) => Math.max(max, Number(e.amount)), 0);

  document.getElementById("summaryTotal").textContent = formatMoney(total);
  document.getElementById("summaryCount").textContent = list.length;
  document.getElementById("summaryHighest").textContent = formatMoney(highest);
}

function renderTable(list) {
  tableBody.innerHTML = ""; // clear old rows before rebuilding

  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No expenses to show.</td></tr>`;
    return;
  }

  for (const expense of list) {
    const badge = CATEGORY_BADGE[expense.category] || "secondary";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${expense.title}</td>
      <td>${formatMoney(expense.amount)}</td>
      <td><span class="badge text-bg-${badge}">${expense.category}</span></td>
      <td>${expense.date}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1 btn-edit" data-id="${expense.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${expense.id}">Delete</button>
      </td>`;
    tableBody.appendChild(row);
  }
}

function applyFilter() {
  const selected = categoryFilter.value;
  const filtered = selected === "All"
    ? allExpenses
    : allExpenses.filter((e) => e.category === selected);
  renderTable(filtered);
  // Summary cards always reflect ALL expenses, not the filtered list (per the spec).
  renderSummary(allExpenses);
}

// ============================================================================
// Main flow: always re-fetch from the server, then re-render everything.
// ============================================================================

async function refresh() {
  showSpinner(true);
  try {
    allExpenses = await getExpenses();
    applyFilter();
  } catch (err) {
    showAlert("Could not reach the server. Is it running?");
  } finally {
    showSpinner(false);
  }
}

// ============================================================================
// Event listeners
// ============================================================================

// Add expense
expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const data = {
    title: document.getElementById("title").value.trim(),
    amount: document.getElementById("amount").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
  };

  // Simple client-side check before we even ask the server (fast feedback).
  if (!data.title || !data.amount || Number(data.amount) <= 0 || !data.category || !data.date) {
    expenseForm.classList.add("was-validated");
    return;
  }

  try {
    await addExpense(data);
    expenseForm.reset();
    expenseForm.classList.remove("was-validated");
    await refresh();          // always ask the server for the truth again
    showAlert("Expense added.", "success");
  } catch (err) {
    showAlert(err.message);
  }
});

// Filter dropdown
categoryFilter.addEventListener("change", applyFilter);

// Table clicks (edit / delete) - one listener on the table, not one per row
tableBody.addEventListener("click", async (event) => {
  const id = event.target.dataset.id;
  if (!id) return;

  if (event.target.classList.contains("btn-delete")) {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      await refresh();
      showAlert("Expense deleted.", "success");
    } catch (err) {
      showAlert(err.message);
    }
  }

  if (event.target.classList.contains("btn-edit")) {
    const expense = allExpenses.find((e) => String(e.id) === id);
    if (!expense) return;

    document.getElementById("editId").value = expense.id;
    document.getElementById("editTitle").value = expense.title;
    document.getElementById("editAmount").value = expense.amount;
    document.getElementById("editCategory").value = expense.category;
    document.getElementById("editDate").value = expense.date;

    editModal.show();
  }
});

// Save edit
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("editId").value;
  const data = {
    title: document.getElementById("editTitle").value.trim(),
    amount: document.getElementById("editAmount").value,
    category: document.getElementById("editCategory").value,
    date: document.getElementById("editDate").value,
  };

  try {
    await updateExpense(id, data);
    editModal.hide();
    await refresh();
    showAlert("Expense updated.", "success");
  } catch (err) {
    showAlert(err.message);
  }
});

// ---- First load ---------------------------------------------------------------
refresh();
