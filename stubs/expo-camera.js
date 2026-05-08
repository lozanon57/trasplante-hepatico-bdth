module.exports = { CameraView: () => null, useCameraPermissions: () => [null, async () => ({ granted: false })], Camera: { requestCameraPermissionsAsync: async () => ({ granted: false }) } };
