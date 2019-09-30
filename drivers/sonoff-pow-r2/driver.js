"use strict";

const Homey = require("homey");
const model = "Pow_R2";

class MyDriver extends Homey.Driver {
  onInit() {
    this.log("MyDriver has been inited");
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
        }
      };
      sortDevices.push(deviceList);
    }
    return sortDevices;
  }
}

module.exports = MyDriver;
