"use strict";
const Homey = require("homey");

module.exports = [
  {
    method: "POST",
    path: "/getDevices",
    fn: function(args, callback) {
      Homey.app
        .getDevices(args)
        .then(res => {
          callback(null, res);
        })
        .catch(error => {
          callback(error, null);
        });
    }
  }
];
