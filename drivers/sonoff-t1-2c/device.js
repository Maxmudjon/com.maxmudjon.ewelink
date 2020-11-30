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
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      if (device.params.switches[0].switch == "on") this.updateCapabilityValue("onoff", true);
      if (device.params.switches[0].switch == "off") this.updateCapabilityValue("onoff", false);
      if (device.params.switches[1].switch == "on") this.updateCapabilityValue("onoff.1", true);
      if (device.params.switches[1].switch == "off") this.updateCapabilityValue("onoff.1", false);
      if (device.params.updateSource == "LAN") this.setStoreValue("api", "lan");
      if (device.params.updateSource == "WS") this.setStoreValue("api", "ws");

      if (device.params.startup)
        this.setSettings({
          powerResponse: device.params.startup,
        });

      if (device.params.sledOnline)
        this.setSettings({
          networkLed: device.params.sledOnline,
        });

      if (device.params.pulse)
        this.setSettings({
          duration: device.params.pulse,
        });

      if (device.params.pulseWidth)
        this.setSettings({
          durationLimit: parseFloat(device.params.pulseWidth / 1000),
        });
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

  registerToggle(name, trigger) {
    let data = {
      name: this.getName(),
      deviceid: this.data.deviceid,
      apikey: this.data.apikey,
      uiid: this.data.uiid,
      api: "ws",
    };
    this.registerCapabilityListener(name, async (value) => {
      let channels = [
        { outlet: 0, switch: "on" },
        { outlet: 1, switch: "on" },
        { outlet: 2, switch: "on" },
        { outlet: 3, switch: "on" },
      ];
      if (name == "onoff") {
        channels[0].switch = value ? "on" : "off";
        channels[1].switch = this.getCapabilityValue("onoff.1") ? "on" : "off";
      } else if (name == "onoff.1") {
        channels[0].switch = this.getCapabilityValue("onoff") ? "on" : "off";
        channels[1].switch = value ? "on" : "off";
      }

      Homey.app.ewelinkApi.sendDeviceUpdate(data, channels);
    });
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

module.exports = SonoffT12C;
