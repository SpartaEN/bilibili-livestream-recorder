'use strict';

const childProcess = require('child_process');
const request = require('request');
const url = require('url');
const fs = require('fs');
/**
 * Task
 */
class Task {
  /**
   * Constructor
   * @param {object} options
   * @param {string} logger
   */
  constructor(options, logger) {
    const defaultOptions = {
      interval: 5,
      additionalFfmpegArguments: [],
      headers: {
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ` +
          `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 ` +
          `Safari/537.36`,
        'Content-Type': 'application/json',
      },
    };
    this._logger = logger;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._exec = null;
  }

  /**
   * Set interval
   * @param {number} interval
   */
  set interval(interval) {
    this._options.interval = interval;
  }

  /**
   * Set additional ffmpeg arguments
   * @param {array} args
   */
  set additionalFfmpegArguments(args) {
    this._options.additionalFfmpegArguments = args;
  }

  /**
   * Bilibili API reuqest entrance
   */
  requestForStatus() {
    if (this._options.type === 'space') {
      this.requestViaSpace();
    } else if (this._options.type === 'live') {
      this.requestViaLiveroom();
    } else {
      this._logger.error(`${this._options.type}-${this._options.id} ` +
        `Bad config 'type'`);
    }
  }

  /**
   * API caller
   * @param {string} url URL
   * @param {object} options Options
   * @return {Promise} A promise
   */
  callAPI(url, options) {
    return new Promise((resolve, reject) => {
      request.get(url, options, (err, res, body) => {
        if (err) {
          reject(err);
        } else {
          if (res.statusCode !== 200) {
            reject(new Error(`API returned with code ${res.statusCode} ` +
              `${body}`));
          } else {
            try {
              const data = JSON.parse(body);
              if (data.code != 0) {
                reject(new Error(`API returned a bad status code ` +
                  `${data.code} ${data.message}`));
              } else {
                resolve(data.data);
              }
            } catch (e) {
              reject(new Error(`Error when parsing response data ${body}`));
            }
          }
        }
      });
    });
  }

  /**
   * Request for live room
   */
  async requestViaSpace() {
    try {
      const data = await this.callAPI(`https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld`, {
        qs: {
          mid: this._options.id,
          jsonp: 'jsonp',
        },
        headers: this._options.headers,
        timeout: 5000,
      });
      if (data.roomStatus == 1) {
        if (data.liveStatus == 1) {
          this._logger.info(`${this._options.type}-` +
            `${this._options.id} Found live room with id ` +
            `${data.roomid} on air`);
          this.requestStreamUrl(data.roomid);
        } else {
          this._logger.debug(`${this._options.type}-` +
            `${this._options.id} Found live room with id ` +
            `${data.roomid} but not on air`);
        }
      } else {
        this._logger.debug(`${this._options.type}-` +
          `${this._options.id} Live room not found`);
      }
    } catch (e) {
      this._logger.error(`${this._options.type}-${this._options.id} ` +
        `${e.message}`);
    }
  }

  /**
   * Request live room status
   */
  async requestViaLiveroom() {
    try {
      const data = await this.callAPI(`https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom`, {
        qs: {
          room_id: this._options.id,
        },
        headers: this._options.headers,
        timeout: 5000,
      });
      if (data.room_info.live_status == 1) {
        this._logger.info(`${this._options.type}-` +
          `${this._options.id} Found live room with id ` +
          `${data.room_info.room_id} on air`);
        this.requestStreamUrl(data.room_info.room_id);
      } else {
        this._logger.debug(`${this._options.type}-` +
          `${this._options.id} Found live room with id ` +
          `${data.room_info.room_id} but not on air`);
      }
    } catch (e) {
      this._logger.error(`${this._options.type}-${this._options.id} ` +
        `${e.message}`);
    }
  }

  /**
   * Request HLS url and attempt to download
   * @param {number} id Liveroom ID
   * @param {number} q Livestream quality
   */
  async requestStreamUrl(id, q = 0) {
    try {
      const data = await this.callAPI(`https://api.live.bilibili.com/room/v1/Room/playUrl`, {
        qs: {
          cid: id,
          platform: this._options.hls === true ? 'h5' : 'web',
          otype: 'json',
          quality: q,
        },
        headers: this._options.headers,
        timeout: 5000,
      });
      if (data.current_quality != data.accept_quality[0]) {
        this.requestStreamUrl(id, data.accept_quality[0]);
      } else {
        const surl = data.durl[0].url;
        this._checkpoint = Number.parseInt(url.parse(surl, {
          parseQueryString: true,
        }).query.wsTime);
        this.execFfmpeg(surl);
      }
    } catch (e) {
      this._logger.error(`${this._options.type}-${this._options.id} ` +
        `${e.message}`);
    }
  }

  /**
   * Fireup ffmpeg to download the video
   * @param {string} url HLS url
   */
  execFfmpeg(url) {
    // TODO: Add custom destination and filename
    const dst = `${process.env.DATA_DIR}/records/${this._options.type}-` +
      `${this._options.id}-${new Date().getTime()}.mp4`;
    this._logger.info(`${this._options.type}-${this._options.id} ` +
      `Downloading live stream`);
    const args = [
      '-user_agent', this._options.headers['User-Agent'], '-i', url,
    ].concat(this._options.additionalFfmpegArguments, dst);
    this._exec = childProcess.execFile('ffmpeg', args,
        (err, stdout, stderr) => {
          if (err) {
            const msg = err.message;
            // Sometimes, server responds 404 but API reports livestream is open
            if (msg.includes(`HTTP error 404 Not Found`)) {
              this._logger.debug(`${this._options.type}-` +
              `${this._options.id} ${err.message}`);
              this._logger.warn(`${this._options.type}-` +
              `${this._options.id} Seems not ready for streaming or ` +
              `just finished streaming`);
            } else if (msg.includes(`Exiting normally, received signal 2.`)) {
              this._logger.warn(`${this._options.type}-` +
              `${this._options.id} Exited normally`);
              fs.writeFileSync(`${process.env.DATA_DIR}/logs/` +
              `${this._options.type}-${this._options.id}-` +
              `${new Date().getTime()}.log`, err);
            } else if (msg.includes(`HTTP error 475`)) {
              this._logger.warn(`${this._options.type}-` +
              `${this._options.id} Server returened code 475, keep retrying`);
            } else {
              this._logger.error(`${this._options.type}-` +
              `${this._options.id} ${err.message}`);
              fs.writeFileSync(`${process.env.DATA_DIR}/logs/` +
              `${this._options.type}-${this._options.id}-` +
              `${new Date().getTime()}.log`, err);
            }
          } else {
          // On most cases, ffmpeg won't return 0 unless a stop signal given
            fs.writeFileSync(`${process.env.DATA_DIR}/logs/` +
            `${this._options.type}-${this._options.id}-` +
            `${new Date().getTime()}.log`, stderr);
          }
        });
  }

  /**
   * Start monitor
   */
  start() {
    this._timer = setInterval(() => {
      // Only judge by ffmpeg exit code to make it easier to control
      if (this._exec === null || this._exec.exitCode !== null) {
        this.requestForStatus();
      }
    }, this._options.interval * 1000);
    this._logger.info(`Starting recorder for ${this._options.type}-` +
      `${this._options.id}`);
  }

  /**
   * Stop monitor
   */
  stop() {
    this.stopMonitor();
    this.stopRecorder();
  }

  /**
   * Stop monitor
   */
  stopMonitor() {
    clearInterval(this._timer);
    this._logger.warn(`Stopping monitor for ${this._options.type}-` +
      `${this._options.id}`);
  }

  /**
   * Stop recorder
   */
  stopRecorder() {
    if (this._exec !== null && this._exec.exitCode === null) {
      this._exec.stdin.write('q');
      this._logger.warn(`Stopping recording task for ${this._options.type}-` +
        `${this._options.id}`);
    }
  }
}

module.exports = Task;
