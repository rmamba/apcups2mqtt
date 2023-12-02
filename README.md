# WHAT is apcups2mqtt?

This container will read data from APC UPS daemon(s) network server and publish data to MQTT server.
For more information regarding setting up APCUPSD visit [APCUPSD Documentation](http://www.apcupsd.org/manual/manual.html)

# MQTT Configuration

You can define MQTT server via env variables like so:
```
MQTT_SERVER=127.0.0.1
MQTT_PORT=1883
MQTT_USER=
MQTT_PASS=
```
The values listed are default so you can only use the env variable if you want to change it.

# APC UPS daemons Configuration

This is a JSON data that needs to be Base64 encoded to pass it to container.
For example, default settings are:
```
[
    {
        "id": 1,
        "name": "UPS1",
        "host": "127.0.0.1"
    }
]
```
As you can see it is an array of server configurations. `id` will be the value used when data is published to mqtt server to `/UPS/{id}/values` address.
When default config is encoded (removing any extra chartacters) you will get `W3siaWQiOjEsICJuYW1lIjoiVVBTMSIsImhvc3QiOiIxMjcuMC4wLjEifV0=` string,
which you can also see in the `server.js` file. You can use `https://www.base64encode.org/` online encoder to set up your container.

# MQTT

Once the daemon is running all the data will be published to `/UPS/{id}/{value}` address.
The `{value}` part is determined by `PUBLISH_VALUES` env variable and has a default value of
`LINEV|LOADPCT|BCHARGE|TIMELEFT|BATTV|TONBATT|NOMINV|NOMBATTV|NOMPOWER`.

Meaning of variables that are returned from UPS daemon:
```
LINEV: Line Voltage
LOADPCT: UPS load [%]
BCHARGE: State of battery charge [%]
TIMELEFT: How long UPS can power stuff from battery [min]
BATTV: Battery voltage [V]
TONBATT: Time spend on battery power [min]
NOMINV: Mains voltage [V]
NOMBATTV: Battery voltage [V]
NOMPOWER: Max power UPS can deliver [W]
```

# Docker

Start your container with this command replacing values to match your system:
```
docker run --name apcups2mqtt -e MQTT_SERVER=192.168.13.37 -e MQTT_USER=user -e MQTT_PASS=password -e SETTINGS=W3siaWQiOjEsICJuYW1lIjoiVVBTMSIsImhvc3QiOiIxMjcuMC4wLjEifV0= -d rmamba/apcups2mqtt
```
