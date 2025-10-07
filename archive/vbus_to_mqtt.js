// A simple Node.js script to bridge Resol VBus to MQTT

const { SerialPort } = require('serialport');
console.log('At line 4');
const { LiveTransceiver, Specification } = require('resol-vbus-core');
const { specification } = require('resol-vbus-core-vsf');
const mqtt = require('mqtt');

// === Configuration =================================
const serialPortPath = '/dev/serial/by-id/usb-1fef_2018-if00'; // Check your system for the correct path
const mqttBrokerUrl = 'mqtt://192.168.1.56';
const mqttTopicPrefix = 'resol/';
// ===================================================

async function startBridge() {
    try {
        // 1. Connect to the VBus/USB interface
        console.log('About to create serial port: ' + serialPortPath);
        const serialport = new SerialPort({ path: serialPortPath, baudRate: 9600 });
        console.log('Created serialport');
        console.log('specification exported: ' + Object.keys(specification));
        console.log('packetSpecicationById: ' + typeof(specification.packetSpecificationById));
        if ( typeof(specification.packetSpecificationById) === 'object'){
          console.log('packetSpecicationById has: ' + Object.keys(specification.packetSpecificationById));
        }
        console.log('devicespecificationById: ' + typeof(specification.deviceSpecificationById));
        if ( typeof(specification.deviceSpecificationById) === 'object'){
          console.log('devicespecificationById has: ' + Object.keys(specification.deviceSpecificationById));
        }
        console.log('vsfspecificationById: ' + typeof(specification.vsfSpecificationById));
        if ( typeof(specification.vsfSpecificationById) === 'object'){
          console.log('vsfspecificationById has: ' + Object.keys(specification.vsfSpecificationById));
        }
        const transceiver = new LiveTransceiver();
        transceiver.onPacket = function(packet){
          console.log('Got packet: ', packet);
          //let packet_fields = specification.getPacketFields(packet);
          //console.log('packet_fields: ' , packet_fields);
          let device_specification = specification.deviceSpecificationById(packet.sourceAddress);
          console.log('device_specification was : ' + Object.keys(device_specification));
          //throw 'giving up';
        }
        transceiver.onDatagram = function(datagram){
          console.log('Got datagram', datagram);
        }
        transceiver.onIdle = function(){
          console.log('Idle!!!!');
        }
        transceiver.onTelegram = function(telegram){
          console.log('Telegram: ', telegram);
        }
        serialport.on('data', buffer => transceiver.decode(buffer));
        // 2. Connect to the MQTT broker
        const client = mqtt.connect(mqttBrokerUrl);

        client.on('connect', () => {
            console.log('Connected to MQTT broker!');
            // Publish an online status message
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