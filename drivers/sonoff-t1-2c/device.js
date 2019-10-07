"use strict";

const Homey = require("homey");
const model = "T1 2C";

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
    if (device.params && device.params.switches) {
      if (device.params.switches[0].switch == "on") this.updateCapabilityValue("onoff", true);
      else if (device.params.switches[0].switch == "off") this.updateCapabilityValue("onoff", false);
      if (device.params.switches[1].switch == "on") this.updateCapabilityValue("onoff.1", true);
      else if (device.params.switches[1].switch == "off") this.updateCapabilityValue("onoff", false);
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
      let channels = [
        { "outlet": 0, "switch": "on" },
        { "outlet": 1, "switch": "on" },
        { "outlet": 2, "switch": "on" },
        { "outlet": 3, "switch": "on" }
      ]
      if (name == 'onoff') {
        channels[0].switch = value ? "on" : "off"
        channels[1].switch = this.getCapabilityValue('onoff.1') ? "on" : "off"
      } else if (name == 'onoff.1') {
        channels[1].switch = value ? "on" : "off"
        channels[0].switch = this.getCapabilityValue('onoff') ? "on" : "off"
      }

      Homey.app.ewelinkApi.setPower2State(data, channels);
      console.log("[INFO]: SonoffT12C -> registerToggle -> data" + data + " CAPAB " + name);

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
