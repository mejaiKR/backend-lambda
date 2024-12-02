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

const setUnranked = (queueType) => {
    return {
        tier: 'UNRANKED',
        rank: 'I',
        leaguePoints: 0,
        wins: 0,
        losses: 0,
        hotStreak: false,
        veteran: false,
        freshBlood: false,
        inactive: false,
        queueType: queueType
    };
}


const insertProfile = async (account, summoner) => {
    const query = `
            INSERT INTO summoner(
                profile_icon_id, revision_date, summoner_level, account_id, puuid, summoner_id, summoner_name, tag_line, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id`;
    const res = await client.query(query, [
        summoner.profileIconId,
        summoner.revisionDate,
        summoner.summonerLevel,
        summoner.accountId,
        account.puuid,
        summoner.id,
        account.gameName,
        account.tagLine,
    ]);

    return res.rows[0].id;
}

const insertRanks = async (account, ranks, summonerId) => {
    const query = `
            INSERT INTO rank(
                fresh_blood, hot_streak, inactive, losses, veteran, wins, league_points, league_id, summoner_id, queue_type, rank, tier, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`;

    const insertRankData = async (rank) => {
        await client.query(query, [
            rank.freshBlood,
            rank.hotStreak,
            rank.inactive,
            rank.losses,
            rank.veteran,
            rank.wins,
            rank.leaguePoints,
            rank.leagueId,
            summonerId,
            rank.queueType,
            rank.rank,
            rank.tier,
        ]);
    };

    const soloRank = ranks.find(rank => rank.queueType === 'RANKED_SOLO_5x5') ?? setUnranked('RANKED_SOLO_5x5');
    const flexRank = ranks.find(rank => rank.queueType === 'RANKED_FLEX_SR') ?? setUnranked('RANKED_FLEX_SR');

    await insertRankData(soloRank);
    await insertRankData(flexRank);
}

export const handler = async (event) => {
    const { account, summoner, ranks } = JSON.parse(event.body);

    try {
        await connectToDatabase();

        await client.query('BEGIN');
        const id = await insertProfile(account, summoner);
        await insertRanks(account, ranks, id);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');

        console.error('Database query error:', error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: '데이터베이스 쿼리에 실패했습니다.' }),
        };
    }

    return {
        statusCode: 201,
        headers: { ...corsHeaders },
        body: JSON.stringify({ message: '프로필이 성공적으로 생성되었습니다' }),
    };
};
