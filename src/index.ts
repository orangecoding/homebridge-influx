let Service, Characteristic;

import InfluxDB = require('influx');

const defaultConfig = {
  sensor_names: {
    temperature: 'Temperature Sensor',
    humidity: 'Humidity Sensor',
  },
  schema: {
    temperature: { field: 'temperature', measurement: 'air' },
    humidity: { field: 'humidity', measurement: 'air' }
  }
};

const getLastMesurement = (influx, service, schema, cb) => {
  influx
    .query(`SELECT LAST("${schema[service].field}") FROM ${schema[service].measurement}`)
    .then(result => cb(null, result[0].last))
    .catch(err => cb(err));
};

const round = (value, decimal = 0) => {
  return Math.round((value + Number.EPSILON) * 10 ** decimal) / 10 ** decimal;
};

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-influx', 'Homebridge-Influx', HomebridgeInflux);
};

function HomebridgeInflux(log, config) {
  this.log = log;

  // Configuration
  this.name = config['name'];
  this.manufacturer = config['manufacturer'] || 'Christian Kellner';
  this.model = config['model'] || 'homebrige-influx';
  this.serial = config['serial'] || '1';

  this.sensor_names = { ...defaultConfig['sensor_names'], ...config['sensor_names'] };
  this.schema = { ...defaultConfig['schema'], ...config['schema'] };

  this.influx = new InfluxDB.InfluxDB({ ...config['influx'] });
}

HomebridgeInflux.prototype = {
  // Called when HomeKit wants to read our sensor value.
  getRemoteState: function (service, callback) {
    getLastMesurement(
      this.influx,
      service,
      this.schema,
      (influxError, value) => {

        if (influxError) {
          this.log(influxError);
          return callback(new Error(influxError));
        }
        const v = round(value, 1);
        this.temperatureService.setCharacteristic(Characteristic.Name, this.sensor_names[service]);
        this.temperatureService.setCharacteristic(service === 'temperature' ? Characteristic.CurrentTemperature : Characteristic.CurrentRelativeHumidity, v);
        return callback(null, v);
      }
    );
  },

  // Homekit-specific getters
  getTemperatureState: function (callback) {
    this.getRemoteState('temperature', callback);
  },
  getHumidityState: function (callback) {
    this.getRemoteState('humidity', callback);
  },

  // Service configuration
  // Sets up all the capacities of the accessory, as well as the AccessoryInformation, which provides basic identification for our accessory.
  getServices: function () {
    const informationService = new Service.AccessoryInformation();

    this.temperatureService = new Service.TemperatureSensor(this.name);
    this.humidityService = new Service.HumiditySensor(this.name);

    informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);

    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -273, maxValue: 200 })
      .on('get', this.getTemperatureState.bind(this));

    this.humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .setProps({ minValue: 0, maxValue: 100 })
      .on('get', this.getHumidityState.bind(this));

    return [informationService, this.temperatureService, this.humidityService];
  }
};
