import { scheduleTransitEvents } from '../../utils/transit-notifications';
import { notificationService } from '../../utils/notifications';
import { calculateTransitPositions } from '../../utils/transit-engine';

jest.mock('../../utils/notifications', () => ({
  notificationService: {
    scheduleNotification: jest.fn(),
  },
}));

jest.mock('../../utils/transit-engine', () => ({
  calculateTransitPositions: jest.fn(),
}));

describe('transit-notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should schedule notifications for sign change and retrograde change', async () => {
    // We mock two dates: today and tomorrow
    // Today's positions
    (calculateTransitPositions as jest.Mock)
      .mockReturnValueOnce([
        { planet: 'Jupiter', sign: 'Aries', isRetrograde: false },
        { planet: 'Saturn', sign: 'Aquarius', isRetrograde: false },
      ])
      // Tomorrow's positions (Jupiter changes sign, Saturn turns retrograde)
      .mockReturnValueOnce([
        { planet: 'Jupiter', sign: 'Taurus', isRetrograde: false },
        { planet: 'Saturn', sign: 'Aquarius', isRetrograde: true },
      ]);

    await scheduleTransitEvents(1);

    expect(notificationService.scheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Major Transit: Jupiter enters Taurus',
        body: 'Jupiter has moved from Aries into Taurus. Explore the impact on your life.',
      }),
      expect.any(Number)
    );

    expect(notificationService.scheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Astrology Alert: Saturn turns retrograde',
        body: 'Saturn goes retrograde in Aquarius today. Tap to see how it affects your chart!',
      }),
      expect.any(Number)
    );
  });

  it('should handle errors gracefully', async () => {
    (calculateTransitPositions as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Engine failed');
    });

    await expect(scheduleTransitEvents(1)).resolves.not.toThrow();
  });
});
