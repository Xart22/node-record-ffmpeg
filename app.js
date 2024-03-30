const express = require("express");
const { spawn } = require("child_process");
const app = express();
const port = 8081;
const { getCctv, findCctv } = require("./database");
const fs = require("fs");
const cron = require("node-cron");

const ffmpegProcesses = [];

cron.schedule("0 0 0 * *", async () => {
  // stop all ffmpeg processes
  await stopService();
  // set ffmpegProcesses to empty array
  ffmpegProcesses.length = 0;
  // start all ffmpeg processes
  await startService();
});

app.listen(port, async () => {
  await startService();
});

app.get("/stop/:id", (req, res) => {
  const id = req.params.id;
  const process = ffmpegProcesses.find((process) => process.id == id);

  if (process) {
    process.process.stdin.write("q");
    console.log("Process stopped for cctv: ", process.chanel_name);
    return res.send("Process stopped");
  }
  console.log("Process not found");
  return res.send("Process not found");
});

app.get("/start/:id", async (req, res) => {
  const id = req.params.id;
  const cctv = ffmpegProcesses.find((cctv) => cctv.id == id);
  if (cctv) {
    const title = `title='${cctv.chanel_name}'`;
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const time = Date.now();
    const fileName = `recorded_${cctv.chanel_name}_${day}-${month}-${year}_${time}.mp4`;
    cctv.process = spawn("cmd", [
      "/c",
      "C:\\ffmpeg\\bin\\ffmpeg.exe",
      "-i",
      cctv.rtsp_url,
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
    console.log("Process started for cctv: ", cctv.chanel_name);
    return res.send("Process started");
  } else {
    const db = await findCctv(id);
    if (db) {
      const title = `title="${db.chanel_name}"`;
      const date = new Date();
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const time = Date.now();
      const fileName = `recorded_${db.chanel_name}_${day}-${month}-${year}_${time}.mp4`;
      ffmpegProcesses.push({
        id: db.id,
        process: spawn("cmd", [
          "/c",
          "C:\\ffmpeg\\bin\\ffmpeg.exe",
          "-i",
          db.rtsp_url,
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
        ]),
        chanel_name: db.chanel_name,
      });
      console.log("Process started for cctv: ", db.chanel_name);
      return res.send("Process started");
    }
  }
});

const startService = async () => {
  console.log("Starting service");
  console.log("Count processes: ", ffmpegProcesses.length);
  console.log(`Server is running on port ${port}`);
  let data = await getCctv();
  data.map((cctv) => {
    const title = `title="${cctv.chanel_name}"`;
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const time = Date.now();
    const fileName = `recorded_${cctv.chanel_name}_${day}-${month}-${year}_${time}.mp4`;
    ffmpegProcesses.push({
      id: cctv.id,
      process: spawn("cmd", [
        "/c",
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        "-i",
        cctv.rtsp_url,
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
      ]),
      chanel_name: cctv.chanel_name,
    });
  });
  ffmpegProcesses.map((cctv) => {
    console.log("Process started for cctv id: ", cctv.chanel_name);
  });
};

const stopService = async () => {
  ffmpegProcesses.map((cctv) => {
    cctv.process.stdin.write("q");
    console.log("Process stopped for cctv id: ", cctv.chanel_name);
  });
};
