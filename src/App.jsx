import { useEffect, useMemo, useState } from "react";

const DEFAULT_CHANNEL_URL = "https://www.youtube.com/@ChannelMakers";

const SORT_OPTIONS = [
  { value: "impact", label: "Most viewed this month" },
  { value: "velocity", label: "Fastest growing" },
  { value: "engagementRate", label: "Highest engagement rate" },
  { value: "recent", label: "Most recent" },
];

const MOCK_CHANNEL = {
  id: "UC_channelmakers",
  title: "Channel Makers",
  handle: "@ChannelMakers",
  thumbnail:
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=240&q=80",
  description:
    "Education-driven creator channel used as a mock fallback when no API key is configured.",
  subscribers: 482000,
  totalViews: 28140000,
};

const MOCK_VIDEOS = [
  {
    id: "mock-1",
    title: "How Smart Creators Package Videos for Massive CTR",
    publishedAt: "2026-03-18T14:00:00Z",
    views: 284000,
    likes: 16400,
    comments: 962,
    thumbnail:
      "https://images.unsplash.com/photo-1492619375914-d14cc237f11d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "mock-2",
    title: "The Audience Retention Fix That Revived a Dead Channel",
    publishedAt: "2026-03-12T16:30:00Z",
    views: 198000,
    likes: 11900,
    comments: 640,
    thumbnail:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "mock-3",
    title: "We Reverse-Engineered 50 Viral Titles. Here's What Worked.",
    publishedAt: "2026-03-09T15:15:00Z",
    views: 176000,
    likes: 9400,
    comments: 518,
    thumbnail:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "mock-4",
    title: "Editing for Watch Time: The Fastest Before/After Breakdown",
    publishedAt: "2026-03-23T13:20:00Z",
    views: 151000,
    likes: 8300,
    comments: 451,
    thumbnail:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "mock-5",
    title: "A Thumbnail System for Teams Shipping 20 Videos a Month",
    publishedAt: "2026-03-03T18:00:00Z",
    views: 116000,
    likes: 6200,
    comments: 314,
    thumbnail:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
  },
];

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function daysAgo(value) {
  const date = new Date(value);
  return Math.max(
    1,
    Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function parseChannelInput(input) {
  const trimmed = input.trim();

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

async function fetchChannelAnalysis(input) {
  const response = await fetch("/api/youtube", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Could not analyze that channel.");
  }

  return body;
}

function decorateVideos(videos) {
  const baselineViews =
    videos.length > 0 ? videos.reduce((sum, video) => sum + video.views, 0) / videos.length : 0;

  return videos.map((video) => {
    const ageDays = daysAgo(video.publishedAt);
    const engagement = video.likes + video.comments;
    const viewsPerDay = Math.round(video.views / ageDays);
    const engagementRate = video.views > 0 ? engagement / video.views : 0;
    const impactScore = Math.round(video.views + viewsPerDay * 3 + engagement * 18);
    const relativeViews = baselineViews > 0 ? video.views / baselineViews : 1;

    return {
      ...video,
      ageDays,
      engagement,
      viewsPerDay,
      engagementRate,
      impactScore,
      relativeViews,
    };
  });
}

function sortVideos(videos, sortBy) {
  return [...videos].sort((left, right) => {
    if (sortBy === "recent") {
      return new Date(right.publishedAt) - new Date(left.publishedAt);
    }

    if (sortBy === "velocity") {
      return right.viewsPerDay - left.viewsPerDay;
    }

    if (sortBy === "engagementRate") {
      return right.engagementRate - left.engagementRate;
    }

    return right.impactScore - left.impactScore;
  });
}

function exportCsv(videos) {
  const lines = [
    [
      "Title",
      "Published",
      "Views",
      "Likes",
      "Comments",
      "Engagement",
      "Views Per Day",
      "Engagement Rate",
      "Relative To Channel Avg",
      "Impact Score",
    ].join(","),
    ...videos.map((video) =>
      [
        `"${video.title.replaceAll('"', '""')}"`,
        new Date(video.publishedAt).toISOString(),
        video.views,
        video.likes,
        video.comments,
        video.engagement,
        video.viewsPerDay,
        video.engagementRate.toFixed(4),
        video.relativeViews.toFixed(2),
        video.impactScore,
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "competitor-videos.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function getTrendLabel(video) {
  if (video.relativeViews >= 1.8) {
    return `Breakout: ${video.relativeViews.toFixed(1)}x channel average`;
  }

  if (video.viewsPerDay >= 20000) {
    return `High velocity: ${formatNumber(video.viewsPerDay)} views/day`;
  }

  if (video.engagementRate >= 0.065) {
    return `High engagement: ${(video.engagementRate * 100).toFixed(1)}%`;
  }

  return `Steady performer: ${video.ageDays} days live`;
}

function getNarrative(video, metrics, sortBy) {
  if (!video) {
    return "No videos matched the current filters.";
  }

  if (sortBy === "velocity") {
    return `${video.title} is the fastest mover, averaging ${formatNumber(video.viewsPerDay)} views per day since publish.`;
  }

  if (sortBy === "engagementRate") {
    return `${video.title} is driving the strongest response rate at ${(video.engagementRate * 100).toFixed(1)}% engagement.`;
  }

  return `${video.title} is the monthly leader, pulling ${video.relativeViews.toFixed(1)}x the channel's average view count and contributing ${Math.round((video.views / Math.max(metrics.totalMonthlyViews, 1)) * 100)}% of this month's views.`;
}

function SparkBars({ data }) {
  if (!data.length) {
    return (
      <div className="flex h-44 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-sm text-slate-400">
        No videos to chart yet.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.views), 1);

  return (
    <div className="flex h-44 items-end gap-2 rounded-3xl border border-white/10 bg-white/5 p-4">
      {data.map((item) => (
        <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-2xl bg-gradient-to-t from-signal via-emerald-300 to-flare transition-all duration-500"
            style={{ height: `${Math.max(18, (item.views / maxValue) * 100)}%` }}
            title={`${item.title} - ${formatNumber(item.views)} views`}
          />
          <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
            {formatDate(item.publishedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{hint}</p>
    </div>
  );
}

function InsightCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{hint}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-white/10 bg-slate-950/30">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="grid grid-cols-12 items-center gap-3 px-4 py-4">
          <div className="col-span-6 flex items-center gap-3 sm:col-span-5">
            <div className="h-14 w-20 animate-pulse rounded-2xl bg-white/10" />
            <div className="w-full">
              <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-white/10" />
            </div>
          </div>
          <div className="col-span-2 hidden h-4 animate-pulse rounded bg-white/10 sm:block" />
          <div className="col-span-2 ml-auto h-4 w-16 animate-pulse rounded bg-white/10" />
          <div className="col-span-2 hidden ml-auto h-4 w-16 animate-pulse rounded bg-white/10 lg:block" />
          <div className="col-span-2 ml-auto h-4 w-16 animate-pulse rounded bg-white/10 sm:col-span-1" />
          <div className="col-span-2 ml-auto h-4 w-16 animate-pulse rounded bg-white/10 sm:col-span-1" />
        </div>
      ))}
    </div>
  );
}

function App() {
  const [channelInput, setChannelInput] = useState(DEFAULT_CHANNEL_URL);
  const [channel, setChannel] = useState(MOCK_CHANNEL);
  const [videos, setVideos] = useState(decorateVideos(MOCK_VIDEOS));
  const [status, setStatus] = useState("idle");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("impact");
  const [minimumViews, setMinimumViews] = useState("0");
  const [error, setError] = useState("");

  const filteredVideos = useMemo(() => {
    const threshold = Number(minimumViews || 0);

    return sortVideos(
      videos
        .filter((video) => video.views >= threshold)
        .filter((video) => video.title.toLowerCase().includes(query.toLowerCase())),
      sortBy,
    );
  }, [minimumViews, query, sortBy, videos]);

  const channelMetrics = useMemo(() => {
    const totalMonthlyViews = videos.reduce((sum, video) => sum + video.views, 0);
    const averageViews = videos.length ? Math.round(totalMonthlyViews / videos.length) : 0;
    const averageVelocity = videos.length
      ? Math.round(videos.reduce((sum, video) => sum + video.viewsPerDay, 0) / videos.length)
      : 0;
    const averageEngagementRate = videos.length
      ? videos.reduce((sum, video) => sum + video.engagementRate, 0) / videos.length
      : 0;

    return {
      totalMonthlyViews,
      averageViews,
      averageVelocity,
      averageEngagementRate,
      uploadCount: videos.length,
    };
  }, [videos]);

  useEffect(() => {
    void handleAnalyze(DEFAULT_CHANNEL_URL, true);
  }, []);

  async function handleAnalyze(value = channelInput, silent = false) {
    const parsed = parseChannelInput(value);

    if (!parsed) {
      setError("Paste a YouTube channel URL, handle, or channel name.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const analysis = await fetchChannelAnalysis(value);
      const nextVideos = decorateVideos(analysis.videos || []);

      setChannel(analysis.channel || MOCK_CHANNEL);
      setVideos(nextVideos);
      setStatus("live");
    } catch (nextError) {
      setStatus("mock");
      setChannel(MOCK_CHANNEL);
      setVideos(decorateVideos(MOCK_VIDEOS));
      setError(
        nextError.message ||
          "Something went wrong while fetching data. Falling back to demo data.",
      );
    } finally {
      if (!silent) {
        setChannelInput(value);
      }
    }
  }

  const winner = filteredVideos[0];
  const narrative = getNarrative(winner, channelMetrics, sortBy);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute left-[-10%] top-20 h-72 w-72 rounded-full bg-signal/20 blur-3xl" />
        <div className="absolute right-[-5%] top-40 h-72 w-72 rounded-full bg-flare/20 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-glow backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.36em] text-signal">VidMetrics</p>
              <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
                Competitor Radar
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Paste a YouTube channel and surface which uploads are actually winning this
                month by impact, velocity, and audience response.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <span className="font-semibold text-white">
                {status === "mock"
                  ? "Demo Mode"
                  : status === "live"
                    ? "Live API"
                    : "Analyzing"}
              </span>
              <span className="ml-2 text-slate-400">
                {status === "mock"
                  ? "Using polished sample data until the serverless API is configured."
                  : status === "live"
                    ? "Real channel data proxied through the serverless API."
                    : "Pulling the latest monthly uploads and ranking them."}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr,auto]">
            <label className="rounded-3xl border border-white/10 bg-black/20 p-2">
              <span className="sr-only">Channel URL</span>
              <input
                value={channelInput}
                onChange={(event) => setChannelInput(event.target.value)}
                placeholder="https://www.youtube.com/@example"
                className="w-full rounded-[1.3rem] bg-transparent px-4 py-4 text-base text-white outline-none placeholder:text-slate-500"
              />
            </label>
            <button
              onClick={() => void handleAnalyze()}
              disabled={status === "loading"}
              className="rounded-3xl bg-signal px-6 py-4 text-sm font-bold uppercase tracking-[0.24em] text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70"
            >
              {status === "loading" ? "Analyzing..." : "Analyze Channel"}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <img
                  src={channel.thumbnail}
                  alt={channel.title}
                  className="h-20 w-20 rounded-3xl object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">
                    Competitor Snapshot
                  </p>
                  <h2 className="mt-2 truncate text-2xl font-bold text-white">
                    {channel.title}
                  </h2>
                  <p className="mt-2 text-sm uppercase tracking-[0.24em] text-slate-500">
                    {channel.handle}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                    {channel.description || "No channel description available."}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Subscribers"
                  value={formatNumber(channel.subscribers)}
                  hint="Current audience size"
                />
                <StatCard
                  label="Monthly Views"
                  value={formatNumber(channelMetrics.totalMonthlyViews)}
                  hint="Across the last 31 days"
                />
                <StatCard
                  label="Avg Views"
                  value={formatNumber(channelMetrics.averageViews)}
                  hint="Per upload this month"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <InsightCard
                  label="Uploads"
                  value={String(channelMetrics.uploadCount)}
                  hint="Videos published this month"
                />
                <InsightCard
                  label="Avg Velocity"
                  value={formatNumber(channelMetrics.averageVelocity)}
                  hint="Views per day across uploads"
                />
                <InsightCard
                  label="Avg Engagement"
                  value={`${(channelMetrics.averageEngagementRate * 100).toFixed(1)}%`}
                  hint="Likes + comments relative to views"
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">
                    Why This Is Winning
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-white">
                    {winner ? winner.title : "No videos found"}
                  </h3>
                </div>
                <div className="rounded-2xl bg-signal/15 px-3 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.24em] text-signal">Impact</p>
                  <p className="text-xl font-bold text-white">
                    {winner ? formatNumber(winner.impactScore) : "--"}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300">{narrative}</p>

              {winner ? (
                <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Trend Signal
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{getTrendLabel(winner)}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InsightCard
                      label="Views / Day"
                      value={formatNumber(winner.viewsPerDay)}
                      hint="Upload velocity"
                    />
                    <InsightCard
                      label="Engagement"
                      value={`${(winner.engagementRate * 100).toFixed(1)}%`}
                      hint="Response rate"
                    />
                    <InsightCard
                      label="Above Avg"
                      value={`${winner.relativeViews.toFixed(1)}x`}
                      hint="Relative to channel baseline"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-6">
                <SparkBars data={filteredVideos.slice(0, 6)} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-glow backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">
                Monthly Video Breakdown
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Compare winners by view impact, velocity, and engagement quality
              </h2>
            </div>
            <button
              onClick={() => exportCsv(filteredVideos)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Export Ranked CSV
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr,0.9fr,0.7fr]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by title"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={minimumViews}
              onChange={(event) => setMinimumViews(event.target.value)}
              type="number"
              min="0"
              placeholder="Minimum views"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            Ranking mode:
            <span className="ml-2 font-semibold text-white">
              {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
            </span>
            <span className="ml-2 text-slate-400">
              {sortBy === "impact"
                ? "Blends views, daily velocity, and engagement to highlight the strongest overall performer."
                : sortBy === "velocity"
                  ? "Prioritizes fast-moving videos that are gaining views quickly after publish."
                  : sortBy === "engagementRate"
                    ? "Surfaces uploads getting the strongest audience response relative to their view count."
                    : "Keeps the most recent uploads at the top."}
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10">
            <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
              <div className="col-span-6 sm:col-span-4">Video</div>
              <div className="col-span-2 hidden sm:block">Published</div>
              <div className="col-span-2 text-right">Views</div>
              <div className="col-span-2 hidden text-right lg:block">Views / Day</div>
              <div className="col-span-2 text-right sm:col-span-1">Eng.</div>
              <div className="col-span-2 text-right sm:col-span-1">Rank</div>
            </div>

            {status === "loading" ? <LoadingRows /> : null}

            {status !== "loading" && filteredVideos.length === 0 ? (
              <div className="bg-slate-950/30 px-4 py-10 text-center">
                <p className="text-lg font-semibold text-white">No videos matched these filters.</p>
                <p className="mt-2 text-sm text-slate-400">
                  Lower the minimum views threshold or clear the title filter to widen the list.
                </p>
              </div>
            ) : null}

            {status !== "loading" && filteredVideos.length > 0 ? (
              <div className="divide-y divide-white/10 bg-slate-950/30">
                {filteredVideos.map((video, index) => (
                  <article
                    key={video.id}
                    className="grid grid-cols-12 items-center gap-3 px-4 py-4 transition hover:bg-white/[0.03]"
                  >
                    <div className="col-span-6 flex min-w-0 items-center gap-3 sm:col-span-4">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-14 w-20 rounded-2xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{video.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{getTrendLabel(video)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500 sm:hidden">
                          {formatDate(video.publishedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 hidden text-sm text-slate-300 sm:block">
                      {formatDate(video.publishedAt)}
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-white">
                      {formatNumber(video.views)}
                    </div>
                    <div className="col-span-2 hidden text-right text-sm text-slate-300 lg:block">
                      {formatNumber(video.viewsPerDay)}
                    </div>
                    <div className="col-span-2 text-right text-sm text-slate-300 sm:col-span-1">
                      {(video.engagementRate * 100).toFixed(1)}%
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-signal sm:col-span-1">
                      #{index + 1}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
