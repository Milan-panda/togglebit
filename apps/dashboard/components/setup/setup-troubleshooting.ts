export const TROUBLESHOOTING_ITEMS = [
  {
    title: 'Wrong environment',
    body: 'API keys are scoped to dev, staging, or prod. Your SDK environment must match the key prefix (tb_dev_, tb_staging_, tb_prod_).',
  },
  {
    title: 'Missing userId',
    body: 'Percentage and combined flags need a stable userId for consistent bucketing. Pass user.id from your auth layer.',
  },
  {
    title: '403 Forbidden',
    body: 'Check that your API key is valid, not revoked, and belongs to the same org as your flags.',
  },
  {
    title: 'Cache staleness',
    body: 'The SDK caches evaluations for ~30s. Config changes in the dashboard may take a moment to appear in your app.',
  },
] as const
