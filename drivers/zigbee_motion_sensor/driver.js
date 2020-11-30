"use strict";

const Homey = require("homey");
const models = ["ZIGBEE_MOBILE_SENSOR"];

class ZigbeeMotionSensor extends Homey.Driver {
  async onPairListDevices(data, callback) {
    await Homey.app.ewelinkApi
      .getDevices()
      .then((devices) => {
        callback(null, this.deviceList(devices.filter((device) => models.includes(device.productModel))));
      })
      .catch((error) => callback(new Error(error)));
  }

  deviceList(devices) {
    let sortDevices = [];

    for (var device of devices) {
      let deviceList = {
        name: device.productModel + " " + device.name,
        data: {
          deviceid: device.deviceid,
          apikey: device.apikey,
          uiid: device.extra.uiid,
        },
        settings: {
          brandName: device.brandName,
          model: device.productModel,
        },
      };
      sortDevices.push(deviceList);
    }
    return sortDevices;
  }
}

module.exports = ZigbeeMotionSensor;
