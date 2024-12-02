import corsHeaders from 'mejai-common'
import pg from 'pg'
const { Client } = pg;

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: {
        rejectUnauthorized: false
    },
});

let isConnected = false;

const connectToDatabase = async () => {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.log('Connected to the database successfully.');
    }
};
export const handler = async (event) => {
    const { month, year } = event.queryStringParameters;
    const formattedMonth = month.toString().padStart(2, '0');
    const query =
        `SELECT 
            s.summoner_name, 
            s.tag_line, 
            SUM(ms.game_count) AS totalGameCount
        FROM 
            summoner s
        INNER JOIN 
            search_history sh ON s.id = sh.summoner_id
        INNER JOIN 
            match_streak ms ON sh.id = ms.search_history_id
        WHERE 
            sh.year_month = $1 
        GROUP BY 
            s.summoner_name, 
            s.tag_line
        ORDER BY 
            SUM(ms.game_count) DESC
        LIMIT 10;`

    try {
        await connectToDatabase();

        const res = await client.query(query, [`${year}-${formattedMonth}`]);
        const ranking = res.rows.map(row => ({
            summonerName: row.summoner_name,
            tagLine: row.tag_line,
            totalGameCount: row.totalgamecount
        }));
        return {
            statusCode: 200,
            headers: { ...corsHeaders },
            body: JSON.stringify(ranking),
        };
    } catch (error) {
        console.error('Database query error:', error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: 'Unable to query the database' }),
        };
    }
};