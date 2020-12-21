const electron = require("electron");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const fs = require("fs");
const path = require("path");
const Store = require("./config.js");
const ytdl = require("ytdl-core");

ffmpeg.setFfmpegPath(ffmpegPath); // ffmpeg is a built-in package and needs its path manually set
const downloadBtn = document.getElementById("download-btn");
const store = new Store({
  configName: "user-settings",
  defaults: {
    savePath: electron.remote.app.getPath("downloads"),
  },
});

/**
 * Removes characters deemed illegal for usage in file naming
 * @param {string} filepath The file path that needs to be parsed
 * @returns {string} A legal string
 */
let removeIllegalChars = (filepath) => {
  const illegal = /[\\/:*?\"<>|]/g;
  if (illegal.test(filepath)) {
    let newPath = filepath.replace(illegal, "");
    return newPath;
  } else {
    return filepath;
  }
};

/**
 * Removes any extra info after the watch ID in a YouTube link
 * @param {string} url The URL to be parsed
 * @returns {string} A link with only the watch ID attached
 */
let removeExtraYTInfo = (url) => {
  if (/&/.test(url)) {
    return url.split("&")[0];
  } else {
    return url;
  }
};


let saveFile = (save_path, url) => {
  let stream = ytdl(url, { filter: 'audioonly' });
  let output = ffmpeg(stream).save(save_path);

  Promise.all([stream, output]).then((values) => {
    console.log('done!');
  }).catch((err) => {
    console.error(err);
  })
}

/**
 * Downloads a YouTube video
 * @param {string} url URL
 * @param {HTMLElement} status A p element to show the status of the download
 * @param {string} file_name File name
 * @param {Store} store Settings storage object
 */
let download = async (url, status, file_name, store) => {
  url = removeExtraYTInfo(url);
  status.style.color = "gray";
  status.innerHTML = "Checking URL...";
  // Not all of the errors reject promises, some are just thrown
  try {
    await ytdl.getBasicInfo(url).then((info) => {
      if (file_name.trim().length != 0) {
        file_name = removeIllegalChars(file_name);
      } else {
        file_name = info.videoDetails.title;
      }
      console.log(file_name);
    });
  } catch (err) {
    console.error(err);
    status.innerHTML = "Error: ";
    status.style.color = "#e01400";
    if (/ENOTFOUND/.test(err.message)) {
      status.innerHTML += "Invalid URL. Check your internet connection";
    } else {
      status.innerHTML += err.message;
    }
  }
  let save_path = path.join(store.get('savePath'), file_name);
  saveFile(save_path, url);
};

downloadBtn.addEventListener("click", (event) => {
  let status = document.getElementById("status"),
    url = document.getElementById("url-box").value,
    file_name = document.getElementById("name-box").value;

  download(url, status, file_name, store);
});

// Pressing Enter clicks the download button
[
  document.getElementById("url-box"),
  document.getElementById("name-box"),
].forEach((input) => {
  input.addEventListener("keyup", (event) => {
    if (event.key == "Enter") {
      event.preventDefault();
      downloadBtn.click();
    }
  });
});
