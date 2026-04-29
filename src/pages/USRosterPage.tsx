import { PlaceholderPage } from './PlaceholderPage';

export default function USRosterPage() {
  return (
    <PlaceholderPage
      title="US Roster"
      subtitle="US-team FTE roster — billable allocation + bench overlap"
      willContain={[
        'Every US team member (employees, SI, contractors) with status (Allocated / Bench / Notice)',
        'Skill, visa, location, target rate',
        'Cross-link with Open Bench: roster shows everyone, Open Bench shows just the available subset',
        'Filter by visa, allocation status, skill',
      ]}
      meanwhile={{ label: 'Open Bench', to: '/open-bench' }}
    />
  );
}
