"use strict";

const Homey = require("homey");
const model = "Sonoff SC";

class SonoffT12C extends Homey.Device {
  onInit() {
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.registerStateChangeListener();
    this.registerCapabilities();
    this.log("[" + model + "] [" + this.data.deviceid + "] [" + this.getName() + "] has been inited");
  }

  registerCapabilities() {
    this.registerToggle("onoff");
    this.registerToggle("onoff.1");
  }

  handleStateChange(device) {
    console.log("[INFO]: SonoffT12C -> handleStateChange -> device", device);
    if (device.params && device.params.switches) {
      device.params.switches.forEach((deviceStich, index) => {
        console.log(deviceStich + " : " + index);
      });
      if (device.params.switch == "on") this.updateCapabilityValue("onoff", true);
    }
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value);
    }
  }

  registerToggle(name, trigger) {
    console.log("[INFO]: SonoffT12C -> registerToggle -> this.data.apiKey", this.data.apikey);
    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };
    this.registerCapabilityListener(name, async value => {
      Homey.app.ewelinkApi.setPowerState(data, value);
      console.log("[INFO]: SonoffT12C -> registerToggle -> data" + data + " CAPAB" + name);

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

module.exports = SonoffT12C;
