/**
 * Web stub for `react-native-agora`.
 *
 * react-native-agora is native-only (it imports react-native internals such as
 * `codegenNativeComponent`), so it cannot be bundled for web. Metro statically
 * bundles every `require('react-native-agora')` regardless of the runtime
 * `Platform.OS !== 'web'` / try-catch guards around it, which broke the web
 * export. This stub is aliased in for the web platform via
 * `metro.config.js` -> `resolver.resolveRequest`.
 *
 * It exposes the small surface the app touches so that any code path that
 * still references the module on web degrades gracefully instead of crashing.
 */

function createAgoraRtcEngine() {
  const noop = () => 0;
  return {
    initialize: noop,
    registerEventHandler: noop,
    enableVideo: noop,
    disableVideo: noop,
    enableAudio: noop,
    startPreview: noop,
    stopPreview: noop,
    joinChannel: noop,
    leaveChannel: noop,
    muteLocalAudioStream: noop,
    muteLocalVideoStream: noop,
    enableLocalVideo: noop,
    setEnableSpeakerphone: noop,
    switchCamera: noop,
    renewToken: noop,
    release: noop,
  };
}

module.exports = {
  __esModule: true,
  default: {},
  createAgoraRtcEngine,
  RtcSurfaceView: null,
  ChannelProfileType: {
    ChannelProfileLiveBroadcasting: 1,
    ChannelProfileCommunication: 0,
  },
  ClientRoleType: {
    ClientRoleBroadcaster: 1,
    ClientRoleAudience: 2,
  },
};
