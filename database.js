const mysql = require("mysql2");

const pool = mysql
  .createPool({
    host: "localhost",
    user: "root",
    password: "Harbang@79",
    database: "cctv",
  })
  .promise();

const getCctv = async () => {
  const [rows] = await pool.query("SELECT * FROM cctvs WHERE recorded = true");
  return rows;
};

const findCctv = async (id) => {
  const rows = await pool.query("SELECT * FROM cctvs WHERE id = ?", [id]);
  return rows[0][0];
};

module.exports = { getCctv, findCctv };
