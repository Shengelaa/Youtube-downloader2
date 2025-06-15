const express = require("express");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

ffmpeg.setFfmpegPath(ffmpegPath);
app.use(cors());

// ✅ Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// ✅ Optional: fallback to index.html if someone visits root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ YouTube download endpoint
app.get("/download", async (req, res) => {
  const videoURL = req.query.url;
  const format = req.query.format || "mp4";

  if (!videoURL || !ytdl.validateURL(videoURL)) {
    return res.status(400).json({ error: "Invalid or missing YouTube URL" });
  }

  if (!["mp3", "mp4"].includes(format)) {
    return res
      .status(400)
      .json({ error: "Invalid format. Use 'mp3' or 'mp4'." });
  }

  try {
    const info = await ytdl.getInfo(videoURL);
    const title = info.videoDetails.title
      .replace(/[^\w\s]/gi, "")
      .substring(0, 50);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${title}.${format}"`
    );

    const stream = ytdl(videoURL, { quality: "highestaudio" });

    if (format === "mp3") {
      ffmpeg(stream)
        .audioBitrate(128)
        .toFormat("mp3")
        .on("error", (err) => {
          console.error("FFmpeg error:", err.message);
          res.status(500).json({ error: "Failed to convert to MP3" });
        })
        .pipe(res, { end: true });
    } else {
      ytdl(videoURL, { quality: "highestvideo" }).pipe(res);
    }
  } catch (error) {
    console.error("Download error:", error.message);
    return res.status(500).json({ error: "Failed to process video" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
