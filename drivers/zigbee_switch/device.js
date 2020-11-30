"use strict";

const Homey = require("homey");

class ZigbeeSwitch extends Homey.Device {
  onInit() {
    this.log("Zigbee Switch device has been inited");
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.registerStateChangeListener();
  }

  handleStateChange(device) {
    const { triggers } = this.driver;

    if (device.params) {
      if (device.params.battery) {
        this.updateCapabilityValue("measure_battery", parseInt(device.params.battery));
        this.updateCapabilityValue("alarm_battery", parseInt(device.params.battery) <= 20 ? true : false);
      }
      if (device.params.key == 0) this.triggerFlow(triggers.click, "click", true);
      if (device.params.key == 1) this.triggerFlow(triggers.double_click, "double_click", true);
      if (device.params.key == 2) this.triggerFlow(triggers.long_press, "long_press", true);
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

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    if (value) {
      trigger.trigger(this, {}, value);
    }

    this.log("trigger:", name, value);
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

module.exports = ZigbeeSwitch;
