import corsHeaders from 'mejai-common'
import axios from 'axios';

const handleApiError = (error) => {
    console.log(error);
    if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        return {
            status: 429,
            body: JSON.stringify({ message: `제한 횟수가 초과되었습니다. ${retryAfter}초 후에 다시 시도해주세요.` }),
            headers: {
                ...corsHeaders,
                'Retry-After': retryAfter
            }
        };
    }
    return {
        statusCode: error.response ? error.response.status : 500,
        headers: { ...corsHeaders },
        body: JSON.stringify({ message: error.message }),
    };
}

const callRiotApi = async (id, tag) => {
    try {
        const accountUri = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${id}/${tag}`;
        const account = await axios.get(accountUri, {
            headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY,
            }
        });

        const puuid = account.data.puuid;
        const summonerUri = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
        const summoner = await axios.get(summonerUri, {
            headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY
            }
        });

        const summonerId = summoner.data.id;
        const rankUri = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
        const ranks = await axios.get(rankUri, {
            headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY
            }
        });

        const riotData = JSON.stringify({ account: account.data, summoner: summoner.data, ranks: ranks.data });
        await axios.post('https://ug9bgowsd1.execute-api.ap-northeast-2.amazonaws.com/mejai-v2/api/v2/users/profile/rds', riotData)

        return getProfile(id, tag);
    } catch (error) {
        return handleApiError(error);
    }

}

const getProfile = async (id, tag) => {
    const getUsersProfileRdsUri = `https://ug9bgowsd1.execute-api.ap-northeast-2.amazonaws.com/mejai-v2/api/v2/users/profile/rds?id=${id}&tag=${tag}`
    const profile = await axios.get(getUsersProfileRdsUri);
    return {
        statusCode: 200,
        headers: { ...corsHeaders },
        body: JSON.stringify(profile.data),
    };

}

export const handler = async (event) => {
    const { id, tag = "KR1" } = event.queryStringParameters;

    try {
        return await getProfile(id, tag)
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return await callRiotApi(id, tag);
        }
        return handleApiError(error);
    }
};
