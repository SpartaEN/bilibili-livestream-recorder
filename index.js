'use strict';
const Logger = require('./libs/logger');
const Task = require('./libs/task');
const settings = require('./settings');

const logger = new Logger(settings);

const tasks = [];

settings.tasks.forEach((ele) => {
  const t = new Task(ele, logger);
  t.start();
  tasks.push(t);
});

// Exit without damaging files
process.on('SIGINT', () => {
  logger.warn(`Interrupt signal received, exiting...`);
  tasks.forEach((ele)=> {
    ele.stop();
  });
});
