import express from "express";
import axios from "axios";
import { JSDOM } from "jsdom";
import crypto from "crypto";

const app = express();
app.use(express.json());

const PORT = 3000;

/**
 * تولید رشته تصادفی مشابه PHP
 */
function generateRandomString(length = 10) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * ارسال پاسخ JSON با اطلاعات نویسنده
 */
function sendJsonResponse(res, data, statusCode = 200) {
  res.status(statusCode).json({
    ...data,
    developer: {
      name: "Ehsan Fazli",
      telegram: "@abj0o",
    },
  });
}

/**
 * Route اصلی
 */
app.get("/api", async (req, res) => {
  const tiktokUrl = req.query.url?.trim();

  if (!tiktokUrl) {
    return sendJsonResponse(res, {
      success: false,
      error: "لطفاً یک URL تیک‌تاک از طریق پارامتر 'url' ارسال کنید.",
    }, 400);
  }

  const timestamp = Date.now();
  const randomR = generateRandomString(10);
  const apiUrl = `https://tiktokio.com/api/v1/tk-htmx?t=${timestamp}&r=${randomR}`;
  const prefixValue = "dtGslxrcdcG9raW8uY29t";

  // درخواست اولیه GET برای دریافت کوکی‌ها
  try {
    await axios.get("https://tiktokio.com/", {
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "fa-IR,fa;q=0.9,en-GB;q=0.8,en;q=0.7,en-US;q=0.6",
        "Sec-Ch-Ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      },
      timeout: 30000,
    });
  } catch (err) {
    return sendJsonResponse(res, {
      success: false,
      error: "خطای درخواست اولیه GET: " + err.message,
    }, 502);
  }

  // POST request به API
  try {
    const postData = new URLSearchParams({
      prefix: prefixValue,
      vid: tiktokUrl,
    }).toString();

    const apiResponse = await axios.post(apiUrl, postData, {
      headers: {
        "Accept": "*/*",
        "Accept-Language": "fa-IR,fa;q=0.9,en-GB;q=0.8,en;q=0.7,en-US;q=0.6",
        "Content-Type": "application/x-www-form-urlencoded",
        "Hx-Current-Url": "https://tiktokio.com/",
        "Hx-Request": "true",
        "Hx-Target": "tiktok-parse-result",
        "Hx-Trigger": "search-btn",
        "Origin": "https://tiktokio.com",
        "Referer": "https://tiktokio.com/",
        "Sec-Ch-Ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      },
      timeout: 30000,
    });

    const html = apiResponse.data;
    if (!html || apiResponse.status !== 200) {
      return sendJsonResponse(res, {
        success: false,
        error: `خطا در دریافت اطلاعات از API. کد HTTP: ${apiResponse.status}`,
        response_sample: html?.substring(0, 200),
      }, 502);
    }

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const links = {};
    const anchorNodes = document.querySelectorAll("a[href*='dl.tiktokio.com/download']");
    anchorNodes.forEach((a) => {
      const href = a.href.startsWith("//") ? "https:" + a.href : a.href;
      const text = a.textContent.trim();
      if (href.includes("&p=" + encodeURIComponent(prefixValue)) || (text.includes("Mp3") && href.includes("&sf=.mp3"))) {
        if (!links[text]) links[text] = [];
        if (!links[text].includes(href)) links[text].push(href);
      }
    });

    if (Object.keys(links).length === 0) {
      return sendJsonResponse(res, {
        success: false,
        error: "هیچ لینک دانلودی پیدا نشد یا فرمت پاسخ تغییر کرده است.",
      }, 404);
    }

    sendJsonResponse(res, {
      success: true,
      data: links,
    });

  } catch (err) {
    return sendJsonResponse(res, {
      success: false,
      error: "خطای POST به API: " + err.message,
    }, 502);
  }
});

/**
 * شروع سرور
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
