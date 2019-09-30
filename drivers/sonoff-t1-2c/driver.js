"use strict";

const Homey = require("homey");
const model = "T1 2C";

class SonoffT12C extends Homey.Driver {
  onInit() {
    this.log("Sonoff T1 2C has been inited");
  }

  onPairListDevices(data, callback) {
    Homey.app.ewelinkApi
      .getDevices(model)
      .then(devices => callback(null, this.deviceList(devices)))
      .catch(() => callback(Homey.__("pair.no_devices_found")));
  }

  deviceList(devices) {
    let sortDevices = [];
    console.log(JSON.stringify(devices));
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
          fwVersion: device.params.fwVersion
        }
      };
      sortDevices.push(deviceList);
    }
    return sortDevices;
  }
}

module.exports = SonoffT12C;
