export interface EnvironmentConfig {
  envName: string;
  account: string;
  region: string;
  vpcCidr: string;
  taskCpu: number;
  taskMemory: number;
  desiredCount: number;
  auroraMinCapacity: number;
  auroraMaxCapacity: number;
  logRetentionDays: number;
  slackWorkspaceId: string;
  slackChannelId: string;
}

export const devConfig: EnvironmentConfig = {
  envName: 'dev',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: 'ap-northeast-1',
  vpcCidr: '10.0.0.0/16',
  taskCpu: 512,
  taskMemory: 1024,
  desiredCount: 2,
  auroraMinCapacity: 0.5,
  auroraMaxCapacity: 2,
  logRetentionDays: 3,
  slackWorkspaceId: '',
  slackChannelId: '',
};

export const prodConfig: EnvironmentConfig = {
  envName: 'prod',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: 'ap-northeast-1',
  vpcCidr: '10.0.0.0/16',
  taskCpu: 512,
  taskMemory: 1024,
  desiredCount: 2,
  auroraMinCapacity: 0.5,
  auroraMaxCapacity: 2,
  logRetentionDays: 30,
  slackWorkspaceId: '',
  slackChannelId: '',
};
