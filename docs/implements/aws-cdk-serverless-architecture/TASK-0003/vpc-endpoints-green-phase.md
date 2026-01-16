# TASK-0003: VPC Endpoints Construct - TDD Green Phase 記録

**タスクID**: TASK-0003
**機能名**: VPC Endpoints Construct
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-17
**フェーズ**: Green Phase (テストを通す最小限の実装)

---

## 1. 概要

TDD の Green フェーズとして、Red フェーズで作成した失敗するテストケースを通すための最小限の実装を行いました。

### 1.1 実装ファイル

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/vpc/endpoints-construct.ts` | VPC Endpoints Construct 実装 (246行) |
| `infra/test/construct/vpc/endpoints-construct.test.ts` | テストファイル（修正: 2テスト） |

### 1.2 テスト実行結果

```
Test Suites: 3 passed, 3 total
Tests:       54 passed, 54 total
```

- **EndpointsConstruct テスト**: 29 passed (全成功)
- **VpcConstruct テスト**: 24 passed (影響なし)
- **基本テスト**: 1 passed

---

## 2. 実装方針

### 2.1 実装したコンポーネント

**1. SSM Interface Endpoints (REQ-008)** 🔵
- ssm: SSM Session Manager API 用
- ssmmessages: SSM Session Manager メッセージ用
- ec2messages: SSM エージェントメッセージ用

**2. ECR Interface Endpoints (REQ-009)** 🔵
- ecr.api: ECR API 用
- ecr.dkr: Docker イメージ Pull 用

**3. CloudWatch Logs Interface Endpoint (REQ-010)** 🔵
- logs: ECS タスクからのログ送信用

**4. S3 Gateway Endpoint (REQ-011)** 🔵
- S3: ECR イメージレイヤー取得、S3 アクセス用（無料）

### 2.2 配置設計

| Endpoint タイプ | 配置先 | 設定 |
|----------------|--------|------|
| Interface Endpoint | Private App Subnet (PRIVATE_WITH_EGRESS) | privateDnsEnabled: true |
| Gateway Endpoint | Private App Subnet + Private DB Subnet の Route Table | - |

### 2.3 Props のデフォルト値

| Props | デフォルト値 | 説明 |
|-------|-------------|------|
| enableSsm | true | SSM Endpoints を作成 |
| enableEcr | true | ECR Endpoints を作成 |
| enableLogs | true | CloudWatch Logs Endpoint を作成 |
| enableS3 | true | S3 Gateway Endpoint を作成 |

---

## 3. 実装コード

### 3.1 ファイル: `infra/lib/construct/vpc/endpoints-construct.ts`

```typescript
/**
 * VPC Endpoints Construct 実装
 *
 * TASK-0003: VPC Endpoints Construct 実装
 * フェーズ: TDD Green Phase - テストを通す最小限の実装
 *
 * 【機能概要】: VPC Endpoint を一元管理する CDK Construct
 * 【実装方針】: テストケースを通すために最低限必要な機能を実装
 * 【テスト対応】: TC-VPCE-01 〜 TC-VPCE-18 の 29 テストケースを通すための実装
 * 🔵 信頼性レベル: 要件定義書 REQ-008 〜 REQ-011 に基づく実装
 *
 * @module EndpointsConstruct
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface EndpointsConstructProps {
  readonly vpc: ec2.IVpc;
  readonly enableSsm?: boolean;
  readonly enableEcr?: boolean;
  readonly enableLogs?: boolean;
  readonly enableS3?: boolean;
}

export class EndpointsConstruct extends Construct {
  public readonly ssmEndpoint?: ec2.IInterfaceVpcEndpoint;
  public readonly ssmMessagesEndpoint?: ec2.IInterfaceVpcEndpoint;
  public readonly ec2MessagesEndpoint?: ec2.IInterfaceVpcEndpoint;
  public readonly ecrApiEndpoint?: ec2.IInterfaceVpcEndpoint;
  public readonly ecrDkrEndpoint?: ec2.IInterfaceVpcEndpoint;
  public readonly logsEndpoint?: ec2.IInterfaceVpcEndpoint;
  public readonly s3Endpoint?: ec2.IGatewayVpcEndpoint;

  constructor(scope: Construct, id: string, props: EndpointsConstructProps) {
    super(scope, id);

    const enableSsm = props.enableSsm ?? true;
    const enableEcr = props.enableEcr ?? true;
    const enableLogs = props.enableLogs ?? true;
    const enableS3 = props.enableS3 ?? true;

    const vpc = props.vpc;
    const interfaceEndpointSubnets: ec2.SubnetSelection = {
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    };

    // SSM Interface Endpoints
    if (enableSsm) {
      this.ssmEndpoint = vpc.addInterfaceEndpoint('SsmEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SSM,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
      this.ssmMessagesEndpoint = vpc.addInterfaceEndpoint('SsmMessagesEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
      this.ec2MessagesEndpoint = vpc.addInterfaceEndpoint('Ec2MessagesEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
    }

    // ECR Interface Endpoints
    if (enableEcr) {
      this.ecrApiEndpoint = vpc.addInterfaceEndpoint('EcrApiEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
      this.ecrDkrEndpoint = vpc.addInterfaceEndpoint('EcrDkrEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
    }

    // CloudWatch Logs Interface Endpoint
    if (enableLogs) {
      this.logsEndpoint = vpc.addInterfaceEndpoint('LogsEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
    }

    // S3 Gateway Endpoint
    if (enableS3) {
      this.s3Endpoint = vpc.addGatewayEndpoint('S3Endpoint', {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        subnets: [
          { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        ],
      });
    }
  }
}
```

---

## 4. テスト修正

### 4.1 修正内容

S3 Gateway Endpoint のテストで、ServiceName が `Fn::Join` 関数として生成されるため、正規表現マッチが失敗する問題を修正しました。

**修正前**:
```typescript
template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
  ServiceName: Match.stringLikeRegexp('.*s3$'),
  VpcEndpointType: 'Gateway',
});
```

**修正後**:
```typescript
const gatewayEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
  Properties: {
    VpcEndpointType: 'Gateway',
  },
});
expect(Object.keys(gatewayEndpoints).length).toBe(1);
const s3Endpoint = Object.values(gatewayEndpoints)[0] as any;
expect(JSON.stringify(s3Endpoint.Properties.ServiceName)).toContain('s3');
```

### 4.2 修正理由

CDK の `addGatewayEndpoint()` メソッドは、ServiceName を `Fn::Join` 関数で生成するため、文字列の正規表現マッチが失敗します。修正後は `findResources` で Gateway タイプの Endpoint を取得し、ServiceName に 's3' が含まれることを JSON 文字列化して確認するようにしました。

---

## 5. テスト結果詳細

### 5.1 全テストケース結果

| テストID | テスト名 | 結果 |
|---------|---------|------|
| TC-VPCE-01-01 | ssm Interface Endpoint が作成されること | ✅ PASS |
| TC-VPCE-01-02 | ssmmessages Interface Endpoint が作成されること | ✅ PASS |
| TC-VPCE-01-03 | ec2messages Interface Endpoint が作成されること | ✅ PASS |
| TC-VPCE-01-04 | SSM Endpoints の公開プロパティが定義されていること | ✅ PASS |
| TC-VPCE-02-01 | ecr.api Interface Endpoint が作成されること | ✅ PASS |
| TC-VPCE-02-02 | ecr.dkr Interface Endpoint が作成されること | ✅ PASS |
| TC-VPCE-02-03 | ECR Endpoints の公開プロパティが定義されていること | ✅ PASS |
| TC-VPCE-03-01 | logs Interface Endpoint が作成されること | ✅ PASS |
| TC-VPCE-03-02 | CloudWatch Logs Endpoint の公開プロパティが定義されていること | ✅ PASS |
| TC-VPCE-04-01 | S3 Gateway Endpoint が作成されること | ✅ PASS |
| TC-VPCE-04-02 | S3 Gateway Endpoint が RouteTableIds を持つこと | ✅ PASS |
| TC-VPCE-04-03 | S3 Gateway Endpoint の公開プロパティが定義されていること | ✅ PASS |
| TC-VPCE-05-01 | Interface Endpoint が Private App Subnet に配置されること | ✅ PASS |
| TC-VPCE-06-01 | Interface Endpoint に Security Group が関連付けられること | ✅ PASS |
| TC-VPCE-07-01 | デフォルト Props で 7 つの Endpoint が作成されること | ✅ PASS |
| TC-VPCE-08-01 | enableSsm=false で SSM Endpoint が作成されないこと | ✅ PASS |
| TC-VPCE-08-02 | enableSsm=false で 4 つの Endpoint が作成されること | ✅ PASS |
| TC-VPCE-09-01 | enableEcr=false で ECR Endpoint が作成されないこと | ✅ PASS |
| TC-VPCE-09-02 | enableEcr=false で 5 つの Endpoint が作成されること | ✅ PASS |
| TC-VPCE-10-01 | enableLogs=false で CloudWatch Logs Endpoint が作成されないこと | ✅ PASS |
| TC-VPCE-10-02 | enableLogs=false で 6 つの Endpoint が作成されること | ✅ PASS |
| TC-VPCE-11-01 | enableS3=false で S3 Gateway Endpoint が作成されないこと | ✅ PASS |
| TC-VPCE-11-02 | enableS3=false で 6 つの Endpoint が作成されること | ✅ PASS |
| TC-VPCE-12-01 | 全フラグ false で Endpoint が 0 個であること | ✅ PASS |
| TC-VPCE-12-02 | 全フラグ false で全公開プロパティが undefined であること | ✅ PASS |
| TC-VPCE-13-01 | vpc のみ指定でデフォルトで全 Endpoint が作成されること | ✅ PASS |
| TC-VPCE-14-01 | Interface Endpoint が 2 つの Subnet に配置されること | ✅ PASS |
| TC-VPCE-15-01 | S3 Gateway Endpoint が複数の Route Table に関連付けられること | ✅ PASS |
| TC-VPCE-18-01 | 同じ ID で重複作成がエラーになること | ✅ PASS |

---

## 6. 品質評価

### 6.1 品質判定結果

**評価**: ✅ **高品質**

| 項目 | 結果 | 詳細 |
|------|------|------|
| テスト結果 | ✅ | 全29テストが成功（全54テストが成功） |
| 実装品質 | ✅ | シンプルかつ動作する |
| リファクタ箇所 | ✅ | 明確に特定可能 |
| 機能的問題 | ✅ | なし |
| コンパイルエラー | ✅ | なし |
| ファイルサイズ | ✅ | 246行（800行以下） |
| モック使用 | ✅ | 実装コードにモック・スタブが含まれていない |

### 6.2 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 18 | 62% |
| 🟡 黄信号 | 11 | 38% |
| 🔴 赤信号 | 0 | 0% |

---

## 7. 課題・改善点（Refactor フェーズで対応）

### 7.1 コード品質の改善

1. **定数抽出**: Endpoint 名の定数化
2. **JSDoc 強化**: 公開プロパティの詳細説明追加
3. **エラーハンドリング**: VPC に PRIVATE_WITH_EGRESS サブネットがない場合の対応

### 7.2 リファクタリング候補

1. **Endpoint 作成のヘルパーメソッド**: Interface Endpoint 作成の共通化
2. **設定オブジェクトの導入**: 各 Endpoint の詳細設定をカスタマイズ可能に
3. **Security Group のカスタマイズ**: カスタム Security Group の指定をサポート

---

## 8. 次のステップ

**Refactor フェーズ**: `/tsumiki:tdd-refactor aws-cdk-serverless-architecture TASK-0003`

Refactor フェーズでは、以下の改善を行います:
- コードの整理・最適化
- JSDoc コメントの強化
- 定数の抽出
- エラーハンドリングの追加

---

## 変更履歴

| 日付 | 版 | 変更内容 |
|------|-----|---------|
| 2026-01-17 | 1.0 | Green Phase 完了 |
