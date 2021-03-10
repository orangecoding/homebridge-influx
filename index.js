let Service, Characteristic;

const InfluxDB = require('influx');

const TEMPERATURE_SENSOR_NAME = 'temperature';
const HUMIDITY_SENSOR_NAME = 'humidity';

const getLastMeasurement = (influx, service, schema, cb) => {
  influx
    .query(`SELECT LAST("${schema[service].field}") FROM ${schema[service].measurement}`)
    .then(result => cb(null, result[0] == null ? -1 : result[0].last))
    .catch(err => cb(err));
};

const round = (value, decimal = 0) => {
  return Math.round((value + Number.EPSILON) * 10 ** decimal) / 10 ** decimal;
};

class HomebridgeInflux{
    constructor(log, config){
        this.log = log;

        this.name = config['name'];
        this.manufacturer = config['manufacturer'] || 'Christian Kellner';
        this.model = config['model'] || 'homebridge-influx';
        this.serial = config['serial'] || '1';

        /**
         * Example:
         * "sensor_names": {
                "temperature": "Temperature Sensor",
                "humidity": "Humidity Sensor"
            },
         * NOTE: At least one of the sensors must be set
         * @type {{[p: string]: *}}
         */
        this.sensor_names = { ...config['sensor_names'] };
        this.schema = { ...config['schema'] };

        this.influx = new InfluxDB.InfluxDB({ ...config['influx'] });
    }


    getRemoteState = (service, callback) => {
        getLastMeasurement(
            this.influx,
            service,
            this.schema,
            (influxError, value) => {

                if (influxError) {
                    this.log(influxError);
                    return callback(new Error(influxError));
                }
                const v = round(value, 1);

                const takenService = service === TEMPERATURE_SENSOR_NAME ? this.temperatureService : this.humidityService;

                takenService.setCharacteristic(Characteristic.Name, this.sensor_names[service]);
                takenService.setCharacteristic(service === TEMPERATURE_SENSOR_NAME ? Characteristic.CurrentTemperature : Characteristic.CurrentRelativeHumidity, v);
                return callback(null, v);
            }
        );
    }

    // Homekit-specific getters
    getTemperatureState = (callback) => {
        this.getRemoteState(TEMPERATURE_SENSOR_NAME, callback);
    }

    getHumidityState = (callback) => {
        this.getRemoteState(HUMIDITY_SENSOR_NAME, callback);
    }

    getServices = () => {
        const informationService = new Service.AccessoryInformation();
        const result = [informationService];
        const sensorKeys = Object.keys(this.sensor_names);
        let sensorSet = false;

        informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);

        if(sensorKeys.indexOf(TEMPERATURE_SENSOR_NAME) !== -1) {
            this.temperatureService = new Service.TemperatureSensor(this.name);
            this.temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({minValue: -100, maxValue: 100})
                .on('get', this.getTemperatureState);
            result.push(this.temperatureService);
            sensorSet = true;
            this.log.debug('Configured temperature sensor');
        }

        if(sensorKeys.indexOf(HUMIDITY_SENSOR_NAME) !== -1) {
            this.humidityService = new Service.HumiditySensor(this.name);
            this.humidityService
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .setProps({minValue: 0, maxValue: 100})
                .on('get', this.getHumidityState);
            result.push(this.humidityService);
            sensorSet = true;
            this.log.debug('Configured humidity sensor');
        }

        if(!sensorSet){
            this.log.error('You need to set at least 1 sensor in the sensor_names config');
        }

        return result;
    };
}

module.exports = homebridge => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-influx', 'Homebridge-Influx', HomebridgeInflux);
};