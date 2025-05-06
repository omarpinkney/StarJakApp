// utils/constants.js
export const RIM_POSITIONS = {
    FRONT_DRIVER: 'Front Driver',
    FRONT_PASSENGER: 'Front Passenger',
    REAR_DRIVER: 'Rear Driver',
    REAR_PASSENGER: 'Rear Passenger',
    AUX_1: 'Auxiliary 1',
    AUX_2: 'Auxiliary 2',
    AUX_3: 'Auxiliary 3',
    AUX_4: 'Auxiliary 4',
  };
  
  export const COMMANDS = {
    EXTEND: 'EXTEND',
    RETRACT: 'RETRACT',
    ROTATE_CW: 'ROTATE_CW',
    ROTATE_CCW: 'ROTATE_CCW',
    STOP: 'STOP',
    STATUS: 'STATUS',
  };
  
  // Service UUIDs
  export const SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  export const COMMAND_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
  export const STATUS_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';
  export const SENSOR_UUID = '6E400004-B5A3-F393-E0A9-E50E24DCCA9E';