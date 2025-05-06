// services/LogService.js
import DeviceInfo from 'react-native-device-info';

// Generate error logs
export const generateErrorLogs = async () => {
  try {
    // Get device information
    const deviceInfo = {
      brand: await DeviceInfo.getBrand(),
      model: await DeviceInfo.getModel(),
      systemName: await DeviceInfo.getSystemName(),
      systemVersion: await DeviceInfo.getSystemVersion(),
      appVersion: await DeviceInfo.getVersion(),
      buildNumber: await DeviceInfo.getBuildNumber(),
    };
    
    // Generate log content
    const logs = {
      timestamp: new Date().toISOString(),
      deviceInfo,
      appInfo: {
        version: '1.0.0',
      },
      logs: [
        {
          level: 'INFO',
          timestamp: new Date().toISOString(),
          message: 'Support request generated',
        },
        // Additional logs would be added here in a real implementation
      ],
    };
    
    return JSON.stringify(logs, null, 2);
  } catch (error) {
    console.error('Failed to generate error logs:', error);
    return JSON.stringify({ error: 'Failed to generate logs' });
  }
};