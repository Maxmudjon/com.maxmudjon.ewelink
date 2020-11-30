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
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      if (device.params.dusty) this.updateCapabilityValue("measure_pm25", parseInt(device.params.dusty));
      if (device.params.noise) this.updateCapabilityValue("measure_noise", parseInt(device.params.noise));
      if (device.params.light) this.updateCapabilityValue("measure_luminance", parseInt(device.params.light));
      if (device.params.temperature) this.updateCapabilityValue("measure_temperature", parseFloat(device.params.temperature));
      if (device.params.humidity) this.updateCapabilityValue("measure_humidity", parseFloat(device.params.humidity));
    }
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.deviceid + "]" + " [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.deviceid + "]" + " [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(this.data.deviceid, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(this.data.deviceid, this.handleStateChange);
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = SonoffSC;
