function parseChannelInput(input) {
  const trimmed = String(input || "").trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const path = url.pathname.replace(/\/+$/, "");

    if (path.startsWith("/@")) {
      return { type: "handle", value: path.slice(2) };
    }

    if (path.startsWith("/channel/")) {
      return { type: "channelId", value: path.split("/")[2] };
    }

    if (path.startsWith("/c/")) {
      return { type: "custom", value: path.split("/")[2] };
    }

    if (path.startsWith("/user/")) {
      return { type: "legacy", value: path.split("/")[2] };
    }
  } catch {
    if (trimmed.startsWith("@")) {
      return { type: "handle", value: trimmed.slice(1) };
    }
  }

  return { type: "search", value: trimmed };
}

async function youtubeFetch(path) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing YOUTUBE_API_KEY.");
  }

  const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${apiKey}`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error?.message || "YouTube request failed.");
  }

  return body;
}

function mapChannel(item) {
  if (!item) {
    throw new Error("Channel data unavailable.");
  }

  return {
    id: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl ? `@${item.snippet.customUrl}` : item.snippet.title,
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
    description: item.snippet.description,
    subscribers: Number(item.statistics.subscriberCount || 0),
    totalViews: Number(item.statistics.viewCount || 0),
  };
}

async function resolveChannel(parsed) {
  if (parsed.type === "channelId") {
    const channelData = await youtubeFetch(
      `channels?part=snippet,statistics&id=${encodeURIComponent(parsed.value)}`,
    );
    return mapChannel(channelData.items?.[0]);
  }

  const searchValue = parsed.type === "handle" ? `@${parsed.value}` : parsed.value;
  const searchData = await youtubeFetch(
    `search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(searchValue)}`,
  );
  const channelId = searchData.items?.[0]?.snippet?.channelId;

  if (!channelId) {
    throw new Error("Could not find a channel matching that input.");
  }

  const channelData = await youtubeFetch(
    `channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}`,
  );
  return mapChannel(channelData.items?.[0]);
}

async function fetchMonthlyVideos(channelId) {
  const publishedAfter = new Date();
  publishedAfter.setDate(publishedAfter.getDate() - 31);

  const searchData = await youtubeFetch(
    `search?part=snippet&channelId=${encodeURIComponent(channelId)}&order=date&type=video&maxResults=12&publishedAfter=${encodeURIComponent(
      publishedAfter.toISOString(),
    )}`,
  );

  const videoIds = searchData.items?.map((item) => item.id.videoId).filter(Boolean) || [];

  if (!videoIds.length) {
    return [];
  }

  const videosData = await youtubeFetch(
    `videos?part=snippet,statistics&id=${videoIds.map(encodeURIComponent).join(",")}`,
  );

  return videosData.items.map((item) => ({
    id: item.id,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    views: Number(item.statistics.viewCount || 0),
    likes: Number(item.statistics.likeCount || 0),
    comments: Number(item.statistics.commentCount || 0),
    thumbnail:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.default?.url,
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const parsed = parseChannelInput(req.body?.input);

    if (!parsed) {
      res.status(400).json({ error: "Paste a YouTube channel URL, handle, or name." });
      return;
    }

    const channel = await resolveChannel(parsed);
    const videos = await fetchMonthlyVideos(channel.id);

    res.status(200).json({ channel, videos });
  } catch (error) {
    res.status(500).json({ error: error.message || "Analysis failed." });
  }
}
