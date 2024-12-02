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

const resourceUrl = "https://d1lgkfcquwlbly.cloudfront.net/"

const getUsersData = async (event) => {
    const { id, tag = "KR1" } = event.queryStringParameters;
    const usersQuery =
        `SELECT *
        FROM users
        WHERE summoner_name ILIKE $1
        AND tag_line ILIKE $2`
    const rankQuery =
        `SELECT *
        FROM rank
        WHERE puuid = $1`

    const { rows: [ usersData ] } = await client.query(usersQuery, [ id, tag ]);
    if (!usersData) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: '유저 정보를 찾을 수 없습니다.' }),
        };
    }

    const { rows: rankData } = await client.query(rankQuery, [ usersData.puuid ]);

    const soloRank = rankData.find(rank => rank.queue_type === 'RANKED_SOLO_5x5');
    const flexRank = rankData.find(rank => rank.queue_type === 'RANKED_FLEX_SR');

    const createRank = (rank) => {
        return {
            tier: rank.tier,
            tierIcon: `${resourceUrl}emblem/${rank.tier}.png`,
            rank: rank.rank,
            leaguePoints: rank.league_points,
            wins: rank.wins,
            losses: rank.losses,
        }
    }

    const responseBody = {
        summonerName: usersData.summoner_name,
        tagLine: usersData.tag_line,
        profileIcon: `${resourceUrl}profileIcon/${usersData.profile_icon_id}.png`,
        level: usersData.summoner_level,
        soloRank: createRank(soloRank),
        flexRank: createRank(flexRank),
        lastUpdatedAt: usersData.updated_at,
    }

    return {
        statusCode: 200,
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
            body: JSON.stringify({ error: error.message }),
        };
    }
};
