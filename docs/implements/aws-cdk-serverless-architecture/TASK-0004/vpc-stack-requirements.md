# TDD 要件定義書: VPC Stack 統合

**タスクID**: TASK-0004
**機能名**: VPC Stack 統合
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-17

---

## 1. 機能の概要

### 1.1 機能説明 🔵

**信頼性**: 🔵 *設計文書・タスク定義書より*

VpcConstruct と EndpointsConstruct を統合した VPC Stack を作成する機能。Stack として他の Stack から参照可能な形で VPC リソースを公開し、CDK アプリケーションのネットワーク基盤を提供する。

### 1.2 解決する問題 🔵

**信頼性**: 🔵 *設計文書より*

- VPC Construct と Endpoints Construct を1つの Stack に統合し、デプロイ単位を明確化
- 他の Stack（Security Stack, Database Stack 等）が VPC リソースを参照できるようにする
- 環境別（Dev/Prod）の設定をパラメータ経由で柔軟に切り替え可能にする

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザストーリーより*

- インフラエンジニア: CDK アプリケーションをデプロイ・管理する
- 開発者: 他の Stack から VPC リソースを参照して構築する

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *設計文書より*

VPC Stack は 6つの CDK Stack 構成における最初の Stack であり、他の全ての Stack の前提となる。

```
VPC Stack (1) → Security Stack (2) → Database Stack (3)
    ↓                   ↓                  ↓
Application Stack (4) → Distribution Stack (5) → Ops Stack (6)
```

**参照したEARS要件**: REQ-001〜011, REQ-401〜405
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - CDK Stack 構成セクション

---

## 2. 入力・出力の仕様

### 2.1 入力パラメータ 🔵

**信頼性**: 🔵 *タスク定義書・設計文書より*

#### VpcStackProps インターフェース

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| config | EnvironmentConfig | Yes | - | 環境別設定オブジェクト |
| env | cdk.Environment | No | undefined | AWS アカウント・リージョン |
| stackName | string | No | undefined | Stack 名 |
| description | string | No | undefined | Stack の説明 |
| tags | Record<string, string> | No | undefined | Stack レベルのタグ |

```typescript
export interface VpcStackProps extends cdk.StackProps {
  /** 環境設定（必須） */
  readonly config: EnvironmentConfig;
}
```

#### EnvironmentConfig の VPC 関連プロパティ 🔵

**信頼性**: 🔵 *parameter.ts 実装より*

| パラメータ | 型 | 用途 |
|-----------|-----|------|
| envName | string | 環境名（dev/prod） |
| account | string | AWS アカウント ID |
| region | string | AWS リージョン |
| vpcCidr | string | VPC の CIDR ブロック |

**参照したEARS要件**: REQ-001, REQ-401, REQ-403
**参照した設計文書**: `infra/parameter.ts` - EnvironmentConfig インターフェース

### 2.2 出力値 🔵

**信頼性**: 🔵 *タスク定義書・CDK ベストプラクティスより*

#### VpcStack のパブリックプロパティ

| プロパティ | 型 | 説明 | 参照先 Stack |
|-----------|-----|------|-------------|
| vpc | ec2.IVpc | VPC 参照 | Security, Database, Application Stack |
| publicSubnets | ec2.ISubnet[] | Public Subnet 配列 | Application Stack (ALB 配置) |
| privateAppSubnets | ec2.ISubnet[] | Private App Subnet 配列 | Application Stack (ECS 配置) |
| privateDbSubnets | ec2.ISubnet[] | Private DB Subnet 配列 | Database Stack (Aurora 配置) |

```typescript
export class VpcStack extends cdk.Stack {
  /** VPC への参照 */
  public readonly vpc: ec2.IVpc;

  /** Public Subnet 配列（ALB 配置用） */
  public readonly publicSubnets: ec2.ISubnet[];

  /** Private App Subnet 配列（ECS 配置用） */
  public readonly privateAppSubnets: ec2.ISubnet[];

  /** Private DB Subnet 配列（Aurora 配置用） */
  public readonly privateDbSubnets: ec2.ISubnet[];
}
```

**参照したEARS要件**: REQ-003, REQ-004, REQ-005
**参照した設計文書**: `docs/tasks/aws-cdk-serverless-architecture/TASK-0004.md` - Stack 間参照の公開セクション

### 2.3 入出力の関係性 🔵

**信頼性**: 🔵 *設計文書より*

```
入力: EnvironmentConfig.vpcCidr
      ↓
処理: VpcConstruct 生成 → EndpointsConstruct 生成
      ↓
出力: vpc, publicSubnets, privateAppSubnets, privateDbSubnets
```

### 2.4 データフロー 🔵

**信頼性**: 🔵 *設計文書より*

```
1. CDK App が VpcStack をインスタンス化
2. VpcStack コンストラクタが config.vpcCidr を使用して VpcConstruct を生成
3. VpcConstruct が VPC, Subnet, IGW, NAT Gateway を作成
4. VpcStack が VpcConstruct.vpc を使用して EndpointsConstruct を生成
5. EndpointsConstruct が VPC Endpoint を作成
6. VpcStack がプロパティを公開（他 Stack から参照可能）
```

**参照したEARS要件**: REQ-001〜011
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 3. 制約条件

### 3.1 パフォーマンス要件 🔵

**信頼性**: 🔵 *要件定義書 NFR-001〜003より*

| 項目 | 要件 | 根拠 |
|------|------|------|
| Multi-AZ | 2つの AZ を使用 | NFR-001 高可用性 |
| NAT Gateway | 各 AZ に 1つ配置 | NFR-003 可用性確保 |
| VPC Endpoint | 7つのエンドポイント | NFR-002 レイテンシ最適化 |

### 3.2 セキュリティ要件 🔵

**信頼性**: 🔵 *要件定義書 NFR-101, REQ-405より*

| 項目 | 要件 | 根拠 |
|------|------|------|
| VPC Endpoint 使用 | AWS サービス通信は VPC Endpoint 経由 | NFR-101 |
| Private DB Subnet | ISOLATED タイプ（外部アクセス不可） | REQ-405 |

### 3.3 互換性要件 🔵

**信頼性**: 🔵 *要件定義書 REQ-401, REQ-403より*

| 項目 | 要件 | 根拠 |
|------|------|------|
| CDK バージョン | AWS CDK v2 | REQ-401 |
| リージョン | ap-northeast-1 (Tokyo) | REQ-403 |

### 3.4 アーキテクチャ制約 🔵

**信頼性**: 🔵 *設計文書より*

| 項目 | 制約内容 |
|------|----------|
| Stack 依存関係 | VpcStack は他の全 Stack の前提 |
| Construct 依存 | VpcConstruct（TASK-0002）、EndpointsConstruct（TASK-0003）が前提 |
| プロパティ公開 | IVpc, ISubnet 等のインターフェース型を使用 |

### 3.5 実装ファイル配置制約 🔵

**信頼性**: 🔵 *設計文書より*

| ファイル | パス |
|---------|------|
| VpcStack 実装 | `infra/lib/stack/vpc-stack.ts` |
| VpcStack テスト | `infra/test/vpc-stack.test.ts` |
| CDK App エントリーポイント | `infra/bin/infra.ts`（更新） |

**参照したEARS要件**: REQ-001〜011, REQ-401, REQ-403, REQ-405, NFR-001〜003, NFR-101
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - 技術的制約セクション

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *タスク定義書より*

#### CDK App でのインスタンス化

```typescript
// bin/infra.ts
import { App } from 'aws-cdk-lib';
import { VpcStack } from '../lib/stack/vpc-stack';
import { devConfig, prodConfig } from '../parameter';

const app = new App();

const env = app.node.tryGetContext('env') || 'dev';
const config = env === 'prod' ? prodConfig : devConfig;

const vpcStack = new VpcStack(app, `VpcStack-${config.envName}`, {
  config,
  env: {
    account: config.account,
    region: config.region,
  },
});
```

#### 他の Stack からの参照

```typescript
// 例: Security Stack での参照
const securityStack = new SecurityStack(app, `SecurityStack-${config.envName}`, {
  config,
  vpc: vpcStack.vpc,  // VpcStack からの参照
  env: { account: config.account, region: config.region },
});
securityStack.addDependency(vpcStack);
```

### 4.2 環境別設定パターン 🔵

**信頼性**: 🔵 *設計文書・parameter.ts より*

```typescript
// Dev 環境
const devVpcStack = new VpcStack(app, 'VpcStack-dev', {
  config: devConfig,  // vpcCidr: '10.0.0.0/16'
});

// Prod 環境
const prodVpcStack = new VpcStack(app, 'VpcStack-prod', {
  config: prodConfig,  // vpcCidr: '10.0.0.0/16'
});
```

### 4.3 エッジケース 🟡

**信頼性**: 🟡 *CDK ベストプラクティスから妥当な推測*

#### config が未設定の場合

- VpcStackProps.config は必須パラメータ
- 未設定の場合は TypeScript コンパイルエラー

#### config.vpcCidr が空文字の場合

- VpcConstruct のデフォルト値（'10.0.0.0/16'）が使用される

### 4.4 エラーケース 🟡

**信頼性**: 🟡 *CDK ベストプラクティスから妥当な推測*

| ケース | 期待動作 |
|--------|----------|
| config 未設定 | TypeScript コンパイルエラー |
| 無効な CIDR | VpcConstruct で CDK エラー |
| AZ 不足のリージョン | VpcConstruct で CDK エラー |

**参照したEARS要件**: REQ-001, REQ-042
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - 環境構成セクション

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー 🔵

**信頼性**: 🔵 *ユーザストーリー文書より*

- インフラエンジニアとして、ネットワーク基盤を CDK でコード管理したい

### 5.2 参照した機能要件 🔵

**信頼性**: 🔵 *要件定義書より*

| 要件ID | 内容 | 実現方法 |
|--------|------|----------|
| REQ-001 | CIDR Block `10.0.0.0/16` の VPC 作成 | VpcConstruct 経由 |
| REQ-002 | 2つの AZ で Multi-AZ 構成 | VpcConstruct 経由 |
| REQ-003 | Public Subnet を `/24` で割り当て | VpcConstruct 経由 |
| REQ-004 | Private App Subnet を `/23` で割り当て | VpcConstruct 経由 |
| REQ-005 | Private DB Subnet を `/24` で割り当て | VpcConstruct 経由 |
| REQ-006 | Internet Gateway を 1個作成 | VpcConstruct 経由 |
| REQ-007 | NAT Gateway を各 AZ に 1個ずつ作成 | VpcConstruct 経由 |
| REQ-008 | SSM 用 VPC Endpoint 作成 | EndpointsConstruct 経由 |
| REQ-009 | ECR 用 VPC Endpoint 作成 | EndpointsConstruct 経由 |
| REQ-010 | CloudWatch Logs 用 VPC Endpoint 作成 | EndpointsConstruct 経由 |
| REQ-011 | S3 用 Gateway Endpoint 作成 | EndpointsConstruct 経由 |

### 5.3 参照した非機能要件 🔵

**信頼性**: 🔵 *要件定義書より*

| 要件ID | 内容 | 実現方法 |
|--------|------|----------|
| NFR-001 | Multi-AZ 構成により高可用性維持 | VpcConstruct で 2 AZ 使用 |
| NFR-002 | VPC Endpoint 使用によりレイテンシ最適化 | EndpointsConstruct |
| NFR-003 | NAT Gateway を各 AZ に配置 | VpcConstruct |
| NFR-101 | VPC Endpoint を使用してトラフィックを AWS 内に閉じる | EndpointsConstruct |

### 5.4 参照した制約要件 🔵

**信頼性**: 🔵 *要件定義書より*

| 要件ID | 内容 |
|--------|------|
| REQ-401 | AWS CDK v2 (TypeScript) を使用 |
| REQ-403 | ap-northeast-1 (Tokyo) にデプロイ |
| REQ-405 | VPC Endpoint 経由で AWS サービスにアクセス |

### 5.5 参照した設計文書

| 文書 | 該当セクション |
|------|---------------|
| architecture.md | CDK Stack 構成、Stack 依存関係、各 Stack の責務 |
| dataflow.md | ネットワーク層データフロー |
| interfaces.ts | EnvironmentConfig |
| TASK-0004.md | VPC Stack 定義、Stack 間参照の公開 |
| note.md | 技術スタック、関連実装、テスト要件 |

---

## 6. テスト要件概要

### 6.1 スナップショットテスト 🔵

**信頼性**: 🔵 *CDK ベストプラクティスより*

CloudFormation テンプレートのスナップショットテストにより意図しない変更を検出。

### 6.2 リソース存在確認テスト 🔵

**信頼性**: 🔵 *要件定義書 REQ-001〜011より*

| テスト項目 | 期待値 |
|-----------|--------|
| VPC | 1つ |
| Subnet | 6つ（Public x2, PrivateApp x2, PrivateDb x2） |
| Internet Gateway | 1つ |
| NAT Gateway | 2つ |
| VPC Endpoint | 7つ（Interface x6, Gateway x1） |

### 6.3 Stack 出力確認テスト 🔵

**信頼性**: 🔵 *CDK ベストプラクティスより*

| テスト項目 | 期待値 |
|-----------|--------|
| vpc プロパティ | 定義されている |
| publicSubnets | 要素数 2 |
| privateAppSubnets | 要素数 2 |
| privateDbSubnets | 要素数 2 |

---

## 7. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 28 | 93% |
| 🟡 黄信号 | 2 | 7% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質 - 要件の93%が要件定義書・設計文書により確認済み

### 黄信号項目一覧

| セクション | 項目 | 理由 |
|-----------|------|------|
| 4.3 | エッジケース | CDK ベストプラクティスからの推測 |
| 4.4 | エラーケース | CDK ベストプラクティスからの推測 |

---

## 8. 関連文書

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0004.md` |
| TDD開発ノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0004/note.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| 依存タスク (VPC Construct) | `docs/tasks/aws-cdk-serverless-architecture/TASK-0002.md` |
| 依存タスク (Endpoints Construct) | `docs/tasks/aws-cdk-serverless-architecture/TASK-0003.md` |
