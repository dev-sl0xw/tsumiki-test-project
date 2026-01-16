# TASK-0003: VPC Endpoints Construct 実装 - TDD要件定義書

**タスクID**: TASK-0003
**機能名**: VPC Endpoints Construct
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-16

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 機能説明 🔵

**信頼性**: 🔵 *要件定義書 REQ-008〜011、architecture.md より*

**何をする機能か**:
VPC Endpoint を一元管理する CDK Construct を実装する。Systems Manager (ssm, ssmmessages, ec2messages)、ECR (ecr.api, ecr.dkr)、CloudWatch Logs (logs) 用の Interface Endpoint、および S3 用の Gateway Endpoint を作成し、VPC 内部通信の最適化とコスト削減を実現する。

**どのような問題を解決するか**:
- ECS Fargate から AWS サービスへのアクセスを VPC 内部で完結させる
- NAT Gateway 経由のデータ転送コストを削減する
- セキュリティを向上させる（トラフィックが AWS ネットワーク内に閉じる）
- ECS Exec (SSM Session Manager) を利用可能にする

**想定されるユーザー**:
- インフラエンジニア（CDK Stack の実装者）
- 運用エンジニア（ECS Exec によるデバッグ操作を行う）

**システム内での位置づけ**: 🔵
- **Stack**: VPC Stack
- **依存先**: VPC Construct (TASK-0002)
- **依存元**: VPC Stack 統合 (TASK-0004)
- **配置**: `infra/lib/construct/vpc/endpoints-construct.ts`

### 1.2 参照情報 🔵

- **参照したEARS要件**: REQ-008, REQ-009, REQ-010, REQ-011, REQ-405
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/architecture.md` - VPC Endpoints 構成セクション
  - `docs/design/aws-cdk-serverless-architecture/dataflow.md` - VPC 内部通信フロー
  - `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - VpcEndpointsConfig

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ 🔵

**信頼性**: 🔵 *interfaces.ts、note.md より*

```typescript
/**
 * EndpointsConstruct のプロパティ
 */
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
```

| パラメータ | 型 | 必須 | デフォルト | 説明 | 信頼性 |
|-----------|-----|------|-----------|------|--------|
| vpc | ec2.IVpc | Yes | - | VPC への参照 | 🔵 |
| enableSsm | boolean | No | true | SSM Endpoints 作成フラグ | 🟡 |
| enableEcr | boolean | No | true | ECR Endpoints 作成フラグ | 🟡 |
| enableLogs | boolean | No | true | CloudWatch Logs Endpoint 作成フラグ | 🟡 |
| enableS3 | boolean | No | true | S3 Gateway Endpoint 作成フラグ | 🟡 |

### 2.2 出力値 🔵

**信頼性**: 🔵 *note.md の実装インターフェースより*

```typescript
/**
 * EndpointsConstruct の公開プロパティ
 */
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

| 出力 | 型 | 説明 | 信頼性 |
|------|-----|------|--------|
| ssmEndpoint | ec2.IInterfaceVpcEndpoint \| undefined | SSM Interface Endpoint | 🔵 |
| ssmMessagesEndpoint | ec2.IInterfaceVpcEndpoint \| undefined | SSM Messages Interface Endpoint | 🔵 |
| ec2MessagesEndpoint | ec2.IInterfaceVpcEndpoint \| undefined | EC2 Messages Interface Endpoint | 🔵 |
| ecrApiEndpoint | ec2.IInterfaceVpcEndpoint \| undefined | ECR API Interface Endpoint | 🔵 |
| ecrDkrEndpoint | ec2.IInterfaceVpcEndpoint \| undefined | ECR Docker Interface Endpoint | 🔵 |
| logsEndpoint | ec2.IInterfaceVpcEndpoint \| undefined | CloudWatch Logs Interface Endpoint | 🔵 |
| s3Endpoint | ec2.IGatewayVpcEndpoint \| undefined | S3 Gateway Endpoint | 🔵 |

### 2.3 入出力の関係性 🔵

**信頼性**: 🔵 *TASK-0003.md より*

| 入力フラグ | 作成される Endpoint |
|-----------|-------------------|
| enableSsm=true | ssmEndpoint, ssmMessagesEndpoint, ec2MessagesEndpoint |
| enableEcr=true | ecrApiEndpoint, ecrDkrEndpoint |
| enableLogs=true | logsEndpoint |
| enableS3=true | s3Endpoint |

### 2.4 参照情報 🔵

- **参照したEARS要件**: REQ-008, REQ-009, REQ-010, REQ-011
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - VpcEndpointsConfig

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 技術的制約 🔵

**信頼性**: 🔵 *requirements.md REQ-401〜405、architecture.md より*

| 項目 | 制約内容 | 信頼性 |
|------|----------|--------|
| リージョン | ap-northeast-1 (Tokyo) 固定 | 🔵 |
| IaC | AWS CDK v2 (TypeScript) | 🔵 |
| 配置先 Subnet | Private App Subnet (PRIVATE_WITH_EGRESS) | 🔵 |
| Private DNS | 有効化必須（デフォルト true） | 🔵 |

### 3.2 Endpoint 配置設計 🔵

**信頼性**: 🔵 *note.md より*

**Interface Endpoint の配置先**:
- Private App Subnet (PRIVATE_WITH_EGRESS) に配置
- Private DNS を有効化（VPC 内から AWS サービス名で解決可能）
- CDK がデフォルトで Security Group を作成

**Gateway Endpoint の配置先**:
- Private App Subnet と Private DB Subnet 両方のルートテーブルに追加
- Route Table への追加は CDK が自動で行う

### 3.3 CDK ベストプラクティス 🔵

**信頼性**: 🔵 *AWS CDK ドキュメント・note.md より*

1. **Interface Endpoint の作成**:
   - `vpc.addInterfaceEndpoint()` を使用
   - `privateDnsEnabled: true` を設定（デフォルトで true）
   - `subnets` で配置先を明示的に指定

2. **Gateway Endpoint の作成**:
   - `vpc.addGatewayEndpoint()` を使用
   - `subnets` で複数のサブネットタイプを指定可能

3. **Endpoint 選択基準**:
   - SSM, ECR, CloudWatch Logs → Interface Endpoint（時間課金）
   - S3 → Gateway Endpoint（無料）

### 3.4 コスト考慮事項 🔵

**信頼性**: 🔵 *note.md より*

| Endpoint Type | 課金体系 |
|---------------|---------|
| Interface Endpoint | $0.01/時間 + データ処理料金 |
| Gateway Endpoint | 無料 |

**Interface Endpoint 数**: 6個（SSM x 3 + ECR x 2 + Logs x 1）
**推定月額コスト**: 約 $43.20 (6 x $0.01 x 24 x 30)

### 3.5 セキュリティ考慮事項 🔵

**信頼性**: 🔵 *NFR-101、note.md より*

- VPC Endpoint Security Group は CDK がデフォルトで作成
- デフォルトでは VPC の CIDR からの HTTPS (443) が許可される
- 必要に応じてカスタム Security Group を指定可能
- Private DNS を有効化することで、パブリック DNS 名でも VPC 内部から Endpoint にアクセス可能

### 3.6 参照情報 🔵

- **参照したEARS要件**: REQ-401, REQ-403, REQ-405, NFR-101, NFR-201
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/architecture.md` - VPC Endpoints セクション
  - `docs/implements/aws-cdk-serverless-architecture/TASK-0003/note.md` - 注意事項

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *TASK-0003.md、note.md より*

```typescript
// 基本使用例: 全 Endpoint を作成
import { VpcConstruct } from './vpc-construct';
import { EndpointsConstruct } from './endpoints-construct';

const vpcConstruct = new VpcConstruct(this, 'Vpc');
const endpointsConstruct = new EndpointsConstruct(this, 'Endpoints', {
  vpc: vpcConstruct.vpc,
});
```

### 4.2 選択的な Endpoint 作成 🟡

**信頼性**: 🟡 *要件定義書から妥当な推測*

```typescript
// 一部の Endpoint のみ作成
const endpointsConstruct = new EndpointsConstruct(this, 'Endpoints', {
  vpc: vpcConstruct.vpc,
  enableSsm: true,
  enableEcr: true,
  enableLogs: true,
  enableS3: false,  // S3 Gateway Endpoint は作成しない
});
```

### 4.3 データフロー 🔵

**信頼性**: 🔵 *dataflow.md より*

**ECS Fargate → AWS サービス通信**:
1. ECS Fargate Task が ECR からイメージを Pull → ecr.api, ecr.dkr Endpoint 経由
2. ECS Fargate Task が CloudWatch Logs にログ送信 → logs Endpoint 経由
3. ECS Exec で SSM Session Manager 接続 → ssm, ssmmessages, ec2messages Endpoint 経由
4. ECR イメージレイヤー取得 → S3 Gateway Endpoint 経由

### 4.4 エッジケース 🟡

**信頼性**: 🟡 *VPC Endpoint 特性から妥当な推測*

| ケース | 動作 | 対応 |
|--------|------|------|
| VPC に PRIVATE_WITH_EGRESS サブネットがない | Endpoint 作成失敗 | エラー（CDK 合成時に検出） |
| 既に同じ Endpoint が存在する | 作成失敗 | エラー（CDK 合成時に検出） |
| Props で全フラグが false | 何も作成されない | 警告ログ出力 🔴 |

### 4.5 エラーケース 🔴

**信頼性**: 🔴 *推測による要件*

| エラー | 原因 | 対応 |
|--------|------|------|
| vpc が undefined | Props の vpc が未指定 | TypeScript コンパイルエラー |
| Subnet 不足 | PRIVATE_WITH_EGRESS タイプのサブネットがない | CDK 合成時エラー |
| Service Quota 超過 | VPC あたりの Endpoint 数上限 | CDK デプロイ時エラー |

### 4.6 参照情報

- **参照したEARS要件**: REQ-008〜011
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/dataflow.md` - VPC 内部通信フロー

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー 🔵

| ストーリー | 内容 |
|-----------|------|
| US-004 | 開発者として、ECS Exec で Sidecar コンテナに接続し、socat 経由で Aurora にクエリを実行したい |

### 5.2 参照した機能要件 🔵

| 要件ID | 内容 | 対応実装 |
|--------|------|----------|
| REQ-008 | Systems Manager (ssm, ssmmessages, ec2messages) 用の VPC Endpoint を作成 | ssmEndpoint, ssmMessagesEndpoint, ec2MessagesEndpoint |
| REQ-009 | ECR (ecr.api, ecr.dkr) 用の VPC Endpoint を作成 | ecrApiEndpoint, ecrDkrEndpoint |
| REQ-010 | CloudWatch Logs (logs) 用の VPC Endpoint を作成 | logsEndpoint |
| REQ-011 | S3 用の Gateway Endpoint を作成 | s3Endpoint |
| REQ-405 | VPC Endpoint 経由で AWS サービスにアクセス | 全 Endpoint |

### 5.3 参照した非機能要件 🔵

| 要件ID | 内容 | 対応実装 |
|--------|------|----------|
| NFR-101 | VPC Endpoint を使用してトラフィックを AWS ネットワーク内に閉じる | 全 Interface Endpoint |
| NFR-201 | VPC Endpoint を使用して NAT Gateway 費用を削減 | 全 Endpoint |

### 5.4 参照したEdgeケース 🟡

該当する Edgeケースなし。VPC Endpoint 固有のエラーケースは推測に基づく。

### 5.5 参照した設計文書

| カテゴリ | 文書 | 該当セクション |
|---------|------|---------------|
| アーキテクチャ | `docs/design/aws-cdk-serverless-architecture/architecture.md` | VPC Endpoints 構成 |
| データフロー | `docs/design/aws-cdk-serverless-architecture/dataflow.md` | VPC 内部通信フロー |
| 型定義 | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` | VpcEndpointsConfig |
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0003.md` | 全体 |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0003/note.md` | 全体 |

---

## 6. 受け入れ基準（Acceptance Criteria）

### 6.1 機能要件の受け入れ基準 🔵

**信頼性**: 🔵 *TASK-0003.md 完了条件より*

| AC-ID | 基準 | 検証方法 |
|-------|------|----------|
| AC-001 | EndpointsConstruct クラスが `lib/construct/vpc/endpoints-construct.ts` に実装されている | ファイル存在確認 |
| AC-002 | SSM 用 VPC Endpoint (ssm, ssmmessages, ec2messages) が作成される | 単体テスト |
| AC-003 | ECR 用 VPC Endpoint (ecr.api, ecr.dkr) が作成される | 単体テスト |
| AC-004 | CloudWatch Logs 用 VPC Endpoint (logs) が作成される | 単体テスト |
| AC-005 | S3 用 Gateway Endpoint が作成される | 単体テスト |
| AC-006 | 各 Interface Endpoint が Private App Subnet に配置される | 単体テスト |
| AC-007 | 各 Interface Endpoint で Private DNS が有効化される | 単体テスト |
| AC-008 | S3 Gateway Endpoint が Route Table に追加される | 単体テスト |
| AC-009 | 単体テストがすべて成功する | `npm test` |

### 6.2 非機能要件の受け入れ基準 🟡

**信頼性**: 🟡 *非機能要件から妥当な推測*

| AC-ID | 基準 | 検証方法 |
|-------|------|----------|
| AC-010 | TypeScript の strict mode でコンパイルエラーがない | `npm run build` |
| AC-011 | ESLint エラーがない | `npm run lint` |
| AC-012 | JSDoc コメントが全パブリックプロパティに付与されている | コードレビュー |

---

## 7. テスト戦略

### 7.1 テストケース概要 🔵

**信頼性**: 🔵 *note.md テスト要件より*

| テストID | 内容 | 種別 | 信頼性 |
|---------|------|------|--------|
| TC-VPCE-01 | SSM Interface Endpoints が作成される | 単体 | 🔵 |
| TC-VPCE-02 | ECR Interface Endpoints が作成される | 単体 | 🔵 |
| TC-VPCE-03 | CloudWatch Logs Interface Endpoint が作成される | 単体 | 🔵 |
| TC-VPCE-04 | S3 Gateway Endpoint が作成される | 単体 | 🔵 |
| TC-VPCE-05 | デフォルト Props で全 Endpoint が作成される | 単体 | 🟡 |
| TC-VPCE-06 | enableSsm=false で SSM Endpoint が作成されない | 単体 | 🟡 |
| TC-VPCE-07 | enableEcr=false で ECR Endpoint が作成されない | 単体 | 🟡 |
| TC-VPCE-08 | enableLogs=false で Logs Endpoint が作成されない | 単体 | 🟡 |
| TC-VPCE-09 | enableS3=false で S3 Endpoint が作成されない | 単体 | 🟡 |

### 7.2 詳細テストケース

#### TC-VPCE-01: SSM Interface Endpoints 🔵

**信頼性**: 🔵 *要件定義書 REQ-008より*

**前提条件**:
- VpcConstruct が正常に作成されている
- EndpointsConstruct が enableSsm=true (デフォルト) で作成されている

**検証項目**:
- ssm Interface Endpoint が作成されていること
- ssmmessages Interface Endpoint が作成されていること
- ec2messages Interface Endpoint が作成されていること
- 各 Endpoint が Private App Subnet に配置されていること
- Private DNS が有効化されていること

**テストコード例**:
```typescript
test('creates SSM Interface Endpoints', () => {
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ssm$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });

  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ssmmessages$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });

  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ec2messages$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-02: ECR Interface Endpoints 🔵

**信頼性**: 🔵 *要件定義書 REQ-009より*

**前提条件**:
- VpcConstruct が正常に作成されている
- EndpointsConstruct が enableEcr=true (デフォルト) で作成されている

**検証項目**:
- ecr.api Interface Endpoint が作成されていること
- ecr.dkr Interface Endpoint が作成されていること
- 各 Endpoint が Private App Subnet に配置されていること
- Private DNS が有効化されていること

**テストコード例**:
```typescript
test('creates ECR Interface Endpoints', () => {
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ecr\\.api$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });

  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*ecr\\.dkr$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-03: CloudWatch Logs Endpoint 🔵

**信頼性**: 🔵 *要件定義書 REQ-010より*

**前提条件**:
- VpcConstruct が正常に作成されている
- EndpointsConstruct が enableLogs=true (デフォルト) で作成されている

**検証項目**:
- logs Interface Endpoint が作成されていること
- Endpoint が Private App Subnet に配置されていること
- Private DNS が有効化されていること

**テストコード例**:
```typescript
test('creates CloudWatch Logs Interface Endpoint', () => {
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*logs$'),
    VpcEndpointType: 'Interface',
    PrivateDnsEnabled: true,
  });
});
```

#### TC-VPCE-04: S3 Gateway Endpoint 🔵

**信頼性**: 🔵 *要件定義書 REQ-011より*

**前提条件**:
- VpcConstruct が正常に作成されている
- EndpointsConstruct が enableS3=true (デフォルト) で作成されている

**検証項目**:
- S3 Gateway Endpoint が作成されていること
- Route Table に S3 へのルートが追加されていること

**テストコード例**:
```typescript
test('creates S3 Gateway Endpoint', () => {
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: Match.stringLikeRegexp('.*s3$'),
    VpcEndpointType: 'Gateway',
  });
});
```

#### TC-VPCE-05: デフォルト Props で全 Endpoint が作成される 🟡

**信頼性**: 🟡 *実装設計から妥当な推測*

**前提条件**:
- VpcConstruct が正常に作成されている
- EndpointsConstruct が Props のデフォルト値で作成されている

**検証項目**:
- 全 7 つの Endpoint が作成されていること（SSM x 3 + ECR x 2 + Logs x 1 + S3 x 1）

**テストコード例**:
```typescript
test('creates all endpoints with default props', () => {
  template.resourceCountIs('AWS::EC2::VPCEndpoint', 7);
});
```

#### TC-VPCE-06〜09: 選択的 Endpoint 作成 🟡

**信頼性**: 🟡 *実装設計から妥当な推測*

**検証項目**:
- enableSsm=false → SSM Endpoint が 0 個
- enableEcr=false → ECR Endpoint が 0 個
- enableLogs=false → Logs Endpoint が 0 個
- enableS3=false → S3 Endpoint が 0 個

### 7.3 テスト実装ファイル

```
infra/test/construct/vpc/endpoints-construct.test.ts
```

---

## 8. 実装ファイル構成

### 8.1 新規作成ファイル 🔵

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/vpc/endpoints-construct.ts` | VPC Endpoints Construct 実装 |
| `infra/test/construct/vpc/endpoints-construct.test.ts` | VPC Endpoints Construct テスト |

### 8.2 ディレクトリ構造

```
infra/
├── lib/
│   └── construct/
│       └── vpc/
│           ├── vpc-construct.ts          # 依存先（TASK-0002）
│           └── endpoints-construct.ts    # 実装対象
└── test/
    └── construct/
        └── vpc/
            ├── vpc-construct.test.ts     # 依存先テスト
            └── endpoints-construct.test.ts  # テストファイル
```

---

## 9. 依存関係

### 9.1 前提タスク 🔵

| タスクID | 内容 | 状態 |
|---------|------|------|
| TASK-0001 | CDK プロジェクト初期化 | 完了 |
| TASK-0002 | VPC Construct 実装 | 完了 |

### 9.2 後続タスク 🔵

| タスクID | 内容 | 依存理由 |
|---------|------|----------|
| TASK-0004 | VPC Stack 統合 | VPC Endpoints Construct を使用 |

---

## 10. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 42 | 84% |
| 🟡 黄信号 | 7 | 14% |
| 🔴 赤信号 | 1 | 2% |

**品質評価**: ✅ 高品質 - 要件の大部分が要件定義書・設計文書により確認済み

### 10.1 要改善項目

| 項目 | 信頼性 | 改善方法 |
|------|--------|----------|
| 選択的 Endpoint 作成の Props 設計 | 🟡 | ユーザー確認 |
| Props 全フラグ false 時の動作 | 🔴 | ユーザー確認（警告ログ出力の要否） |
| エラーケースの詳細 | 🔴 | 実装時に詳細化 |

---

## 11. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0003.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0003/note.md` |
| 依存タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0002.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| 型定義 | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` |

---

## 変更履歴

| 日付 | 版 | 変更内容 |
|------|-----|---------|
| 2026-01-16 | 1.0 | 初版作成 |
