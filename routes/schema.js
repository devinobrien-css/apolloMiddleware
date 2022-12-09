const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    key: String, //this composite key will be composed of user email, projectID, and date delimited with commas
    email: String, //unique employee identifier [derived attribute]
    projectId: String, //unique project identifier [derived attribute]
    date: String, //unique date identifier [derived attribute]
    onClockObjects: [{
        startTime: String,
        stopTime: String,
        totalHours: Number, //[derived attribute]
        description: String
    } ]
})


module.exports = mongoose.model("payroll", schema)