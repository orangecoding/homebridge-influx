# homebridge-influx ![npm](https://img.shields.io/npm/v/homebridge-influx?style=flat-square)

A Homebridge plugin that exposes temperature and humidity from an InfluxDB instance. It is collecting always the latest value from a measurement.


## Install

Install the plugin using:

```bash
npm i -g homebridge-influx
```


## Configure

Add to the `accessories` field of your Homebridge `config.json` file:

```
{
  ...
  "accessories": [
      ...
      {
        "accessory": "Homebridge-Influx",
        "name": "SomeName",  // Name for the sensors

        // Optional names for each sensor
        "sensor_names": {
          "temperature": "Temperature Sensor",
          "humidity": "Humidity Sensor"
        },

        // For influxDB queries
        "schema": {
          "temperature": {
            "field": "temperature",
            "measurement": "air"
          },
          "humidity": {
            "field": "humidity",
            "measurement": "air"
          }
        },
        "influx": {
          "host": "127.0.0.1",
          "database": "homeserver"
        }
      }
    ]
}
```

## Note
The fields in `sensor_names` are optional. You however need to set at least 1. If you do not supply `temperature` for instance, no temperature sensor will be registered.

#### Influx config
The `influx` configuration object is passed as-is to the `influx` npm library, so you can use all the options it supports. 
See [here](https://node-influx.github.io/class/src/index.js~InfluxDB.html#instance-constructor-constructor)

# Influx 2

This plugin is also compatible with Influx 2, however in order to make it work, you need to do 2 things.

### Configuration

In the `influx` part of the configuration, you need to parse in the token.

```json
        "host": "yourHost.com",
        "port": "yourPort",
        "database": "someBucket", //type in the name of the bucket here
        "protocol": "http",
        "password": null,
        "options": {
            "headers": {
                "Authorization": "Token YOUR_TOKEN"
            }
        }
```

A bucket is mapped to a database. In order to make Influx aware of this mapping, you need to create it. You do this via terminal by running:
```bash
influx v1 dbrp create --db *BUCKET_NAME* --rp *BUCKET_NAME* --bucket-id *BUCKET_ID* --default
```
