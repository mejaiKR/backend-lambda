import corsHeaders from 'mejai-common'
import pg from 'pg';
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

const connectToDatabase = async () => {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.log('Connected to the database successfully.');
    }
};
let isConnected = false;

const getUsersData = async (event) => {
    const { id, tag = "KR1" } = event.queryStringParameters;
    const usersQuery =
        `SELECT *
        FROM summoner
        WHERE LOWER(REPLACE(summoner_name, ' ', '')) = LOWER(REPLACE($1, ' ', ''))
        AND tag_line ILIKE $2`

    const { rows: [ usersData ] } = await client.query(usersQuery, [ id, tag ]);
    if (!usersData) {
        return {
            statusCode: 404,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: '유저 정보를 찾을 수 없습니다.' }),
        };
    }

    const responseBody = {
        lastUpdatedAt: usersData.updated_at,
    }

    return {
        statusCode: 200,
        headers: { ...corsHeaders },
        body: JSON.stringify(responseBody),
    };
}

export const handler = async (event) => {
    try {
        await connectToDatabase();
        return await getUsersData(event);
    } catch (error) {
        return {
            statusCode: 500,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
