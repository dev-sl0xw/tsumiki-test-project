# TASK-0003: VPC Endpoints Construct 実装 - TDD開発ノート

**タスクID**: TASK-0003
**タスクタイプ**: TDD
**推定工数**: 6時間
**フェーズ**: Phase 1 - 基盤構築

---

## 1. 技術スタック

### 使用技術・フレームワーク

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| IaC | AWS CDK | v2.213.0 |
| 言語 | TypeScript | ~5.6.3 |
| テスト | Jest | ^29.7.0 |
| ランタイム | Node.js | ES2018 Target |

### アーキテクチャパターン

- **パターン**: Multi-Tier Serverless Architecture
- **ネットワーク構成**: 3層サブネット構成 (Public / Private App / Private DB)
- **通信最適化**: VPC Endpoint 経由で AWS サービスにアクセス
- **可用性**: Multi-AZ (ap-northeast-1a, ap-northeast-1c)

### 主要CDKモジュール

```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
```

**参照元**:
- `infra/package.json`
- `infra/tsconfig.json`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 2. 開発ルール

### プロジェクト固有ルール

1. **CDKコマンド実行**: `npx` を使用してワークスペースローカルのCDKバージョンを使用
2. **パラメータ管理**: `parameter.ts` で環境別設定を管理
3. **スタック分割**: 機能別に6つのスタックに分割
4. **テスト方式**: Jest スナップショットテスト

### コーディング規約

| 項目 | 規約 |
|------|------|
| ファイル命名 | kebab-case (例: `endpoints-construct.ts`) |
| クラス命名 | PascalCase (例: `EndpointsConstruct`) |
| インターフェース | 型定義ファイルで一元管理 |
| エクスポート | Named Export を使用 |

### ディレクトリ構造

```
infra/
├── bin/
│   └── infra.ts              # CDK App エントリーポイント
├── lib/
│   ├── stack/                # Stack 定義
│   │   └── vpc-stack.ts
│   └── construct/            # Construct 定義
│       └── vpc/
│           ├── vpc-construct.ts      # 依存先（TASK-0002）
│           └── endpoints-construct.ts # 実装対象
├── test/
│   └── construct/
│       └── vpc/
│           ├── vpc-construct.test.ts
│           └── endpoints-construct.test.ts  # テストファイル
└── parameter.ts              # 環境別パラメータ
```

**参照元**:
- `CLAUDE.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 3. 関連実装

### 既存コード（依存先）

| ファイル | 内容 |
|---------|------|
| `infra/lib/construct/vpc/vpc-construct.ts` | VPC Construct 実装 (TASK-0002 完了) |
| `infra/test/construct/vpc/vpc-construct.test.ts` | VPC Construct テスト |
| `infra/bin/infra.ts` | CDK Appエントリーポイント |

### VpcConstruct インターフェース

```typescript
// VpcConstruct から取得可能なプロパティ
export class VpcConstruct extends Construct {
  public readonly vpc: ec2.IVpc;           // VPC への参照
  public readonly publicSubnets: ec2.ISubnet[];     // Public Subnet 配列
  public readonly privateAppSubnets: ec2.ISubnet[]; // Private App Subnet 配列
  public readonly privateDbSubnets: ec2.ISubnet[];  // Private DB Subnet 配列
}
```

### VPC Endpoint 作成パターン (CDK標準)

**Interface Endpoint**:
```typescript
vpc.addInterfaceEndpoint('EndpointName', {
  service: ec2.InterfaceVpcEndpointAwsService.SERVICE_NAME,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  privateDnsEnabled: true,
});
```

**Gateway Endpoint**:
```typescript
vpc.addGatewayEndpoint('S3Endpoint', {
  service: ec2.GatewayVpcEndpointAwsService.S3,
  subnets: [
    { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  ],
});
```

**参照元**:
- `infra/lib/construct/vpc/vpc-construct.ts`
- `infra/test/construct/vpc/vpc-construct.test.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0003.md`

---

## 4. 設計文書

### アーキテクチャ仕様

#### VPC Endpoints 構成 🔵

**信頼性**: 🔵 *要件定義書 REQ-008〜011より*

| Endpoint | Type | サービス名 | 用途 |
|----------|------|-----------|------|
| ssm | Interface | SSM | SSM Session Manager |
| ssmmessages | Interface | SSM_MESSAGES | SSM Session Manager メッセージ |
| ec2messages | Interface | EC2_MESSAGES | EC2 メッセージ |
| ecr.api | Interface | ECR | ECR API |
| ecr.dkr | Interface | ECR_DOCKER | ECR Docker レジストリ |
| logs | Interface | CLOUDWATCH_LOGS | CloudWatch Logs |
| s3 | Gateway | S3 | S3 アクセス |

#### Endpoint 配置設計

**Interface Endpoint の配置先**:
- Private App Subnet (PRIVATE_WITH_EGRESS) に配置
- Private DNS を有効化（VPC 内から AWS サービス名で解決可能）

**Gateway Endpoint の配置先**:
- Private App Subnet と Private DB Subnet 両方のルートテーブルに追加
- コスト無料（Gateway Endpoint は課金なし）

### 関連要件 (REQ)

| 要件ID | 内容 | 信頼性 |
|--------|------|--------|
| REQ-008 | Systems Manager (ssm, ssmmessages, ec2messages) 用の VPC Endpoint を作成 | 🔵 |
| REQ-009 | ECR (ecr.api, ecr.dkr) 用の VPC Endpoint を作成 | 🔵 |
| REQ-010 | CloudWatch Logs (logs) 用の VPC Endpoint を作成 | 🔵 |
| REQ-011 | S3 用の Gateway Endpoint を作成 | 🔵 |
| REQ-405 | VPC Endpoint 経由で AWS サービスにアクセス | 🔵 |

### 型定義インターフェース

```typescript
// VpcEndpointsConfig (interfaces.ts より)
export interface VpcEndpointsConfig {
  /** SSM Endpoints (ssm, ssmmessages, ec2messages) */
  readonly ssm: boolean;

  /** ECR Endpoints (ecr.api, ecr.dkr) */
  readonly ecr: boolean;

  /** CloudWatch Logs Endpoint (logs) */
  readonly logs: boolean;

  /** S3 Gateway Endpoint */
  readonly s3: boolean;
}
```

### VPC 内部通信フロー

```
┌──────────────────────────────────────────────────────────────────┐
│                    Private App Subnet                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  ECS Fargate Task                           │  │
│  │                                                             │  │
│  │  ECR Pull ──────────────────────────────────────────────────┼──┼──┐
│  │  CW Logs ───────────────────────────────────────────────────┼──┼──┼──┐
│  │  SSM (ECS Exec) ────────────────────────────────────────────┼──┼──┼──┼──┐
│  └────────────────────────────────────────────────────────────┘  │  │  │  │
└──────────────────────────────────────────────────────────────────┘  │  │  │
                                                                      │  │  │
┌─────────────────────────────────────────────────────────────────────┼──┼──┼─┐
│                        VPC Endpoints                                │  │  │ │
│                                                                     │  │  │ │
│  ┌─────────────────┐                                                │  │  │ │
│  │   ecr.api       │◄───────────────────────────────────────────────┘  │  │ │
│  │   ecr.dkr       │                                                   │  │ │
│  └─────────────────┘                                                   │  │ │
│                                                                        │  │ │
│  ┌─────────────────┐                                                   │  │ │
│  │      logs       │◄──────────────────────────────────────────────────┘  │ │
│  └─────────────────┘                                                      │ │
│                                                                           │ │
│  ┌─────────────────┐                                                      │ │
│  │      ssm        │◄─────────────────────────────────────────────────────┘ │
│  │   ssmmessages   │                                                        │
│  │   ec2messages   │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │   S3 Gateway    │  (Route Table に追加)                                   │
│  └─────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 5. テスト要件

### テストケース概要

| テストID | 内容 | 信頼性 |
|---------|------|--------|
| TC-VPCE-01 | SSM Interface Endpoints が作成される | 🔵 |
| TC-VPCE-02 | ECR Interface Endpoints が作成される | 🔵 |
| TC-VPCE-03 | CloudWatch Logs Interface Endpoint が作成される | 🔵 |
| TC-VPCE-04 | S3 Gateway Endpoint が作成される | 🔵 |

### 詳細テストケース

#### TC-VPCE-01: SSM Interface Endpoints 🔵

**信頼性**: 🔵 *要件定義書 REQ-008より*

- ssm Interface Endpoint が作成されていること
- ssmmessages Interface Endpoint が作成されていること
- ec2messages Interface Endpoint が作成されていること
- 各 Endpoint が Private App Subnet に配置されていること
- Private DNS が有効化されていること

#### TC-VPCE-02: ECR Interface Endpoints 🔵

**信頼性**: 🔵 *要件定義書 REQ-009より*

- ecr.api Interface Endpoint が作成されていること
- ecr.dkr Interface Endpoint が作成されていること
- 各 Endpoint が Private App Subnet に配置されていること
- Private DNS が有効化されていること

#### TC-VPCE-03: CloudWatch Logs Endpoint 🔵

**信頼性**: 🔵 *要件定義書 REQ-010より*

- logs Interface Endpoint が作成されていること
- Endpoint が Private App Subnet に配置されていること
- Private DNS が有効化されていること

#### TC-VPCE-04: S3 Gateway Endpoint 🔵

**信頼性**: 🔵 *要件定義書 REQ-011より*

- S3 Gateway Endpoint が作成されていること
- Route Table に S3 へのルートが追加されていること
- Private App Subnet と Private DB Subnet の両方から利用可能であること

### テスト実装パターン

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcConstruct } from '../../../lib/construct/vpc/vpc-construct';
import { EndpointsConstruct } from '../../../lib/construct/vpc/endpoints-construct';

describe('EndpointsConstruct', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    const vpcConstruct = new VpcConstruct(stack, 'TestVpc');
    new EndpointsConstruct(stack, 'TestEndpoints', {
      vpc: vpcConstruct.vpc,
    });
    template = Template.fromStack(stack);
  });

  // Interface Endpoint のテスト
  test('creates SSM Interface Endpoint', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: Match.stringLikeRegexp('.*ssm$'),
      VpcEndpointType: 'Interface',
    });
  });

  // Gateway Endpoint のテスト
  test('creates S3 Gateway Endpoint', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: Match.stringLikeRegexp('.*s3$'),
      VpcEndpointType: 'Gateway',
    });
  });
});
```

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0003.md`
- `infra/test/construct/vpc/vpc-construct.test.ts`

---

## 6. 実装対象ファイル

### 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/vpc/endpoints-construct.ts` | VPC Endpoints Construct 実装 |
| `infra/test/construct/vpc/endpoints-construct.test.ts` | VPC Endpoints Construct テスト |

### 実装インターフェース

```typescript
// EndpointsConstructProps
export interface EndpointsConstructProps {
  /** VPC への参照（必須） */
  readonly vpc: ec2.IVpc;

  /** SSM Endpoints を作成するかどうか */
  readonly enableSsm?: boolean;    // default: true

  /** ECR Endpoints を作成するかどうか */
  readonly enableEcr?: boolean;    // default: true

  /** CloudWatch Logs Endpoint を作成するかどうか */
  readonly enableLogs?: boolean;   // default: true

  /** S3 Gateway Endpoint を作成するかどうか */
  readonly enableS3?: boolean;     // default: true
}

// EndpointsConstruct
export class EndpointsConstruct extends Construct {
  /** SSM Interface Endpoint (ssm) */
  public readonly ssmEndpoint?: ec2.IInterfaceVpcEndpoint;

  /** SSM Messages Interface Endpoint */
  public readonly ssmMessagesEndpoint?: ec2.IInterfaceVpcEndpoint;

  /** EC2 Messages Interface Endpoint */
  public readonly ec2MessagesEndpoint?: ec2.IInterfaceVpcEndpoint;

  /** ECR API Interface Endpoint */
  public readonly ecrApiEndpoint?: ec2.IInterfaceVpcEndpoint;

  /** ECR Docker Interface Endpoint */
  public readonly ecrDkrEndpoint?: ec2.IInterfaceVpcEndpoint;

  /** CloudWatch Logs Interface Endpoint */
  public readonly logsEndpoint?: ec2.IInterfaceVpcEndpoint;

  /** S3 Gateway Endpoint */
  public readonly s3Endpoint?: ec2.IGatewayVpcEndpoint;
}
```

---

## 7. 注意事項

### 技術的制約

| 項目 | 制約内容 |
|------|----------|
| リージョン | ap-northeast-1 (Tokyo) 固定 |
| 配置先 | Private App Subnet (PRIVATE_WITH_EGRESS) |
| Private DNS | 有効化必須（VPC 内から AWS サービス名で解決） |

### CDK ベストプラクティス

1. **Interface Endpoint の作成**:
   - `vpc.addInterfaceEndpoint()` を使用
   - `privateDnsEnabled: true` を設定（デフォルトで true）
   - `subnets` で配置先を明示的に指定

2. **Gateway Endpoint の作成**:
   - `vpc.addGatewayEndpoint()` を使用
   - `subnets` で複数のサブネットタイプを指定可能
   - Route Table への追加は CDK が自動で行う

3. **Endpoint 選択**:
   - SSM, ECR, CloudWatch Logs → Interface Endpoint（時間課金）
   - S3 → Gateway Endpoint（無料）

### セキュリティ考慮事項

- VPC Endpoint Security Group は CDK がデフォルトで作成
- デフォルトでは VPC の CIDR からの HTTPS (443) が許可される
- 必要に応じてカスタム Security Group を指定可能
- Private DNS を有効化することで、パブリック DNS 名でも VPC 内部から Endpoint にアクセス可能

### コスト考慮事項

| Endpoint Type | 課金体系 |
|---------------|---------|
| Interface Endpoint | $0.01/時間 + データ処理料金 |
| Gateway Endpoint | 無料 |

**Interface Endpoint 数**: 6個（SSM x 3 + ECR x 2 + Logs x 1）
**推定月額コスト**: 約 $43.20 (6 x $0.01 x 24 x 30)

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `CLAUDE.md`

---

## 8. 依存関係

### 前提タスク

| タスクID | 内容 | 状態 |
|---------|------|------|
| TASK-0001 | CDK プロジェクト初期化 | 完了 |
| TASK-0002 | VPC Construct 実装 | 完了 |

### 後続タスク

| タスクID | 内容 | 依存理由 |
|---------|------|----------|
| TASK-0004 | VPC Stack 統合 | VPC Endpoints Construct を使用 |

---

## 9. TDD 実装手順

### Red Phase
1. `infra/test/construct/vpc/endpoints-construct.test.ts` を作成
2. Interface Endpoint (SSM, ECR, Logs) のテストを実装
3. Gateway Endpoint (S3) のテストを実装
4. テスト実行 → 全て失敗することを確認

### Green Phase
1. `infra/lib/construct/vpc/endpoints-construct.ts` を作成
2. 最小限の実装でテストを通す
3. テスト実行 → 全て成功することを確認

### Refactor Phase
1. コードの整理・最適化
2. Props のデフォルト値設定
3. JSDoc コメント追加
4. テスト実行 → 全て成功することを確認

---

## 10. コマンドリファレンス

### 開発コマンド

```bash
# プロジェクトディレクトリ
cd infra

# 依存関係インストール
npm install

# ビルド
npm run build

# テスト実行
npm test

# 特定テストファイル実行
npm test -- endpoints-construct.test.ts

# CDK Synth (CloudFormation テンプレート生成)
npx cdk synth

# CDK Diff (差分確認)
npx cdk diff --profile <aws-profile>
```

### テストコマンド

```bash
# 全テスト実行
npm test

# Watch モード
npm test -- --watch

# カバレッジ付き
npm test -- --coverage

# スナップショット更新
npm test -- -u
```

---

## 11. 信頼性レベルサマリー

- **総項目数**: 8項目 (REQ-008〜011, TC-VPCE-01〜04)
- 🔵 **青信号**: 8項目 (100%)
- 🟡 **黄信号**: 0項目 (0%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 - 全ての要件が要件定義書により確認済み

---

## 12. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0003.md` |
| 依存タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0002.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| ユーザストーリー | `docs/spec/aws-cdk-serverless-architecture/user-stories.md` |
| 受け入れ基準 | `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| 型定義 | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` |
| タスク概要 | `docs/tasks/aws-cdk-serverless-architecture/overview.md` |
| 依存先実装 | `infra/lib/construct/vpc/vpc-construct.ts` |
| 依存先テスト | `infra/test/construct/vpc/vpc-construct.test.ts` |
| プロジェクト設定 | `infra/package.json` |
| TypeScript設定 | `infra/tsconfig.json` |
| CDK設定 | `infra/cdk.json` |
| TASK-0002 ノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0002/note.md` |
