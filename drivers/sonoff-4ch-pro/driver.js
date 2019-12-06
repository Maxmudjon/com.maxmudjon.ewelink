"use strict";

const Homey = require("homey");
const model = "4CH Pro";

class Sonoff4CHPro extends Homey.Driver {
  async onPairListDevices(data, callback) {
    await Homey.app.ewelinkApi
      .getDevices()
      .then(devices => {
        if (devices.msg == "params incomplete") {
          callback(new Error("Please try again"));
          return;
        } else if (devices.msg == "Authentication error") {
          callback(new Error("Please login to the plugin settings"));
          return;
        } else if (devices.msg == '{"oauth_authorise":"tokenInfo is not exit:d9491c1aa638d7d12e65b3e6a46c247d0aa67d28"}') {
          callback(new Error("Please restart plugin"));
          return;
        } else {
          callback(null, this.deviceList(devices.filter(device => device.productModel == model)));
        }
      })
      .catch(error => callback(new Error(error)));
  }

  deviceList(devices) {
    let sortDevices = [];

    for (var device of devices) {
      let deviceList = {
        name: device.productModel + " " + device.name,
        data: {
          deviceid: device.deviceid,
          apikey: device.apikey,
          extra: device.extra.extra
        },
        settings: {
          brandName: device.brandName,
          model: device.productModel,
          ip: device.ip,
          mac: device.params.staMac,
          fwVersion: device.params.fwVersion,
          powerResponse: device.params.startup,
          networkLed: device.params.sledOnline,
          duration1channel: device.params.pulses[0].pulse,
          durationLimit1channel: parseFloat(device.params.pulses[0].width / 1000),
          duration2channel: device.params.pulses[1].pulse,
          durationLimit2channel: parseFloat(device.params.pulses[1].width / 1000),
          duration3channel: device.params.pulses[2].pulse,
          durationLimit3channel: parseFloat(device.params.pulses[2].width / 1000),
          duration4channel: device.params.pulses[3].pulse,
          durationLimit4channel: parseFloat(device.params.pulses[3].width / 1000)
        }
      };
      sortDevices.push(deviceList);
    }
    return sortDevices;
  }
}

module.exports = Sonoff4CHPro;
