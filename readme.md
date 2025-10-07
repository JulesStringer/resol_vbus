#Resol VBUS to MQTT bridge

This nodejs script bridges between VBUS Serial and MQTT. 
It has been tested on a Raspberry Pi 3b running Raspbian with a connected VBUS/USB converter connected to a RESOL Deltasol CS Plus.

It receives packets from the serial port about once a second, aggregates are delivered on a one minute timer as follows:

## Aggregates output to MQTT

| Field                    | Aggregate type | Mnemonic |Usage                 |
|--------------------------|----------------|----------|----------------------|
| Timestamp                | Latest         |          | ISO format time      |
| Temperature_sensor_1     | Average        | COL      |Collector temperature |
| Temperature_sensor_2     | Average        | TST      |Store temperature     |
| Temperature_sensor_3     | Average        | S3       |Additional sensor     |
| Temperature_sensor_4     | Average        |          | See note below       |
| Flow_rate                | Average        |          | Always -999.00       |
| Pump_speed_relay_1       | Average        | %        | % of max pump speed  |
| Pump_speed_relay_2       | Average        |          | % of max pump speed  |
| Operating_hours_relay_1  | Latest         | hP       | Pump cumulativee Operating hours |
| Operating_hours_relay_2  | Latest         |          | Always 0             |
| UnitType                 | Latest         |          | Always 11            |
| System                   | Latest         |          | Always 1             |
| ErrorMask                | Orred          |          |                      |
| System time              | Latest         |          | Minutes since day start |
| Sensor_1_defective       | Orred          |          | Error flag           |
| Sensor_2_defective       | Orred          |          | Error flag           |
| Sensor_3_defective       | Orred          |          | Error flag           |
| Sensor_4_defective       | Orred          |          | Error flag           |
| Status_mask              | Orred          |          |                      |
| Heat_quantity            | Latest         |          | Wh since reference pt|
| Period_Heat_quantity     | Difference     |          | Diff between start and end of  period |
| SW_Version               | Latest         |          | Always 3             |

### NOTE
The DeltaSol unit reports the temperature values to its screen:
+TFL Flow temperature
+TR Return temperature
It is not clear how these relate to the the sensors, though when observed there was a correspondance between COL and TFL. 

## Dependencies
+ resol-vbus
+ mqtt

## MQTT Publication
This module publishes:

| topic                 | message                                    | options      |
|-----------------------|--------------------------------------------|--------------|
|resol_vbus/aggregates  | JSON containining the fields listed above  | retain: true |
|resol_vbus/status      | string message online                      | retain: true |


## References
A number of false starts were made before I found this simple tutorial:
+ [Connection tutorial](https://danielwippermann.github.io/resol-vbus/#/md/docs/connection-tutorial) 
+ [Live data tutorial](https://danielwippermann.github.io/resol-vbus/#/md/docs/live-data-tutorial)

The fields returned by the device are given here:
[DeltaSol CS Plus fields](https://danielwippermann.github.io/resol-vbus/#/vsf/fields/00_0010_2211_10_0100)

