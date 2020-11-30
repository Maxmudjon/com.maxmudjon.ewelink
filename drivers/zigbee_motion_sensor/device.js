"use strict";

const Homey = require("homey");

class ZigbeeMotionSensor extends Homey.Device {
  onInit() {
    this.log("Zigbee Motion Sensor device has been inited");
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.registerStateChangeListener();
  }

  handleStateChange(device) {
    if (device.params) {
      if (device.params.battery) {
        this.updateCapabilityValue("measure_battery", parseInt(device.params.battery));
        this.updateCapabilityValue("alarm_battery", parseInt(device.params.battery) <= 20 ? true : false);
      }
      if (device.params.motion == 1) this.updateCapabilityValue("alarm_motion", true);
      if (device.params.motion == 0) this.updateCapabilityValue("alarm_motion", false);
    }
  }

  updateCapabilityValue(name, value, trigger) {
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

module.exports = ZigbeeMotionSensor;
