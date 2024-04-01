const express = require("express");
const { spawn } = require("child_process");
const app = express();
const port = 8081;
const { getCctv, findCctv } = require("./database");
const cron = require("node-cron");

const ffmpegProcesses = [];

// Cron job untuk memulai ulang layanan pada pukul 00:00 setiap hari
cron.schedule("0 0 * * *", async () => {
  await restartService();
});

app.listen(port, async () => {
  await startService();
});

app.get("/stop/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await stopFFmpegProcess(id);
    res.send("Process stopped");
  } catch (error) {
    console.error("Error stopping process:", error);
    res.status(500).send("Error stopping process");
  }
});

app.get("/start/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const cctv = await startFFmpegProcess(id);
    if (cctv) {
      res.send("Process started");
    } else {
      res.send("Process not found");
    }
  } catch (error) {
    console.error("Error starting process:", error);
    res.status(500).send("Error starting process");
  }
});

const startService = async () => {
  console.log("Starting service");
  console.log("Count processes: ", ffmpegProcesses.length);
  console.log(`Server is running on port ${port}`);
  try {
    const data = await getCctv();
    for (const cctv of data) {
      await startFFmpegProcess(cctv.id);
    }
  } catch (error) {
    console.error("Error starting service:", error);
  }
};

const restartService = async () => {
  console.log("Restarting service");
  try {
    await stopService();
    await startService();
  } catch (error) {
    console.error("Error restarting service:", error);
  }
};

const startFFmpegProcess = async (id) => {
  const cctv = ffmpegProcesses.find((c) => c.id == id);
  if (!cctv) {
    try {
      const cctvData = await findCctv(id);
      if (cctvData) {
        const { id, chanel_name, rtsp_url } = cctvData;
        const title = `title="${chanel_name}"`;
        const date = new Date();
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const time = Date.now();
        const fileName = `recorded_${chanel_name}_${day}-${month}-${year}_${time}.mp4`;
        const process = spawn("cmd", [
          "/c",
          "C:\\ffmpeg\\bin\\ffmpeg.exe",
          "-i",
          rtsp_url,
          "-reconnect",
          "1",
          "-metadata",
          title,
          "-r",
          "15",
          "-c:v",
          "libx264",
          "-b:v",
          "500k",
          "-preset",
          "veryfast",
          "-crf",
          "40",
          "-an",
          fileName,
        ]);
        ffmpegProcesses.push({ id, process, chanel_name });
        console.log("Process started for cctv: ", chanel_name);
        return cctvData;
      } else {
        console.log("CCTV not found");
        return null;
      }
    } catch (error) {
      console.error("Error starting FFmpeg process:", error);
      throw error;
    }
  }
  console.log("Process already started for cctv: ", cctv.chanel_name);
  return cctv;
};

const stopFFmpegProcess = async (id) => {
  const index = ffmpegProcesses.findIndex((c) => c.id == id);
  if (index !== -1) {
    try {
      const cctv = ffmpegProcesses[index];
      cctv.process.stdin.write("q");
      ffmpegProcesses.splice(index, 1);
      console.log("Process stopped for cctv: ", cctv.chanel_name);
    } catch (error) {
      console.error("Error stopping FFmpeg process:", error);
      throw error;
    }
  } else {
    console.log("Process not found");
  }
};

const stopService = async () => {
  try {
    for (const cctv of ffmpegProcesses) {
      cctv.process.stdin.write("q");
      console.log("Process stopped for cctv: ", cctv.chanel_name);
    }
  } catch (error) {
    console.error("Error stopping service:", error);
    throw error;
  } finally {
    ffmpegProcesses.length = 0; // Bersihkan array setelah proses dihentikan
  }
};
