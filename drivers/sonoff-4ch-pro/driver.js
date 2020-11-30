"use strict";

const Homey = require("homey");
const models = ["4CH Pro", "4CHPROR2"];

class Sonoff4CHPro extends Homey.Driver {
  onInit() {
    this.actions = {
      secondChannelOn: new Homey.FlowCardAction("secondChannelOn").register(),
      secondChannelOff: new Homey.FlowCardAction("secondChannelOff").register(),
      secondChannelToggle: new Homey.FlowCardAction("secondChannelToggle").register(),
      threeChannelOn: new Homey.FlowCardAction("threeChannelOn").register(),
      threeChannelOff: new Homey.FlowCardAction("threeChannelOff").register(),
      threeChannelToggle: new Homey.FlowCardAction("threeChannelToggle").register(),
      fourChannelOn: new Homey.FlowCardAction("fourChannelOn").register(),
      fourChannelOff: new Homey.FlowCardAction("fourChannelOff").register(),
      fourChannelToggle: new Homey.FlowCardAction("fourChannelToggle").register(),
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
          duration1channel: device.params.pulses[0].pulse,
          durationLimit1channel: parseFloat(device.params.pulses[0].width / 1000),
          duration2channel: device.params.pulses[1].pulse,
          durationLimit2channel: parseFloat(device.params.pulses[1].width / 1000),
          duration3channel: device.params.pulses[2].pulse,
          durationLimit3channel: parseFloat(device.params.pulses[2].width / 1000),
          duration4channel: device.params.pulses[3].pulse,
          durationLimit4channel: parseFloat(device.params.pulses[3].width / 1000),
        },
      };
      sortDevices.push(deviceList);
    }
    return sortDevices;
  }
}

module.exports = Sonoff4CHPro;
