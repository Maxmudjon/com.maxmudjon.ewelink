"use strict";

const Homey = require("homey");
const model = "Sonoff SC";

class SonoffSC extends Homey.Device {
  onInit() {
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.registerStateChangeListener();
    this.registerCapabilities();
    this.log("[" + model + "] [" + this.data.deviceid + "] [" + this.getName() + "] has been inited");
    setTimeout(() => {
      this.getParams();
    }, 5000);
  }

  registerCapabilities() {
    this.registerToggle("onoff");
  }

  getParams() {
    this.interval = setInterval(() => {
      Homey.app.ewelinkApi
        .getDevice(this.data.deviceid)
        .then(device => {
          if (device.online) {
            this.setAvailable();
            if (device.params.dusty) this.updateCapabilityValue("measure_pm25", parseInt(device.params.dusty));
            if (device.params.noise) this.updateCapabilityValue("measure_noise", parseInt(device.params.noise));
            if (device.params.light) this.updateCapabilityValue("measure_luminance", parseInt(device.params.light));
            if (device.params.temperature) this.updateCapabilityValue("measure_temperature", parseFloat(device.params.temperature));
            if (device.params.humidity) this.updateCapabilityValue("measure_humidity", parseFloat(device.params.humidity));
            this.setSettings({
              brandName: device.brandName,
              model: device.productModel,
              ip: device.ip,
              fwVersion: device.fwVersion
            }).catch(error => this.log(error));
          } else {
            this.setUnavailable(Homey.__("Device offline"));
          }
        })
        .catch(error => this.log(error));
    }, 1000);
  }

  handleStateChange(device) {
    clearInterval(this.interval);
    this.interval = setInterval(() => {
      Homey.app.ewelinkApi
        .getDevices(model)
        .then(device => {
          let someDevice = device.filter(device => device.deviceid === this.data.deviceid);
          if (someDevice[0].online) {
            this.setAvailable();
            this.setSettings({
              brandName: someDevice[0].brandName,
              model: someDevice[0].productModel,
              ip: someDevice[0].ip,
              fwVersion: someDevice[0].fwVersion
            }).catch(error => this.log(error));
          } else {
            this.setUnavailable(Homey.__("Device offline"));
          }
        })
        .catch(error => this.log(error));
    }, 60 * 60 * 1000);
    if (device.params) {
      /*
				Sound level
				quiet - for values from 0.00 to 3.00
				normal - for values from 3.01 to 6.00
				noisy - for values from 6.01 to 10.00

				Light intensity
				bright - for values from 0.00 to 4.00
				normal - for values from 4.01 to 8.00
				dusky - for values from 8.01 to 10.00

				Dust level or Air quality level
				good - for values from 0.00 to 4.00
				moderate - for values from 4.01 to 7.00
				unhealthy - for values from 7.01 to 10.00
			*/
      if (device.params.dusty) this.updateCapabilityValue("measure_pm25", parseInt(device.params.dusty));
      if (device.params.noise) this.updateCapabilityValue("measure_noise", parseInt(device.params.noise));
      if (device.params.light) this.updateCapabilityValue("measure_luminance", parseInt(device.params.light));
      if (device.params.temperature) this.updateCapabilityValue("measure_temperature", parseFloat(device.params.temperature));
      if (device.params.humidity) this.updateCapabilityValue("measure_humidity", parseFloat(device.params.humidity));
      if (device.brandName)
        this.setSettings({
          brandName: device.brandName,
          model: device.productModel,
          ip: device.ip,
          fwVersion: device.params.fwVersion
        }).catch(error => this.log(error));
    }
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.deviceid + "]" + " [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch(error => {
          this.log("[" + this.data.deviceid + "]" + " [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  registerToggle(name) {
    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };
    this.registerCapabilityListener(name, async value => {
      Homey.app.ewelinkApi.setPowerState(data, value);
    });
  }

  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(`${this.data.deviceid}`, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(`${this.data.deviceid}`, this.handleStateChange);
  }
}

module.exports = SonoffSC;
