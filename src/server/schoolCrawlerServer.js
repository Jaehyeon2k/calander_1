const http = require("http");
const url = require("url");
const axios = require("axios");
const cheerio = require("cheerio");
const dayjs = require("dayjs");

const YJU_YEAR_SCHDUL_URL = "https://www.yju.ac.kr/schdulmanage/kr/3/yearSchdul.do"; 

const REQUEST_METHOD = "POST"; // "GET" 또는 "POST"

const PORT = 4100;

const cache = Object.create(null);

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function sendJson(res, statusCode, bodyObj) {
  const json = JSON.stringify(bodyObj);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(json);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(text);
}

function parseYearScheduleHtmlToEvents(html, targetYear) {
  const $ = cheerio.load(html);
  const events = [];

  const root = $("#timeTableList.yearSchdul");
  if (!root.length) return events;

  root.find("ul > li").each((_, li) => {
    const monthText = $(li).find("h3").first().text().trim(); // "1월"
    const monthMatch = monthText.match(/(\d{1,2})\s*월/);
    if (!monthMatch) return;

    const month = String(monthMatch[1]).padStart(2, "0");

    const dts = $(li).find("dl > dt");
    dts.each((idx, dt) => {
      const dtText = $(dt).find("span").text().replace(/\s+/g, " ").trim();
      const dateMatches = dtText.match(/\b(\d{2})-(\d{2})\b/g); // ["01-28","01-30"] or ["01-01"]
      if (!dateMatches || dateMatches.length < 1) return;

      const startMMDD = dateMatches[0]; // "01-28"
      const endMMDD = dateMatches.length >= 2 ? dateMatches[1] : null;

      const startDay = startMMDD.split("-")[1]; // "28"
      const start = `${targetYear}-${month}-${startDay}`;

      let end = null;
      if (endMMDD) {
        const endDay = endMMDD.split("-")[1];
        end = dayjs(`${targetYear}-${month}-${endDay}`).add(1, "day").format("YYYY-MM-DD");
      }

      const dd = $(dt).next("dd");
      const title = dd.find("a").first().text().replace(/\s+/g, " ").trim() || "학사일정";

      const id = `SCHOOL-${targetYear}-${month}-${startDay}-${title}`.replace(/\s+/g, "_");

      events.push({
        id,
        title,
        start,
        end,         // null 또는 YYYY-MM-DD (exclusive)
        allDay: true,
        scope: "SCHOOL",
      });
    });
  });

  return events;
}

async function fetchYearScheduleHtml(year) {
  if (!YJU_YEAR_SCHDUL_URL || YJU_YEAR_SCHDUL_URL.includes("<학교도메인>")) {
    throw new Error("YJU_YEAR_SCHDUL_URL을 실제 yearSchdul.do Request URL로 바꿔야 합니다.");
  }

  if (REQUEST_METHOD === "GET") {
    const res = await axios.get(YJU_YEAR_SCHDUL_URL, {
      params: { year },
      timeout: 15000,
    });
    return res.data;
  }

  const form = new URLSearchParams();
  form.set("year", String(year));

  const res = await axios.post(YJU_YEAR_SCHDUL_URL, form.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    timeout: 15000,
  });
  return res.data;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, time: new Date().toISOString() });
  }

  if (req.method === "GET" && pathname === "/api/school-events") {
    const year = Number(parsed.query.year || dayjs().year());
    const force = parsed.query.force === "1";

    const cached = cache[year];
    const now = Date.now();
    if (!force && cached && now - Date.parse(cached.fetchedAt) < CACHE_TTL_MS) {
      return sendJson(res, 200, {
        source: "cache",
        year,
        fetchedAt: cached.fetchedAt,
        events: cached.data,
      });
    }

    try {
      const html = await fetchYearScheduleHtml(year);
      const events = parseYearScheduleHtmlToEvents(html, year);

      cache[year] = { data: events, fetchedAt: new Date().toISOString() };

      return sendJson(res, 200, {
        source: "school",
        year,
        fetchedAt: cache[year].fetchedAt,
        events,
      });
    } catch (e) {
      return sendJson(res, 500, {
        error: true,
        message: e.message || String(e),
      });
    }
  }

  return sendText(res, 404, "Not Found");
});

server.listen(PORT, () => {
  console.log(`[schoolCrawler] http://localhost:${PORT}`);
  console.log(`[schoolCrawler] GET /api/school-events?year=2025`);
});
