# TASK-0003: VPC Endpoints Construct - TDD Red Phase 記録

**タスクID**: TASK-0003
**機能名**: VPC Endpoints Construct
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-17
**フェーズ**: Red Phase (失敗するテスト作成)

---

## 1. 概要

TDD の Red フェーズとして、VPC Endpoints Construct の失敗するテストケースを作成しました。

### 1.1 作成したファイル

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/vpc/endpoints-construct.ts` | スタブ実装（空の Construct） |
| `infra/test/construct/vpc/endpoints-construct.test.ts` | テストファイル（29 テストケース） |

### 1.2 テスト実行結果

```
Tests:       22 failed, 7 passed, 29 total
```

- **失敗**: 22 テスト (期待通り - スタブ実装のため)
- **成功**: 7 テスト (全フラグ false 系、重複 ID エラー系)

---

## 2. テストケース一覧

### 2.1 正常系テストケース (基本動作)

| テストID | テスト名 | 信頼性 | 結果 |
|---------|---------|--------|------|
| TC-VPCE-01-01 | ssm Interface Endpoint が作成されること | 🔵 | FAIL |
| TC-VPCE-01-02 | ssmmessages Interface Endpoint が作成されること | 🔵 | FAIL |
| TC-VPCE-01-03 | ec2messages Interface Endpoint が作成されること | 🔵 | FAIL |
| TC-VPCE-01-04 | SSM Endpoints の公開プロパティが定義されていること | 🔵 | FAIL |
| TC-VPCE-02-01 | ecr.api Interface Endpoint が作成されること | 🔵 | FAIL |
| TC-VPCE-02-02 | ecr.dkr Interface Endpoint が作成されること | 🔵 | FAIL |
| TC-VPCE-02-03 | ECR Endpoints の公開プロパティが定義されていること | 🔵 | FAIL |
| TC-VPCE-03-01 | logs Interface Endpoint が作成されること | 🔵 | FAIL |
| TC-VPCE-03-02 | CloudWatch Logs Endpoint の公開プロパティが定義されていること | 🔵 | FAIL |
| TC-VPCE-04-01 | S3 Gateway Endpoint が作成されること | 🔵 | FAIL |
| TC-VPCE-04-02 | S3 Gateway Endpoint が RouteTableIds を持つこと | 🔵 | FAIL |
| TC-VPCE-04-03 | S3 Gateway Endpoint の公開プロパティが定義されていること | 🔵 | FAIL |
| TC-VPCE-05-01 | Interface Endpoint が Private App Subnet に配置されること | 🔵 | FAIL |
| TC-VPCE-06-01 | Interface Endpoint に Security Group が関連付けられること | 🔵 | FAIL |
| TC-VPCE-07-01 | デフォルト Props で 7 つの Endpoint が作成されること | 🔵 | FAIL |

### 2.2 正常系テストケース (選択的 Endpoint 作成)

| テストID | テスト名 | 信頼性 | 結果 |
|---------|---------|--------|------|
| TC-VPCE-08-01 | enableSsm=false で SSM Endpoint が作成されないこと | 🟡 | PASS |
| TC-VPCE-08-02 | enableSsm=false で 4 つの Endpoint が作成されること | 🟡 | FAIL |
| TC-VPCE-09-01 | enableEcr=false で ECR Endpoint が作成されないこと | 🟡 | PASS |
| TC-VPCE-09-02 | enableEcr=false で 5 つの Endpoint が作成されること | 🟡 | FAIL |
| TC-VPCE-10-01 | enableLogs=false で CloudWatch Logs Endpoint が作成されないこと | 🟡 | PASS |
| TC-VPCE-10-02 | enableLogs=false で 6 つの Endpoint が作成されること | 🟡 | FAIL |
| TC-VPCE-11-01 | enableS3=false で S3 Gateway Endpoint が作成されないこと | 🟡 | PASS |
| TC-VPCE-11-02 | enableS3=false で 6 つの Endpoint が作成されること | 🟡 | FAIL |

### 2.3 境界値テストケース

| テストID | テスト名 | 信頼性 | 結果 |
|---------|---------|--------|------|
| TC-VPCE-12-01 | 全フラグ false で Endpoint が 0 個であること | 🟡 | PASS |
| TC-VPCE-12-02 | 全フラグ false で全公開プロパティが undefined であること | 🟡 | PASS |
| TC-VPCE-13-01 | vpc のみ指定でデフォルトで全 Endpoint が作成されること | 🟡 | FAIL |
| TC-VPCE-14-01 | Interface Endpoint が 2 つの Subnet に配置されること | 🟡 | FAIL |
| TC-VPCE-15-01 | S3 Gateway Endpoint が複数の Route Table に関連付けられること | 🟡 | FAIL |

### 2.4 異常系テストケース

| テストID | テスト名 | 信頼性 | 結果 |
|---------|---------|--------|------|
| TC-VPCE-18-01 | 同じ ID で重複作成がエラーになること | 🔴 | PASS |

---

## 3. 期待される失敗メッセージ

### 3.1 Endpoint 未作成エラー

```
Message:
  Template has 0 resources with type AWS::EC2::VPCEndpoint.
No matches found
```

このエラーは、スタブ実装が何も作成しないため、AWS::EC2::VPCEndpoint リソースが存在しないことを示しています。

### 3.2 リソース数不一致エラー

```
Message:
  Expected 7 resources of type AWS::EC2::VPCEndpoint but found 0
```

このエラーは、期待する Endpoint 数と実際の数が一致しないことを示しています。

### 3.3 プロパティ未定義エラー

```
expect(received).toBeDefined()

Received: undefined
```

このエラーは、公開プロパティが undefined であることを示しています。

---

## 4. スタブ実装

### 4.1 ファイル: `infra/lib/construct/vpc/endpoints-construct.ts`

```typescript
/**
 * VPC Endpoints Construct 実装 - スタブ
 *
 * TASK-0003: VPC Endpoints Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテスト用の最小限スタブ
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

  constructor(scope: Construct, id: string, _props: EndpointsConstructProps) {
    super(scope, id);
    // スタブ: 何も作成しない
  }
}
```

---

## 5. Green フェーズで実装すべき内容

### 5.1 Interface Endpoint の実装

1. **SSM Endpoints** (enableSsm=true の場合)
   - `vpc.addInterfaceEndpoint()` で ssm, ssmmessages, ec2messages を作成
   - `privateDnsEnabled: true` を設定
   - Private App Subnet に配置

2. **ECR Endpoints** (enableEcr=true の場合)
   - `vpc.addInterfaceEndpoint()` で ecr.api, ecr.dkr を作成
   - `privateDnsEnabled: true` を設定
   - Private App Subnet に配置

3. **CloudWatch Logs Endpoint** (enableLogs=true の場合)
   - `vpc.addInterfaceEndpoint()` で logs を作成
   - `privateDnsEnabled: true` を設定
   - Private App Subnet に配置

### 5.2 Gateway Endpoint の実装

4. **S3 Gateway Endpoint** (enableS3=true の場合)
   - `vpc.addGatewayEndpoint()` で S3 を作成
   - Private App Subnet と Private DB Subnet の Route Table に関連付け

### 5.3 公開プロパティの設定

- 作成した各 Endpoint をクラスプロパティに設定
- フラグが false の場合は undefined のまま

---

## 6. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 15 | 52% |
| 🟡 黄信号 | 13 | 45% |
| 🔴 赤信号 | 1 | 3% |

**品質評価**: ✅ 高品質
- テストケースが要件定義書に基づいている
- 正常系・異常系・境界値が網羅されている
- 期待値が明確で具体的

---

## 7. 次のステップ

**Green フェーズ**: `/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0003`

Green フェーズでは、テストを通すための最小限の実装を行います。

---

## 変更履歴

| 日付 | 版 | 変更内容 |
|------|-----|---------|
| 2026-01-17 | 1.0 | Red Phase 完了 |
