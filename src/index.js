var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var Service, Characteristic;
var InfluxDB = require('influx');
var defaultConfig = {
    sensor_names: {
        temperature: 'Temperature Sensor',
        humidity: 'Humidity Sensor'
    },
    schema: {
        temperature: { field: 'temperature', measurement: 'air' },
        humidity: { field: 'humidity', measurement: 'air' }
    }
};
var getLastMesurement = function (influx, service, schema, cb) {
    influx
        .query("SELECT LAST(\"" + schema[service].field + "\") FROM " + schema[service].measurement)
        .then(function (result) { return cb(null, result[0].last); })["catch"](function (err) { return cb(err); });
};
var round = function (value, decimal) {
    if (decimal === void 0) { decimal = 0; }
    return Math.round((value + Number.EPSILON) * Math.pow(10, decimal)) / Math.pow(10, decimal);
};
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-influx', 'Homebridge-Influx', HttpInfluxAir);
};
function HttpInfluxAir(log, config) {
    this.log = log;
    // Configuration
    this.name = config['name'];
    this.manufacturer = config['manufacturer'] || 'Christian Kellner';
    this.model = config['model'] || 'homebridge-influx';
    this.serial = config['serial'] || '1';
    this.sensor_names = __assign(__assign({}, defaultConfig['sensor_names']), config['sensor_names']);
    this.schema = __assign(__assign({}, defaultConfig['schema']), config['schema']);
    this.influx = new InfluxDB.InfluxDB(__assign({}, config['influx']));
}
HttpInfluxAir.prototype = {
    // Called when HomeKit wants to read our sensor value.
    getRemoteState: function (service, callback) {
        getLastMesurement(this.influx, service, this.schema, function (influxError, value) {
            if (influxError) {
                this.log(influxError);
                return callback(new Error(influxError));
            }
            var v = round(value, 1);
            this.temperatureService.setCharacteristic(Characteristic.Name, this.sensor_names[service]);
            this.temperatureService.setCharacteristic(service === 'temperature' ? Characteristic.CurrentTemperature : Characteristic.CurrentRelativeHumidity, v);
            return callback(null, v);
        }.bind(this));
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
        var informationService = new Service.AccessoryInformation();
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
