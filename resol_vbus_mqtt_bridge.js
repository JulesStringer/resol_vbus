// Reads vbus source takes 1 minute average of all packets and publishes this with mqtt
//
// Main sources of information:
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
const fs = require('fs');

// Check for the command-line argument
const GENERATE_SQL_MODE = process.argv.includes('--generate-sql');
// Flag to ensure SQL generation happens only once
let sqlGenerated = false; 

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
function average_cache_field(cache, name){
    let sum = 0;
    let count = cache.length;
    for(let row of cache){
        sum += row[name];
    }
    return (sum / count).toFixed(2);
}
function or_cache_field(cache, name){
    let v = 0;
    for(let row of cache){
        v |= row[name];
    }
    return v;
}
function latest_cache_field(cache, name){
    return cache[cache.length - 1][name];
}
function generateQuestDBSQL(packetFields) {
    // 1. Start the CREATE TABLE statement
    let sql = `CREATE TABLE resol_vbus (\n`;

    // 2. Add the required TIMESTAMP column
    sql += `  timestamp TIMESTAMP,\n`;
    
    // Use a Set to prevent duplicate column definitions (if any exist, though unlikely)
    const columns = new Set(); 

    for (const f of packetFields) {
        const columnName = f.name.replace(/\s+/g, '_');
        
        if (columns.has(columnName)) continue;
        
        let dbType;
        const rawValue = f.rawValue;
        
        // --- Type Inference Logic ---
        if (typeof rawValue === 'number') {
            // Check if it's an integer or a float/double
            // columns that are going to be averaged need to be double
            if ( columnName.startsWith('Temperature_sensor') ||
                 columnName.startsWith('Flow_rate') || 
                 columnName.startsWith('Pump_speed_relay')){
                dbType = 'DOUBLE';
            } else if (Number.isInteger(rawValue) && rawValue > -2147483648 && rawValue < 2147483647) {
                 // Use INT for smaller integers (like flags/SW versions)
                 dbType = 'INT';
            } else if (Number.isInteger(rawValue)) {
                // Use LONG for large cumulative integers (like Operating hours, Heat quantity)
                dbType = 'LONG';
            } else {
                // Use DOUBLE for floats (Temperatures, rates)
                dbType = 'DOUBLE';
            }
        } else {
            // Default to STRING if for some reason a non-number appears
            dbType = 'STRING'; 
        }
        sql += `  ${columnName} ${dbType},\n`;
        columns.add(columnName);
        if ( columnName === 'Heat_quantity'){
            columnName = 'Period_Heat_quantity';
            dbType = 'INT';
            sql += `  ${columnName} ${dbType},\n`;
            columns.add(columnName);
        }
    }

    // 3. Close the statement and define the designated timestamp column
    // The slice(0, -2) removes the trailing comma and newline
    sql = sql.slice(0, -2) + `\n) TIMESTAMP(timestamp)`;
    sql += ' PARTITION BY DAY WAL DEDUP;';
    return sql;
}
async function runit(){
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

    let cache = [];
    let starting_values = {};
    connection.on('packet', function(packet) {
        //console.log('got packet ' + JSON.stringify(packet));
        //console.log('Packet received: ' + packet.getId() + '  , :' + Object.keys(packet));
        // keys were timestamp,channel,destinationAddress,sourceAddress,minorVersion,command,frameCount,frameData
        //
        if ( packet.destinationAddress === 16 ){
            let payload = {
                timestamp: packet.timestamp.toISOString()
            };
            // --- SQL GENERATION LOGIC (Runs when flag is present) ---
            if (GENERATE_SQL_MODE) {
                if (!sqlGenerated) {
                    let packetFields = spec.getPacketFieldsForHeaders([ packet ]);
                    const createTableSql = generateQuestDBSQL(packetFields);
                    
                    console.log("\n--- QuestDB CREATE TABLE SQL ---\n");
                    console.log(createTableSql);
                    console.log("\n--------------------------------\n");
                    
                    sqlGenerated = true; // Set flag so it doesn't run again
                }
                // Once SQL is generated, we exit the script
                if (sqlGenerated) {
                    // Give a moment for the console log to flush, then exit
                    setTimeout(() => process.exit(0), 100); 
                    return; 
                }
            }
            // --- END SQL GENERATION LOGIC ---

            //console.log('Timestamp: '  + packet.timestamp.toISOString());
            //console.log('Destination addreds: ' + packet.destinationAddress);
            //console.log('Channel: ' + packet.channel);
            //console.log('Command: ' + packet.command);
            let packetFields = spec.getPacketFieldsForHeaders([ packet ]);
            //console.log('packet fields: ',packetFields);
            for( let f of packetFields ){
                //console.log('name: ' + f.name + ' value: ' + f.rawValue);
                //console.log('f.packetSpec: ', JSON.stringify(f.packetFieldSpec));
                //console.log('f.packetFieldSpec fieldId: ' + f.packetFieldSpec.fieldId + ' type: ' + JSON.stringify(f.packetFieldSpec.type));
                //console.log('f.name: ', f.name);
                //console.log('f.rawValue: ', f.rawValue);
                let key = f.name.replace(/\s+/g, '_');
                //console.log('f.name: ' + f.name + ' key: ' + key);
                payload[key] = f.rawValue;
            }
            //console.log(JSON.stringify(payload, null, 2));
            cache.push(payload);
            // first time round only collect starting_values
            if ( Object.keys(starting_values).length === 0 ){
                starting_values = payload;
            }
        }
    });
    setInterval(function() {
        // 60 second timer expired
        let r = {};
        let keys = Object.keys(cache[0]);
        for(let key of keys){
            if ( key === 'timestamp'){
                r[key] = latest_cache_field(cache,key);
            }
            if ( key.startsWith('Temperature_sensor')){
                r[key] = average_cache_field(cache, key);
            }
            if ( key.startsWith('Flow_rate')){
                r[key] = average_cache_field(cache, key);
            }
            if ( key.startsWith('Pump_speed_relay')){
                r[key] = average_cache_field(cache, key);
            }
            if ( key.startsWith('Operating_hours_relay')){
                r[key] = latest_cache_field(cache, key);
            }
            if ( key === 'UnitType' || key === 'System' || key === 'System_time' || key === 'Heat_quantity' || key === 'SW_Version'){
                r[key] = latest_cache_field(cache, key);
            }
            if ( key === 'Heat_quantity'){
                if ( starting_values[key]){
                    r[ 'Period_' + key] = latest_cache_field(cache, key) - starting_values[key];
                    //console.log('starting_values[' + key + '] :' + starting_values[key]);
                }
            }
            if ( key === 'ErrorMask' || key === 'Status_mask' || key.startsWith('Sensor ')){
                r[key] = or_cache_field(cache, key);
            }
        }
        console.log('Publishing topic: ' + `${mqttTopicPrefix}aggregates` + ', message: ' + JSON.stringify(r, null, 2));
        mqtt_client.publish(`${mqttTopicPrefix}aggregates`, JSON.stringify(r), { retain: true});
        starting_values = cache[cache.length - 1];
        //console.log('starting_values: ' + JSON.stringify(starting_values, null, 3));
        cache = [];
    }, 60000);
}
runit().catch((err) => {
    console.log(err.toString());
});