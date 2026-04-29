import { PlaceholderPage } from './PlaceholderPage';

export default function IndiaRosterPage() {
  return (
    <PlaceholderPage
      title="India Roster"
      subtitle="India-team FTE roster — billable allocation + bench status"
      willContain={[
        'Every India team member with role, skill, current allocation status (Allocated / Bench / On Leave)',
        'Visa / location / experience metadata',
        'Daily updates / submissions when on bench (similar to Open Bench updates log)',
        'Filter + search by skill, status, allocation',
        'Jump-link to the resource\'s assignments in the Project Team view',
      ]}
      meanwhile={{ label: 'Open Bench (US)', to: '/open-bench' }}
    />
  );
}
