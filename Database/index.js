import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  override: true,
  path: path.join(__dirname, 'development.env'),
});

const pool = new Pool({
  user: process.env.DB_USER,
(async ()=> {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to the database');
    const {rows} = await client.query('SELECT * FROM Car');
    // const res = await client.query('SELECT * FROM Car');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    if (client) client.release();
  }
})();
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
  }
})();

// // Middleware to parse JSON
// app.use(express.json());

// // Test route: Fetch all rows from a sample table
// app.get('/api/data', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT * FROM Car');
//     res.json(result.rows);
//   } catch (err) {
//     console.error('Database query error:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Example external API call using Axios
// app.get('/api/external', async (req, res) => {
//   try {
//     const response = await axios.get('https://api.example.com/data');
//     res.json(response.data);
//   } catch (err) {
//     console.error('Axios request error:', err);
//     res.status(500).json({ error: 'Failed to fetch external data' });
//   }
// });

// // Start server
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });
