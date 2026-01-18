#!/usr/bin/env node
/**
 * CDK App エントリーポイント
 *
 * TASK-0004: VPC Stack 統合
 * フェーズ: TDD Refactor Phase - bin/infra.ts への VpcStack 統合
 *
 * 【機能概要】: CDK アプリケーションのエントリーポイント
 * 【実装方針】: 環境別設定に基づいて VpcStack をインスタンス化
 * 🔵 信頼性レベル: タスク定義書・設計文書に基づく実装
 *
 * @module infra
 */

import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stack/vpc-stack';
import { devConfig, prodConfig } from '../parameter';

// ============================================================================
// 【CDK App 作成】
// ============================================================================

const app = new cdk.App();

// ============================================================================
// 【環境設定取得】: コンテキストから環境を判定し、適切な設定を選択
// 【デフォルト値】: 指定がない場合は 'dev' 環境を使用
// 🔵 信頼性: タスク定義書より
// ============================================================================

const env = app.node.tryGetContext('env') || 'dev';
const config = env === 'prod' ? prodConfig : devConfig;

// ============================================================================
// 【VpcStack インスタンス化】
// 【Stack ID】: 環境名を含めて一意に識別
// 【設計方針】: 他の Stack の基盤となるネットワークリソースを提供
// 🔵 信頼性: タスク定義書・設計文書より
// ============================================================================

/**
 * VPC Stack
 *
 * 【構成内容】:
 * - VPC: CIDR 10.0.0.0/16
 * - Public Subnet x 2 (ALB 配置用)
 * - Private App Subnet x 2 (ECS 配置用)
 * - Private DB Subnet x 2 (Aurora 配置用)
 * - Internet Gateway x 1
 * - NAT Gateway x 2 (各 AZ に 1 つ)
 * - VPC Endpoints x 7 (SSM x3, ECR x2, Logs x1, S3 x1)
 *
 * 【後続 Stack への提供】:
 * - vpc: VPC 参照
 * - publicSubnets: Public Subnet 配列
 * - privateAppSubnets: Private App Subnet 配列
 * - privateDbSubnets: Private DB Subnet 配列
 */
const vpcStack = new VpcStack(app, `VpcStack-${config.envName}`, {
  config,
  env: {
    account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: config.region,
  },
  description: `VPC Stack for ${config.envName} environment - Network infrastructure including VPC, Subnets, Gateways, and VPC Endpoints`,
  tags: {
    Environment: config.envName,
    Project: 'tsumiki-test-project',
    ManagedBy: 'CDK',
  },
});

// ============================================================================
// 【将来の Stack 参照用エクスポート】
// 【用途】: 後続タスク（Security Stack, Database Stack など）で vpcStack を参照
// 🔵 信頼性: 設計文書より
// ============================================================================

// 【参考】: 後続の Stack で以下のように参照可能
// const securityStack = new SecurityStack(app, `SecurityStack-${config.envName}`, {
//   config,
//   vpc: vpcStack.vpc,
//   env: { account: config.account, region: config.region },
// });
// securityStack.addDependency(vpcStack);

// ============================================================================
// 【CDK App 合成】
// 【処理内容】: 全 Stack の CloudFormation テンプレートを生成
// ============================================================================

app.synth();
