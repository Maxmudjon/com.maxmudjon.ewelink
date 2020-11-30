"use strict";

const Homey = require("homey");

class CoolkitSocket extends Homey.Device {
  onInit() {
    this.log("Coolkit Socket has been inited");
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    this.registerToggle("onoff");
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      if (device.params.switch == "on") this.updateCapabilityValue("onoff", true);
      if (device.params.switch == "off") this.updateCapabilityValue("onoff", false);
      if (device.params.voltage) this.updateCapabilityValue("measure_voltage", parseFloat(device.params.voltage));
      if (device.params.power) this.updateCapabilityValue("measure_power", parseFloat(device.params.power));
      if (device.params.current) this.updateCapabilityValue("meter_power", parseFloat(device.params.current));
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
      Homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? "on" : "off" });
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

module.exports = CoolkitSocket;
