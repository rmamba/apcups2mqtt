const Net = require('net');
const mqtt = require('mqtt');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const extractValues = (process.env.EXTRACT_VALUES || 'STATUS|LINEV|LOADPCT|BCHARGE|TIMELEFT|MBATTCHG|MINTIMEL|MAXTIME|LOTRANS|HITRANS|ALARMDEL|BATTV|TONBATT|CUMONBATT|NOMINV|NOMBATTV|NOMPOWER').split('|');
const publishValues = (process.env.PUBLISH_VALUES || 'STATUS|LINEV|LOADPCT|BCHARGE|TIMELEFT|BATTV|TONBATT|NOMINV|NOMBATTV|NOMPOWER').split('|');

const DEBUG = (process.env.DEBUG || 'false') === 'true';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'apcups2mqtt';
// Read Base64 encoded data and parse it to json, default value is [{"id":1, "name":"UPS1","host":"127.0.0.1"}]
const SETTINGS = JSON.parse(atob(process.env.SETTINGS || 'W3siaWQiOjEsICJuYW1lIjoiVVBTMSIsImhvc3QiOiIxMjcuMC4wLjEifV0='));
const MQTT_SERVER = process.env.MQTT_SERVER || '127.0.0.1';
const MQTT_PORT = process.env.MQTT_PORT || '1883';

let UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL || '5000');
if (UPDATE_INTERVAL < 250) {
    UPDATE_INTERVAL = 250;
}

let mqttClient;

const ProcessData = (SERVER, chunk) => {
    const data = {};
    if (chunk.length > 2) {
        const oldChunk = Buffer.concat([Buffer.from(' '), chunk]);
        const apcUpsData = oldChunk.toString().split('\n\x00');
        apcUpsData.forEach(upsData => {
            const parts = upsData.slice(1).split(':');
            if (!parts[1]) {
                return;
            }
            const varName = parts[0].trim();
            let value = parts[1].trim();
            if (extractValues.includes(varName)) {
                const parts = value.split(' ');
                data[`${varName}_value`] = parseFloat(parts[0]);
                data[`${varName}_unit`] = parts[1];
            } 
            data[varName] = value;
        });

        if (DEBUG) {
            console.log(SERVER.name + ':');
            console.log(data);
        }
        publishValues.filter(v => data[`${v}_value`]).forEach(v => {
            mqttClient.publishAsync(`/UPS/${SERVER.id}/${v}`, data[`${v}_value`].toString());
        });
    }
};

const ProcessServers = () => {
    SETTINGS.forEach(SERVER => {
        const client = new Net.Socket();
    
        client.connect({ port: SERVER.port ?? 3551, host: SERVER.host }, () => {
            if (DEBUG) {
                console.log('TCP connection established with the server.');
            }
    
            // Magic sequence to tell UPS daemon to return data
            client.write(Buffer.from([0x00, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73]));
        });
    
        client.on('data', chunk => ProcessData(SERVER, chunk));
    
        client.on('end', () => {
            if (DEBUG) {
                console.log('Requested an end to the TCP connection');
            }
        });
    
        client.on('error', err => console.log(err));
    });
};

const run = async () => {
    const mqttConfig = {
        clientId: MQTT_CLIENT_ID,
        rejectUnauthorized: false,
        keepalive: 15,
        connectTimeout: 1000,
        reconnectPeriod: 500,
    };

    if (process.env.MQTT_USER) {
        mqttConfig.username = process.env.MQTT_USER;
    }
    if (process.env.MQTT_PASS) {
        mqttConfig.password = process.env.MQTT_PASS;
    }

    console.log(`Connecting to MQTT server ${MQTT_SERVER}:${MQTT_PORT}`);
    mqttClient = mqtt.connect(`mqtt://${MQTT_SERVER}:${MQTT_PORT}`, mqttConfig);

    mqttClient.on('connect', () => {
        console.log('MQTT server connected...');
        console.log(SETTINGS);
    });
    
    mqttClient.on('error', (err) => {
        console.log(err);
        process.exit(1);
    });
    
    while (!mqttClient.connected) {
        await sleep(1000);
    }
    
    setInterval(ProcessServers, UPDATE_INTERVAL);
}

run();