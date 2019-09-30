"use strict";

const Homey = require("homey");

class SonoffBasic extends Homey.Device {
  onInit() {
    this.log("Sonoff Basic has been inited");
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    console.log("[INFO]: SonoffBasic -> onInit -> this.data", this.data);

    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    const { triggers } = this.driver;
    this.registerToggle("onoff");
  }

  handleStateChange(device) {
    console.log("[INFO]: SonoffBasic -> handleStateChange -> device", device);
    if (device.params) {
      if (device.params.switch == "on") this.updateCapabilityValue("onoff", true);
    }

    if (device.params) {
      if (device.params.switch == "off") this.updateCapabilityValue("onoff", false);
    }
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value);
    }
  }

  registerToggle(name, trigger) {
    console.log("[INFO]: SonoffBasic -> registerToggle -> this.data.apiKey", this.data.apikey);
    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };
    this.registerCapabilityListener(name, async value => {
      Homey.app.ewelinkApi.setPowerState(data, value);
      console.log("[INFO]: SonoffBasic -> registerToggle -> data", data);

      // this.triggerFlow(trigger, name, value);
    });
  }

  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(`${this.data.deviceid}`, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(`${this.data.deviceid}`, this.handleStateChange);
  }
}

module.exports = SonoffBasic;
