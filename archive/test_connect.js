// from:
// https://danielwippermann.github.io/resol-vbus/#/md/docs/live-data-tutorial
// https://danielwippermann.github.io/resol-vbus/#/md/docs/connection-tutorial
//
// Using ids from
// https://danielwippermann.github.io/resol-vbus/#/vsf/fields/00_0010_2211_10_0100
//
const serialPortPath = '/dev/serial/by-id/usb-1fef_2018-if00'; // Check your system for the correct path
const mqttBrokerUrl = 'mqtt://192.168.1.56';
const mqttTopicPrefix = 'resol_vbus/';

const vbus = require('resol-vbus');
const { Specification } = require('resol-vbus');
const mqtt = require('mqtt');

async function create_mqtt_client(){
    return new Promise((resolve, reject) => {
        let mqtt_client = mqtt.connect(mqttBrokerUrl);
        mqtt_client.on('connect', () => {
            console.log('Connected to mqtt client');
            mqtt_client.publish(`${mqttTopicPrefix}status`, 'online', { retain: true });
            resolve(mqtt_client);
        });
        mqtt_client.on('error', (err) => {
            console.log('mqtt connection error ' + err.toString());
            reject(err);
        });
    });
}
async function init(){
    let connection = new vbus.SerialConnection({
        path: serialPortPath
    });
    console.log('Created connection');
    await connection.connect().catch((err) => {
        console.log('Connection failed ' + err.toString());
        throw(err);
    });
    console.log('Connected');
    let spec = Specification.getDefaultSpecification();
    console.log('Got specification');
    let mqtt_client = await create_mqtt_client();

    connection.on('packet', function(packet) {
        //console.log('got packet ' + JSON.stringify(packet));
        //console.log('Packet received: ' + packet.getId() + '  , :' + Object.keys(packet));
        // keys were timestamp,channel,destinationAddress,sourceAddress,minorVersion,command,frameCount,frameData
        //
        if ( packet.destinationAddress === 16 ){
            let payload = {
                timestamp: packet.timestamp.toISOString()
            };
            //console.log('Timestamp: '  + packet.timestamp.toISOString());
            //console.log('Destination addreds: ' + packet.destinationAddress);
            //console.log('Channel: ' + packet.channel);
            //console.log('Command: ' + packet.command);
            let packetFields = spec.getPacketFieldsForHeaders([ packet ]);
            //console.log('packet fields: ',packetFields);
            for( let f of packetFields ){
                //console.log('name: ' + f.name + ' value: ' + f.rawValue);
                payload[f.name] = f.rawValue;
            }
            console.log(JSON.stringify(payload, null, 2));
            mqtt_client.publish(`${mqttTopicPrefix}packet`, JSON.stringify(payload), { retain: true});
        }
    });
}
init().catch((err) => {
    console.log(err.toString());
});