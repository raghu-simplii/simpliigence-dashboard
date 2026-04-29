import { PlaceholderPage } from './PlaceholderPage';

export default function IndiaHiringForecastPage() {
  return (
    <PlaceholderPage
      title="India Hiring Forecast"
      subtitle="India-scoped hiring demand vs capacity model"
      willContain={[
        'Demand vs capacity per role (BA / Junior Dev / Senior Dev) per month — India only',
        'Hires-needed model based on India staffing requisitions and pipeline',
        'Tunable scenarios (target utilization, forecast window) scoped to India team',
        'Pulls from India Demand requisitions instead of company-wide allocations',
      ]}
      meanwhile={{ label: 'Hiring Forecast (company-wide)', to: '/hiring-forecast' }}
    />
  );
}
