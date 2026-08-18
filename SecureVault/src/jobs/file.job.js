const fileQueue = require("../queues/file.queue");

const fileJob = {
    async process(data) {
        return await fileQueue.add("file-processing", data);
    }
};

module.exports = fileJob;
