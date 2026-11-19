import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool, sql } from './db';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);

// Health check for SQL Server connection
app.get('/api/health', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ status: 'connected', engine: 'MSSQL' });
  } catch (err) {
    res.status(500).json({ status: 'disconnected', error: String(err) });
  }
});

// Load BOQ items for a project
app.get('/api/boq', async (req, res) => {
  try {
    const projectCode = String(req.query.project || 'PROJ-TWRB');
    const pool = await getPool();
    const result = await pool
      .request()
      .input('projectCode', sql.NVarChar, projectCode)
      .query('SELECT * FROM boq_items WHERE project_code = @projectCode ORDER BY line_no ASC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Approve / Reject PO
app.post('/api/po/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body as { comments: string };
    if (!comments?.trim()) {
      return res.status(400).json({ error: 'Rejection comments are required.' });
    }
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.NVarChar, id)
      .input('comments', sql.NVarChar, comments.trim())
      .query(
        "UPDATE pos SET status = 'Returned to Applicant', rejection_comments = @comments WHERE id = @id"
      );
    res.json({ ok: true, status: 'Returned to Applicant' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Transaction Logs
app.get('/api/logs', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query('SELECT TOP 200 * FROM transaction_logs ORDER BY timestamp DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`MSSQL API server ready on http://localhost:${PORT}`);
});
