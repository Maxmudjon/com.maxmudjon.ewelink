"use strict";

const Homey = require("homey");
const models = ["2.0-led"];

class ABC20LED extends Homey.Driver {
  onInit() {
    this.actions = {
      setRGBMode: new Homey.FlowCardAction("setRGBMode").register(),
    };
  }

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
          mac: device.params.staMac,
          fwVersion: device.params.fwVersion,
          powerResponse: device.params.startup,
          networkLed: device.params.sledOnline,
        },
      };
      sortDevices.push(deviceList);
    }
    return sortDevices;
  }
}

module.exports = ABC20LED;
