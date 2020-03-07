'use strict';
const fs = require('fs');
/**
 * Main Logger
 */
class Logger {
  /**
   * Constructor
   * @param {*} settings User settings
   */
  constructor(settings) {
    this.console = settings.logtoconsole;
    this.verbose = settings.debug;
    this.filepath = `${settings.datadir}/logs/${settings.logfile}`;
  }

  /**
   * Output debug info
   * @param {boolean} verbose
   */
  set verbose(verbose) {
    this._verbose = verbose;
  }

  /**
   * Output to file
   * @param {string} filepath
   */
  set filepath(filepath) {
    if (filepath === '') return;
    try {
      this._filestream = fs.createWriteStream(filepath, {
        flags: 'a',
      });
      this._file = true;
    } catch (e) {
      this.error(`Failed to open log file for writing.`);
      this.error(e);
      process.exit(1);
    }
  }

  /**
   * Log to console
   * @param {boolean} console
   */
  set console(console) {
    this._console = true;
  }

  /**
   * Info logging
   * @param {string} message Message
   */
  info(message) {
    this.log('INFO', message);
  }

  /**
   * Debug logging
   * @param {string} message Message
   */
  debug(message) {
    if (this._verbose) {
      this.log('DEBUG', message);
    }
  }

  /**
   * Warning logging
   * @param {string} message
   */
  warn(message) {
    this.log('WARN', message);
  }

  /**
   * Error logging
   * @param {string} message
   */
  error(message) {
    this.log('ERROR', message);
  }

  /**
   * Log writer
   * @param {string} level
   * @param {string} message
   */
  log(level, message) {
    const time = new Date().toISOString();
    if (this._file) {
      this._filestream.write(`[${time}][${level}]: ${message}\n`);
    }
    if (this._console) {
      console.log(`[${time}][${level}]: ${message}`);
    }
  }
}

module.exports = Logger;
