const { Client } = require('pg');

// 클라이언트 인스턴스를 함수 밖에 생성하여 연결을 재사용
const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

let isConnected = false;

const connectToDatabase = async () => {
    if (!isConnected) {
      await client.connect();
      isConnected = true;
      console.log('Connected to the database successfully.');
    }
  };

  exports.handler = async (event) => {
    try {
      await connectToDatabase();
      const res = await client.query('SELECT * FROM your_table');
      console.log('Data retrieved:', res.rows);

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows),
    };
  } catch (error) {
    console.error('Database query error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unable to query the database' }),
    };
  }
};
exports.handler()