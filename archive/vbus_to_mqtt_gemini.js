// A simple Node.js script to bridge Resol VBus to MQTT

const { SerialPort } = require('serialport');
// We ONLY need LiveTransceiver from resol-vbus-core. Specification is NOT needed.
const { LiveTransceiver } = require('resol-vbus-core'); 

// CORRECT WAY: Import the fully-built specification object directly
const vsfModule = require('resol-vbus-core-vsf'); 
const specification = vsfModule.specification; // Use the 'specification' key

const mqtt = require('mqtt');

// === Configuration =================================
const serialPortPath = '/dev/serial/by-id/usb-1fef_2018-if00';
const mqttBrokerUrl = 'mqtt://192.168.1.56';
const mqttTopicPrefix = 'resol/';
// ===================================================

async function startBridge() {
    try {
        console.log('About to create serial port: ' + serialPortPath);
        const serialport = new SerialPort({ path: serialPortPath, baudRate: 9600 });
        console.log('Created serialport');

        // NO CONSTRUCTOR CODE NEEDED! The 'specification' object is ready to use.
        console.log('VBus Specification object imported successfully.');

        const transceiver = new LiveTransceiver();
        
        transceiver.onPacket = function(packet){
            // Use the fully-built specification object to decode
            // specification.getPacketFields is guaranteed to exist now.
            const decodedFields = specification.getPacketFields(packet); 
            
            // ... (rest of your JSON building and publishing logic)
            const payloadObject = {
                timestamp: new Date().toISOString(),
                source: packet.sourceAddress,
                destination: packet.destinationAddress,
                fields: {}
            };
            
            decodedFields.forEach(field => {
                payloadObject.fields[field.id] = field.value;
            });

            const jsonPayload = JSON.stringify(payloadObject);
            const topic = `${mqttTopicPrefix}packet`;
            client.publish(topic, jsonPayload);

            console.log(`Published JSON payload to topic: ${topic}`);
        }
        
        // ... (your other transceiver and MQTT code)
        transceiver.onDatagram = function(datagram){ console.log('Got datagram', datagram); }
        transceiver.onIdle = function(){ console.log('Idle!!!!'); }
        transceiver.onTelegram = function(telegram){ console.log('Telegram: ', telegram); }

        serialport.on('data', buffer => transceiver.decode(buffer));

        const client = mqtt.connect(mqttBrokerUrl);

        client.on('connect', () => {
            console.log('Connected to MQTT broker!');
            client.publish(`${mqttTopicPrefix}status`, 'online', { retain: true });
        });

        client.on('error', (err) => {
            console.error('MQTT connection error:', err);
        });
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

startBridge();