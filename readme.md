#Resol VBUS to MQTT bridge

This nodejs script bridges between VBUS Serial and MQTT. 
It has been tested on a Raspberry Pi 3b running Raspbian with a connected VBUS/USB converter connected to a RESOL Deltasol CS Plus.

It receives packets from the serial port about once a second, aggregates are delivered on a one minute timer as follows:

## Aggregates output to MQTT

| Field                    | Aggregate type | Mnemonic |Usage                 |
|--------------------------|----------------|----------|----------------------|
| Timestamp                | Latest         |          | ISO format time      |
| Temperature sensor 1     | Average        | COL      |Collector temperature |
| Temperature sensor 2     | Average        | TST      |Store temperature     |
| Temperature sensor 3     | Average        | S3       |Additional sensor     |
| Temperature sensor 4     | Average        |          | See note below       |
| Flow rate                | Average        |          | Always -999.00       |
| Pump speed relay 1       | Average        | %        | % of max pump speed  |
| Pump speed relay 2       | Average        |          | % of max pump speed  |
| Operating hours relay 1  | Latest         | hP       | Pump cumulativee Operating hours |
| Operating hours relay 2  | Latest         |          | Always 0             |
| UnitType                 | Latest         |          | Always 11            |
| System                   | Latest         |          | Always 1             |
| ErrorMask                | Orred          |          |                      |
| System time              | Latest         |          | Minutes since day start |
| Sensor 1 defective       | Orred          |          | Error flag           |
| Sensor 2 defective       | Orred          |          | Error flag           |
| Sensor 3 defective       | Orred          |          | Error flag           |
| Sensor 4 defective       | Orred          |          | Error flag           |
| Status mask              | Orred          |          |                      |
| Heat quantity            | Latest         |          | Wh since reference pt|
| Period Heat quantity     | Difference     |          | Diff between start and end of  period |
| SW Version               | Latest         |          | Always 3             |

### NOTE
The DeltaSol unit reports the temperature values to its screen:
+TFL Flow temperature
+TR Return temperature
It is not clear how these relate to the the sensors, though when observed there was a correspondance between COL and TFL. 

## Dependencies
+ resol-vbus
+ mqtt

## References
A number of false starts were made before I found this simple tutorial:
[Connection tutorial](https://danielwippermann.github.io/resol-vbus/#/md/docs/connection-tutorial) 
[Live data tutorial](https://danielwippermann.github.io/resol-vbus/#/md/docs/live-data-tutorial)

The fields returned by the device are given here:
[DeltaSol CS Plus fields](https://danielwippermann.github.io/resol-vbus/#/vsf/fields/00_0010_2211_10_0100)

