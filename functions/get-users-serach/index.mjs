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
    const { id, count = 5 } = event.queryStringParameters;

    const query = `
        SELECT
            summoner_name AS id,
            tag_line AS tag
        FROM
            summoner
        WHERE
            summoner_name ILIKE $1
        ORDER BY 
            summoner_name DESC
        LIMIT 5
    `;

    const { rows: usersData } = await client.query(query, [`%${id}%`]);
    if (!usersData) {
        return {
            statusCode: 404,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: '유저 정보를 찾을 수 없습니다.' }),
        };
    }


    return {
        statusCode: 200,
        headers: { ...corsHeaders },
        body: JSON.stringify(usersData),
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
