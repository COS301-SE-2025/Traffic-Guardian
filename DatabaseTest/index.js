const path = require('path');
require('dotenv').config({
  override: true,
  path: path.join(__dirname, 'development.env'),
});
const {Pool, Client} = require('pg');
const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});

(async () => {
  // const client = await pool.connect();
  try {
    // const {rows} = await pool.query('SELECT current_user');
    // const res = await pool.query('SELECT * FROM Car');
    // const currentUser = rows[0]['current_user'];
    // console.log(currentUser);
    const cars= await pool.query('SELECT * FROM "TrafficGuardian"."Incidents"');//SELECT * FROM TrafficGuardian.Car
    const car = cars.rows[0];
    console.log(car);
    // console.log(rows);
  } catch (err) {
    console.error(err);
   }// finally {
  //   client.release();
  // }
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
