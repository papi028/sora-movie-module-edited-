async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://sudatchi-api.vercel.app/api/search?q=${encodedKeyword}`);
        const data = JSON.parse(responseText);

        const transformedResults = data.media.map(result => {
            return {
                title: result.title.english || result.title.romaji || result.title.native,
                image: result.coverImage.large || result.coverImage.extraLarge || result.coverImage.medium,
                href: `https://sudatchi.com/anime/${result.id}`
            };
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/anime\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const responseText = await fetch(`https://sudatchi.com/api/anime/${showId}`);
        const data = JSON.parse(responseText);

        const transformedResults = [{
            description: data.description || 'No description available',
            aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : "Unknown"}`,
            airdate: `Aired: ${data.startDate.day}.${data.startDate.month}.${data.startDate.year}` || 'Aired: Unknown'
        }];

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/anime\/([^\/]+)/);
            
        if (!match) throw new Error("Invalid URL format");
            
        const showId = match[1];
        const responseText = await fetch(`https://sudatchi.com/api/anime/${showId}`);
        const data = JSON.parse(responseText);

        const transformedResults = data.episodes.map(episode => {
            return {
                href: `https://sudatchi.com/watch/${showId}/${episode.number}`,
                number: episode.number,
                title: episode.title || ""
            };
        });
            
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/watch\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const episodeNumber = match[2];

        try {
            const episodesApiUrl = `https://sudatchi.com/api/episode/${showId}/${episodeNumber}`;

            const responseTextEpisodes = await fetch(episodesApiUrl);
            const episodesData = JSON.parse(responseTextEpisodes);

            const episodeId = episodesData.episodes.find(episode => episode.number === episodeNumber).id;

            const streamApiUrl = `https://sudatchi.com/api/streams?episodeId=${episodeId}`;
            
            const responseTextStream = await fetch(streamApiUrl);
            const streamData = JSON.parse(responseTextStream);
                    
            if (episodesData.data && streamData.data) {
                const episode = episodesData.data;
                const hlsSource = streamData.url;

                const subtitleTrack = episode.subtitlesMap[0];

                if (hlsSource) {
                    const result = {
                        stream: hlsSource ? `https://sudatchi.com/${hlsSource}` : null,
                        subtitles: subtitleTrack ? `https://ipfs.sudatchi.com${subtitleTrack}` : null,
                    };
                    
                    return JSON.stringify(result);
                }
            }
        } catch (err) {
            console.log(`Fetch error for show ${showId}:`, err);
        }
        
        return null;
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}
