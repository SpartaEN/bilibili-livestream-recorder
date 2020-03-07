'use strict';
const settings = {
  debug: false,
  datadir: __dirname+'/data',
  logfile: 'main.log',
  logtoconsole: true,
  tasks: [
    {
      // 'space' for ueer space id and 'live' for liveroom id
      type: 'space',
      id: '',
      // Use HLS for downloading (Because of WS time limit,
      // live recording may split into several files) EXPERIMENTAL!
      hls: false,
      // API call interval
      interval: 5,
      // Additional ffmpeg params
      additionalFfmpegArguments: [
        // Copy video stream to reduce CPU usage, may cause more disk usage.
        // DO NOT CHANGE THIS unless you know what you're doing.
        '-y', '-vcodec', 'copy', '-acodec', 'copy',
      ],
    },
  ],
};

module.exports = settings;
