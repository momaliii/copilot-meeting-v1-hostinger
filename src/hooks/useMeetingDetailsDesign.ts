import { useBranding } from '../contexts/BrandingContext';

export type MeetingDetailsDesign = 'default' | 'v2';

export function useMeetingDetailsDesign(): MeetingDetailsDesign {
  const { meetingDetailsDesignV2 } = useBranding();
  return meetingDetailsDesignV2 ? 'v2' : 'default';
}
