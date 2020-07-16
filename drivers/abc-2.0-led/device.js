"use strict";

const Homey = require("homey");

class ABC20LED extends Homey.Device {
  onInit() {
    this.log("ABC 2.0 Led has been inited");
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.registerStateChangeListener();
    this.registerCapabilities();
    this.registerActions();
  }

  registerCapabilities() {
    this.registerToggle("onoff");
    this.registerDim("dim");
    this.registerLightHue("light_hue");
    this.registerRGBEffects("RGBEffects");
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerSetRGBMode("setRGBMode", actions.setRGBMode);
  }

  handleStateChange(device) {
    clearInterval(this.interval);
    this.interval = setInterval(() => {
      Homey.app.ewelinkApi
        .getDevices("2.0-led")
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
      if (device.params.switch == "on") this.updateCapabilityValue("onoff", true);
      if (device.params.switch == "off") this.updateCapabilityValue("onoff", false);
      if (device.params.bright) this.updateCapabilityValue("dim", device.params.bright / 100);
      if (device.params.colorR && device.params.colorG && device.params.colorB) {
        let hsbc = this.rgb2hsb([device.params.colorR, device.params.colorG, device.params.colorB]);
        const hue = hsbc[0] / 359;

        this.updateCapabilityValue("light_hue", hue);
      }
      if (device.params.mode) this.updateCapabilityValue("RGBEffects", device.params.mode.toString());

      if (device.brandName)
        this.setSettings({
          brandName: device.brandName,
          model: device.productModel,
          ip: device.ip,
          fwVersion: device.params.fwVersion
        }).catch(error => this.log(error));
    }
  }

  rgb2hsb(rgb) {
    let hsb = [];
    let rearranged = rgb.slice(0);
    let maxIndex = 0,
      minIndex = 0;
    let tmp;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2 - i; j++)
        if (rearranged[j] > rearranged[j + 1]) {
          tmp = rearranged[j + 1];
          rearranged[j + 1] = rearranged[j];
          rearranged[j] = tmp;
        }
    }
    for (let i = 0; i < 3; i++) {
      if (rearranged[0] == rgb[i]) minIndex = i;
      if (rearranged[2] == rgb[i]) maxIndex = i;
    }
    hsb[2] = rearranged[2] / 255.0;
    hsb[1] = 1 - rearranged[0] / rearranged[2];
    hsb[0] = maxIndex * 120 + 60 * (rearranged[1] / hsb[1] / rearranged[2] + (1 - 1 / hsb[1])) * ((maxIndex - minIndex + 3) % 3 == 1 ? 1 : -1);
    hsb[0] = (hsb[0] + 360) % 360;
    return hsb;
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

  registerDim(name) {
    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };
    this.registerCapabilityListener(name, async value => {
      Homey.app.ewelinkApi.setBrightness(data, value * 100);
    });
  }

  registerLightHue(name) {
    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };
    this.registerCapabilityListener(name, async value => {
      const rgb = this.hsb2rgb([value * 359, 1, 1]);
      Homey.app.ewelinkApi.setRGB(data, { switch: "on", mode: 1, colorR: rgb[0], colorG: rgb[1], colorB: rgb[2], mode: 1, light_type: 1 });
    });
  }

  registerRGBEffects(name) {
    let data = {
      deviceid: this.data.deviceid,
      apikey: this.data.apikey
    };
    this.registerCapabilityListener(name, async value => {
      Homey.app.ewelinkApi.setRGBModes(data, { switch: "on", mode: value });
    });
  }

  hsb2rgb(hsb) {
    let rgb = [];
    for (let offset = 240, i = 0; i < 3; i++, offset -= 120) {
      let x = Math.abs(((hsb[0] + offset) % 360) - 240);
      if (x <= 60) rgb[i] = 255;
      else if (60 < x && x < 120) rgb[i] = (1 - (x - 60) / 60) * 255;
      else rgb[i] = 0;
    }
    for (let i = 0; i < 3; i++) rgb[i] += (255 - rgb[i]) * (1 - hsb[1]);
    for (let i = 0; i < 3; i++) rgb[i] *= hsb[2];
    for (let i = 0; i < 3; i++) rgb[i] = Math.round(rgb[i]);
    return rgb;
  }

  registerSetRGBMode(name, action) {
    action.registerRunListener(async (args, state) => {
      const data = {
        deviceid: args.device.data.deviceid,
        apikey: args.device.data.apikey
      };
      console.log(args.mode);
      Homey.app.ewelinkApi.setRGBModes(data, { switch: "on", mode: parseInt(args.mode) });
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

module.exports = ABC20LED;
