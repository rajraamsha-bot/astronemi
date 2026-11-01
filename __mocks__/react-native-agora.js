/* global jest */
const mockEngine = {
  initialize: jest.fn().mockResolvedValue(undefined),
  joinChannel: jest.fn().mockResolvedValue(undefined),
  leaveChannel: jest.fn().mockResolvedValue(undefined),
  muteLocalAudioStream: jest.fn().mockResolvedValue(undefined),
  setEnableSpeakerphone: jest.fn().mockResolvedValue(undefined),
  muteLocalVideoStream: jest.fn().mockResolvedValue(undefined),
  switchCamera: jest.fn().mockResolvedValue(undefined),
  enableAudio: jest.fn().mockResolvedValue(undefined),
  enableVideo: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  registerEventHandler: jest.fn((handlers) => {
    // We can simulate an event if needed, but for now we just store the handlers
    mockEngine._handlers = handlers;
  }),
  _triggerEvent: (eventName, ...args) => {
    if (mockEngine._handlers && mockEngine._handlers[eventName]) {
      mockEngine._handlers[eventName]({}, ...args);
    }
  }
};

const AgoraRTC = {
  createAgoraRtcEngine: jest.fn().mockReturnValue(mockEngine),
  ChannelProfileType: {
    ChannelProfileCommunication: 0,
    ChannelProfileLiveBroadcasting: 1,
    ChannelProfileGame: 2,
  },
  ClientRoleType: {
    ClientRoleBroadcaster: 1,
    ClientRoleAudience: 2,
  },
  mockEngine // expose for tests if needed
};

module.exports = AgoraRTC;
