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

const resourceUrl = "https://d1lgkfcquwlbly.cloudfront.net/"

let isConnected = false;

const formatDateString = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    return formattedDate
}

const connectToDatabase = async () => {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.log('Connected to the database successfully.');
    }
};
const getMejaiStackImageUrl = (gameCount) => {
    if (gameCount > 25) {
        return `${resourceUrl}deathCap.png`;
    }
    return `${resourceUrl}mejaiStack/${gameCount}.svg`
}
export const handler = async (event) => {
    const { id, tag = "KR1", month, year } = event.queryStringParameters;
    const formattedMonth = month.toString().padStart(2, '0');

    const searchHistoryQuery =
        `SELECT sh.*
        FROM summoner s
        INNER JOIN search_history sh ON s.id = sh.summoner_id
        WHERE s.summoner_name ILIKE $1
        AND s.tag_line ILIKE $2 
        AND sh.year_month = $3`
    const streakQuery =
        `SELECT *
        FROM match_streak 
        WHERE search_history_id = $1`;
    try {
        await connectToDatabase();
        const { rows: [ searchHistoryData ] } = await client.query(searchHistoryQuery, [ id, tag, `${year}-${formattedMonth}` ]);
        if (!searchHistoryData) {
            return {
                statusCode: 200,
                body: JSON.stringify({ userGameCount: [], lastUpdatedAt: new Date(1900, 0, 1, 0, 0, 0).toISOString()}),
            };
        }

        const streakData = await client.query(streakQuery, [ searchHistoryData.id ]);
        const userGameCount = streakData.rows.map(row => ({
            date: formatDateString(row.date),
            gameCount: row.game_count,
            imageUrl: getMejaiStackImageUrl(row.game_count)
        }));
        const responseBody = {
            userGameCount,
            lastUpdatedAt: searchHistoryData.updated_at,
        }
        return {
            statusCode: 200,
            body: JSON.stringify(responseBody),
        };
    } catch (error) {
        console.error('Database query error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Unable to query the database' }),
        };
    }
};
