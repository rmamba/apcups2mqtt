// Include Nodejs' net module.
const Net = require('net');
const extractValues = [
    'LINEV',
    'LOADPCT',
    'BCHARGE',
    'TIMELEFT',
    'MBATTCHG',
    'MINTIMEL',
    'MAXTIME',
    'LOTRANS',
    'HITRANS',
    'ALARMDEL',
    'BATTV',
    'TONBATT',
    'CUMONBATT',
    'NOMINV',
    'NOMBATTV',
    'NOMPOWER',
];

const host = '127.0.0.1';
const port = 3551;

// Create a new TCP client.
const client = new Net.Socket();

// Send a connection request to the server.
client.connect({ port: port, host: host }, () => {
    // If there is no error, the server has accepted the request and created a new 
    // socket dedicated to us.
    console.log('TCP connection established with the server.');

    // The client can now send data to the server by writing to its socket.
    client.write(Buffer.from([0x00, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73]));
});

// The client can also receive data from the server by reading from its socket.
client.on('data', chunk => {
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

        console.log(data);
    }
    
    // Request an end to the connection after the data has been received.\
    client.end();
});

client.on('end', () => {
    console.log('Requested an end to the TCP connection');
});

client.on('error', err => console.log(err));
