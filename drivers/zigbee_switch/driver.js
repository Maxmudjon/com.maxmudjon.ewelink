"use strict";

const Homey = require("homey");
const models = ["zigbee_ON_OFF_SWITCH_1000"];

class ZigbeeSwitch extends Homey.Driver {
  onInit() {
    this.triggers = {
      click: new Homey.FlowCardTriggerDevice("click_switch").register(),
      double_click: new Homey.FlowCardTriggerDevice("double_click_switch").register(),
      long_press: new Homey.FlowCardTriggerDevice("long_press_switch").register(),
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
        },
      };
      sortDevices.push(deviceList);
    }
    return sortDevices;
  }
}

module.exports = ZigbeeSwitch;
