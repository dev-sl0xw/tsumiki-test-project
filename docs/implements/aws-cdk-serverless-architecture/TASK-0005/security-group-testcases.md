# TASK-0005: Security Group Construct 実装 - TDDテストケース

**タスクID**: TASK-0005
**機能名**: Security Group Construct 実装
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-17
**フェーズ**: TDD Testcases Phase

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない
- 🟡 **黄信号**: EARS要件定義書・設計文書から妥当な推測
- 🔴 **赤信号**: EARS要件定義書・設計文書にない推測

---

## 1. 正常系テストケース（基本的な動作）

### 1.1 ALB Security Group テスト

#### TC-SG-01: ALB Security Group 作成確認 🔵

- **テスト名**: ALB Security Group が作成されること
  - **何をテストするか**: SecurityGroupConstruct が ALB 用の Security Group を正しく作成することを確認
  - **期待される動作**: AWS::EC2::SecurityGroup リソースが ALB 用に作成される
- **入力値**: デフォルト Props (`vpc` のみ指定)
  - **入力データの意味**: 最小限の設定で Construct を作成し、基本動作を確認
- **期待される結果**: ALB Security Group リソースが 1 つ存在する
  - **期待結果の理由**: 要件定義書 REQ-028 で ALB を Public Subnet に配置することが定義されている
- **テストの目的**: ALB Security Group の存在確認
  - **確認ポイント**: SecurityGroup リソースの存在と description

**信頼性**: 🔵 *TASK-0005.md、requirements.md REQ-028より*

---

#### TC-SG-02: ALB Security Group HTTP(80) インバウンド許可確認 🔵

- **テスト名**: ALB Security Group に HTTP(80) インバウンドが 0.0.0.0/0 から許可されていること
  - **何をテストするか**: ALB SG に HTTP トラフィックのインバウンドルールが正しく設定されることを確認
  - **期待される動作**: SecurityGroupIngress に Port 80、CidrIp 0.0.0.0/0 のルールが存在する
- **入力値**: デフォルト Props
  - **入力データの意味**: Internet-facing ALB として HTTP トラフィックを受け入れる設定
- **期待される結果**:
  - `IpProtocol`: 'tcp'
  - `FromPort`: 80
  - `ToPort`: 80
  - `CidrIp`: '0.0.0.0/0'
  - **期待結果の理由**: 要件定義書 REQ-029 で HTTP リクエストを受け入れ、HTTPS にリダイレクトすることが定義されている
- **テストの目的**: HTTP インバウンドルールの確認
  - **確認ポイント**: ポート番号、プロトコル、ソース CIDR

**信頼性**: 🔵 *requirements.md REQ-029、TASK-0005.md より*

---

#### TC-SG-03: ALB Security Group HTTPS(443) インバウンド許可確認 🔵

- **テスト名**: ALB Security Group に HTTPS(443) インバウンドが 0.0.0.0/0 から許可されていること
  - **何をテストするか**: ALB SG に HTTPS トラフィックのインバウンドルールが正しく設定されることを確認
  - **期待される動作**: SecurityGroupIngress に Port 443、CidrIp 0.0.0.0/0 のルールが存在する
- **入力値**: デフォルト Props
  - **入力データの意味**: Internet-facing ALB として HTTPS トラフィックを受け入れる設定
- **期待される結果**:
  - `IpProtocol`: 'tcp'
  - `FromPort`: 443
  - `ToPort`: 443
  - `CidrIp`: '0.0.0.0/0'
  - **期待結果の理由**: 要件定義書 REQ-028 で HTTPS を受け入れることが定義されている
- **テストの目的**: HTTPS インバウンドルールの確認
  - **確認ポイント**: ポート番号、プロトコル、ソース CIDR

**信頼性**: 🔵 *requirements.md REQ-028、TASK-0005.md より*

---

### 1.2 ECS Security Group テスト

#### TC-SG-04: ECS Security Group 作成確認 🔵

- **テスト名**: ECS Security Group が作成されること
  - **何をテストするか**: SecurityGroupConstruct が ECS Fargate タスク用の Security Group を正しく作成することを確認
  - **期待される動作**: AWS::EC2::SecurityGroup リソースが ECS 用に作成される
- **入力値**: デフォルト Props (`vpc` のみ指定)
  - **入力データの意味**: 最小限の設定で Construct を作成し、基本動作を確認
- **期待される結果**: ECS Security Group リソースが 1 つ存在する
  - **期待結果の理由**: 3層アーキテクチャの中間層として ECS 用 SG が必要
- **テストの目的**: ECS Security Group の存在確認
  - **確認ポイント**: SecurityGroup リソースの存在と description

**信頼性**: 🔵 *TASK-0005.md、architecture.md より*

---

#### TC-SG-05: ECS Security Group ALB からのインバウンド許可確認 🔵

- **テスト名**: ECS Security Group に ALB Security Group からの containerPort インバウンドのみ許可されていること
  - **何をテストするか**: ECS SG に ALB SG からのトラフィックのみが許可されることを確認
  - **期待される動作**: SecurityGroupIngress に ALB SG 参照、containerPort のルールが存在する
- **入力値**: デフォルト Props (containerPort = 80)
  - **入力データの意味**: ALB から ECS へのデフォルトポートでの通信を確認
- **期待される結果**:
  - `IpProtocol`: 'tcp'
  - `FromPort`: 80 (containerPort)
  - `ToPort`: 80 (containerPort)
  - `SourceSecurityGroupId`: ALB Security Group の参照
  - **期待結果の理由**: 最小権限の原則に基づき、ALB からのトラフィックのみを許可
- **テストの目的**: ECS インバウンドルールの確認（SG-to-SG 参照）
  - **確認ポイント**: ソースが CIDR ではなく Security Group 参照であること

**信頼性**: 🔵 *TASK-0005.md、dataflow.md セキュリティ境界設計より*

---

#### TC-SG-06: ECS Security Group カスタム containerPort 確認 🔵

- **テスト名**: ECS Security Group にカスタム containerPort (8080) でインバウンドが許可されること
  - **何をテストするか**: Props で指定した containerPort が正しく反映されることを確認
  - **期待される動作**: containerPort: 8080 を指定した場合、Port 8080 でインバウンドルールが作成される
- **入力値**: `{ vpc, containerPort: 8080 }`
  - **入力データの意味**: カスタムポートでのアプリケーション実行を想定
- **期待される結果**:
  - `FromPort`: 8080
  - `ToPort`: 8080
  - **期待結果の理由**: Props で指定した containerPort が正しく適用される
- **テストの目的**: containerPort パラメータの動作確認
  - **確認ポイント**: カスタムポート値が正しく反映されること

**信頼性**: 🔵 *note.md 型定義、security-group-requirements.md より*

---

### 1.3 Aurora Security Group テスト

#### TC-SG-07: Aurora Security Group 作成確認 🔵

- **テスト名**: Aurora Security Group が作成されること
  - **何をテストするか**: SecurityGroupConstruct が Aurora MySQL 用の Security Group を正しく作成することを確認
  - **期待される動作**: AWS::EC2::SecurityGroup リソースが Aurora 用に作成される
- **入力値**: デフォルト Props (`vpc` のみ指定)
  - **入力データの意味**: 最小限の設定で Construct を作成し、基本動作を確認
- **期待される結果**: Aurora Security Group リソースが 1 つ存在する
  - **期待結果の理由**: データベース層のセキュリティ分離のため Aurora 用 SG が必要
- **テストの目的**: Aurora Security Group の存在確認
  - **確認ポイント**: SecurityGroup リソースの存在と description

**信頼性**: 🔵 *requirements.md REQ-024、TASK-0005.md より*

---

#### TC-SG-08: Aurora Security Group ECS からの 3306 インバウンド許可確認 🔵

- **テスト名**: Aurora Security Group に ECS Security Group からの 3306 ポートインバウンドのみ許可されていること
  - **何をテストするか**: Aurora SG に ECS SG からの MySQL 接続のみが許可されることを確認
  - **期待される動作**: SecurityGroupIngress に ECS SG 参照、Port 3306 のルールが存在する
- **入力値**: デフォルト Props
  - **入力データの意味**: ECS から Aurora への MySQL 接続を確認
- **期待される結果**:
  - `IpProtocol`: 'tcp'
  - `FromPort`: 3306
  - `ToPort`: 3306
  - `SourceSecurityGroupId`: ECS Security Group の参照
  - **期待結果の理由**: 要件定義書 REQ-025 で ECS SG からの 3306 のみ許可が定義されている
- **テストの目的**: Aurora インバウンドルールの確認（SG-to-SG 参照）
  - **確認ポイント**: ソースが CIDR ではなく Security Group 参照であること

**信頼性**: 🔵 *requirements.md REQ-025、TASK-0005.md より*

---

#### TC-SG-09: Aurora Security Group 外部アクセス遮断確認 🔵

- **テスト名**: Aurora Security Group に 0.0.0.0/0 からの直接アクセスが許可されていないこと
  - **何をテストするか**: Aurora SG にインターネットからの直接アクセスルールが存在しないことを確認
  - **期待される動作**: CidrIp: '0.0.0.0/0' のインバウンドルールが存在しない
- **入力値**: デフォルト Props
  - **入力データの意味**: セキュリティ要件の検証
- **期待される結果**: Aurora SG に 0.0.0.0/0 をソースとするインバウンドルールが存在しない
  - **期待結果の理由**: 要件定義書 REQ-024 で外部からの直接アクセス遮断が定義されている
- **テストの目的**: 外部アクセス遮断の確認
  - **確認ポイント**: 0.0.0.0/0 ルールの不在

**信頼性**: 🔵 *requirements.md REQ-024、security-group-requirements.md より*

---

#### TC-SG-10: Aurora Security Group アウトバウンド制限確認 🔵

- **テスト名**: Aurora Security Group でアウトバウンドトラフィックが制限されていること
  - **何をテストするか**: Aurora SG の allowAllOutbound が false であることを確認
  - **期待される動作**: SecurityGroupEgress にアウトバウンドルールがない、または制限されている
- **入力値**: デフォルト Props
  - **入力データの意味**: データベースからの外向きトラフィック制限を確認
- **期待される結果**: Aurora SG の SecurityGroupEgress が空、または制限されたルールのみ
  - **期待結果の理由**: 最小権限の原則に基づき、データベースからの不要な外向き通信を制限
- **テストの目的**: アウトバウンドトラフィック制限の確認
  - **確認ポイント**: allowAllOutbound: false の設定

**信頼性**: 🔵 *TASK-0005.md、note.md CDKベストプラクティスより*

---

### 1.4 公開プロパティテスト

#### TC-SG-11: 公開プロパティ存在確認 🔵

- **テスト名**: 全ての公開プロパティ (albSecurityGroup, ecsSecurityGroup, auroraSecurityGroup) が定義されていること
  - **何をテストするか**: Construct の公開プロパティが正しく設定されることを確認
  - **期待される動作**: 各プロパティが ISecurityGroup 型で定義される
- **入力値**: デフォルト Props
  - **入力データの意味**: 基本設定でのプロパティ確認
- **期待される結果**:
  - `albSecurityGroup`: 定義済み (ISecurityGroup)
  - `ecsSecurityGroup`: 定義済み (ISecurityGroup)
  - `auroraSecurityGroup`: 定義済み (ISecurityGroup)
  - **期待結果の理由**: 後続の Construct/Stack から参照するためにプロパティが必要
- **テストの目的**: 公開プロパティの存在確認
  - **確認ポイント**: 各プロパティが undefined でないこと

**信頼性**: 🔵 *note.md 型定義、security-group-requirements.md より*

---

## 2. 異常系テストケース（エラーハンドリング）

### 2.1 必須パラメータ欠落テスト

#### TC-SG-12: vpc 未指定でのエラー確認 🟡

- **テスト名**: vpc パラメータが未指定の場合にエラーがスローされること
  - **エラーケースの概要**: 必須パラメータ vpc を指定しない場合の動作
  - **エラー処理の重要性**: 必須パラメータの検証により、実行時エラーを防止
- **入力値**: `{}` (空オブジェクト)
  - **不正な理由**: vpc は Security Group 作成に必須
  - **実際の発生シナリオ**: 開発時の設定ミス
- **期待される結果**: TypeScript コンパイルエラー、または CDK 合成時エラー
  - **エラーメッセージの内容**: "Property 'vpc' is missing" または同等のエラー
  - **システムの安全性**: 早期にエラーを検出し、不正な状態での実行を防止
- **テストの目的**: 必須パラメータ検証の確認
  - **品質保証の観点**: 入力検証による堅牢性確保

**信頼性**: 🟡 *CDK/TypeScript の仕様から妥当な推測*

---

### 2.2 重複作成テスト

#### TC-SG-13: 同一 ID での重複作成エラー確認 🔴

- **テスト名**: 同じ ID で SecurityGroupConstruct を重複作成した場合にエラーがスローされること
  - **エラーケースの概要**: 同じ Construct ID を使用した重複作成
  - **エラー処理の重要性**: CDK の ID 一意性制約を確認
- **入力値**: 同じ Stack 内で同じ ID を使用して 2 回作成
  - **不正な理由**: CDK では同一スコープ内で同一 ID は許可されない
  - **実際の発生シナリオ**: 開発時のコピー&ペーストミス
- **期待される結果**: エラーがスローされる
  - **エラーメッセージの内容**: "There is already a Construct with name 'TestSecurityGroups'"
  - **システムの安全性**: リソース名の競合を防止
- **テストの目的**: CDK ID 一意性制約の確認
  - **品質保証の観点**: 意図しない重複作成の防止

**信頼性**: 🔴 *CDK の一般的な動作から推測*

---

## 3. 境界値テストケース

### 3.1 containerPort 境界値テスト

#### TC-SG-14: containerPort 最小値 (1) での動作確認 🟡

- **テスト名**: containerPort=1 で正常に Security Group が作成されること
  - **境界値の意味**: TCP ポート番号の最小値
  - **境界値での動作保証**: 最小ポート番号でも正常に動作することを確認
- **入力値**: `{ vpc, containerPort: 1 }`
  - **境界値選択の根拠**: TCP ポート範囲の下限
  - **実際の使用場面**: 特殊なアプリケーションでの使用
- **期待される結果**: ECS SG のインバウンドルールが FromPort=1, ToPort=1 で作成される
  - **境界での正確性**: ポート番号が正確に設定される
  - **一貫した動作**: 他のポート番号と同様に動作する
- **テストの目的**: 最小ポート値での動作確認
  - **堅牢性の確認**: 極端な値でも正常動作すること

**信頼性**: 🟡 *TCP ポート仕様から妥当な推測*

---

#### TC-SG-15: containerPort 最大値 (65535) での動作確認 🟡

- **テスト名**: containerPort=65535 で正常に Security Group が作成されること
  - **境界値の意味**: TCP ポート番号の最大値
  - **境界値での動作保証**: 最大ポート番号でも正常に動作することを確認
- **入力値**: `{ vpc, containerPort: 65535 }`
  - **境界値選択の根拠**: TCP ポート範囲の上限
  - **実際の使用場面**: 特殊なアプリケーションでの使用
- **期待される結果**: ECS SG のインバウンドルールが FromPort=65535, ToPort=65535 で作成される
  - **境界での正確性**: ポート番号が正確に設定される
  - **一貫した動作**: 他のポート番号と同様に動作する
- **テストの目的**: 最大ポート値での動作確認
  - **堅牢性の確認**: 極端な値でも正常動作すること

**信頼性**: 🟡 *TCP ポート仕様から妥当な推測*

---

#### TC-SG-16: containerPort デフォルト値 (80) 確認 🔵

- **テスト名**: containerPort 未指定時にデフォルト値 80 が使用されること
  - **境界値の意味**: デフォルト値の正常動作確認
  - **境界値での動作保証**: Props 省略時のフォールバック動作
- **入力値**: `{ vpc }` (containerPort 省略)
  - **境界値選択の根拠**: HTTP のウェルノウンポート
  - **実際の使用場面**: 一般的な Web アプリケーション
- **期待される結果**: ECS SG のインバウンドルールが FromPort=80, ToPort=80 で作成される
  - **境界での正確性**: デフォルト値が正確に適用される
  - **一貫した動作**: 明示的に 80 を指定した場合と同じ結果
- **テストの目的**: デフォルト値の適用確認
  - **堅牢性の確認**: Props 省略時の予測可能な動作

**信頼性**: 🔵 *note.md 型定義、TASK-0005.md より*

---

## 4. Security Group 参照テスト

### 4.1 SG-to-SG 参照テスト

#### TC-SG-17: ECS SG が ALB SG を参照していること (CIDR ベースでないこと) 🔵

- **テスト名**: ECS Security Group のインバウンドルールが ALB Security Group を参照していること
  - **何をテストするか**: SG-to-SG 参照が正しく設定されることを確認
  - **期待される動作**: SourceSecurityGroupId が ALB SG の ID を参照する
- **入力値**: デフォルト Props
  - **入力データの意味**: Security Group 間の参照関係を確認
- **期待される結果**:
  - ECS SG Ingress ルールに `SourceSecurityGroupId` が設定されている
  - `CidrIp` が設定されていない（SG 参照のため）
  - **期待結果の理由**: 動的 IP 変更に対応するため、CIDR ではなく SG 参照を使用
- **テストの目的**: SG 参照方式の確認
  - **確認ポイント**: CIDR ベースではなく SG 参照であること

**信頼性**: 🔵 *note.md セキュリティ考慮事項、TASK-0005.md より*

---

#### TC-SG-18: Aurora SG が ECS SG を参照していること (CIDR ベースでないこと) 🔵

- **テスト名**: Aurora Security Group のインバウンドルールが ECS Security Group を参照していること
  - **何をテストするか**: SG-to-SG 参照が正しく設定されることを確認
  - **期待される動作**: SourceSecurityGroupId が ECS SG の ID を参照する
- **入力値**: デフォルト Props
  - **入力データの意味**: Security Group 間の参照関係を確認
- **期待される結果**:
  - Aurora SG Ingress ルールに `SourceSecurityGroupId` が設定されている
  - `CidrIp` が設定されていない（SG 参照のため）
  - **期待結果の理由**: 動的 IP 変更に対応するため、CIDR ではなく SG 参照を使用
- **テストの目的**: SG 参照方式の確認
  - **確認ポイント**: CIDR ベースではなく SG 参照であること

**信頼性**: 🔵 *note.md セキュリティ考慮事項、requirements.md REQ-025 より*

---

## 5. 最小権限テスト

### 5.1 不要ルール不在テスト

#### TC-SG-19: ALB SG に HTTP/HTTPS 以外のインバウンドルールがないこと 🔵

- **テスト名**: ALB Security Group に HTTP(80) と HTTPS(443) 以外のインバウンドルールが存在しないこと
  - **何をテストするか**: ALB SG に不要なルールが含まれていないことを確認
  - **期待される動作**: インバウンドルールが HTTP と HTTPS のみ
- **入力値**: デフォルト Props
  - **入力データの意味**: 最小権限の原則の検証
- **期待される結果**: ALB SG のインバウンドルールは Port 80 と Port 443 のみ
  - **期待結果の理由**: 最小権限の原則に基づき、必要最小限のルールのみ設定
- **テストの目的**: 不要ルールの不在確認
  - **確認ポイント**: 定義されたルール以外が存在しないこと

**信頼性**: 🔵 *TASK-0005.md 最小権限の原則より*

---

#### TC-SG-20: ECS SG に ALB からのルール以外のインバウンドルールがないこと 🔵

- **テスト名**: ECS Security Group に ALB SG からの containerPort 以外のインバウンドルールが存在しないこと
  - **何をテストするか**: ECS SG に不要なルールが含まれていないことを確認
  - **期待される動作**: インバウンドルールが ALB SG からの containerPort のみ
- **入力値**: デフォルト Props
  - **入力データの意味**: 最小権限の原則の検証
- **期待される結果**: ECS SG のインバウンドルールは ALB SG からの containerPort のみ
  - **期待結果の理由**: 最小権限の原則に基づき、ALB からのトラフィックのみ許可
- **テストの目的**: 不要ルールの不在確認
  - **確認ポイント**: 0.0.0.0/0 ルールが存在しないこと

**信頼性**: 🔵 *TASK-0005.md 最小権限の原則、dataflow.md より*

---

#### TC-SG-21: Aurora SG に ECS からのルール以外のインバウンドルールがないこと 🔵

- **テスト名**: Aurora Security Group に ECS SG からの 3306 以外のインバウンドルールが存在しないこと
  - **何をテストするか**: Aurora SG に不要なルールが含まれていないことを確認
  - **期待される動作**: インバウンドルールが ECS SG からの 3306 のみ
- **入力値**: デフォルト Props
  - **入力データの意味**: 最小権限の原則の検証
- **期待される結果**: Aurora SG のインバウンドルールは ECS SG からの 3306 のみ
  - **期待結果の理由**: 要件定義書 REQ-025 に基づき、ECS からの MySQL 接続のみ許可
- **テストの目的**: 不要ルールの不在確認
  - **確認ポイント**: 0.0.0.0/0 ルールおよび 3306 以外のポートルールが存在しないこと

**信頼性**: 🔵 *requirements.md REQ-024, REQ-025、TASK-0005.md より*

---

### 5.2 Security Group 総数確認テスト

#### TC-SG-22: 作成される Security Group が 3 つであること 🔵

- **テスト名**: SecurityGroupConstruct で作成される Security Group の総数が 3 であること
  - **何をテストするか**: 不要な Security Group が作成されていないことを確認
  - **期待される動作**: ALB SG, ECS SG, Aurora SG の 3 つのみ作成される
- **入力値**: デフォルト Props
  - **入力データの意味**: 基本設定での SG 総数確認
- **期待される結果**: AWS::EC2::SecurityGroup リソースが 3 つ（VPC 作成分を除く）
  - **期待結果の理由**: 設計文書で定義された 3 つの SG のみを作成
- **テストの目的**: 不要リソースの不在確認
  - **確認ポイント**: 意図しない SG が作成されていないこと

**信頼性**: 🔵 *TASK-0005.md、architecture.md より*

---

## 6. 開発言語・フレームワーク

### 6.1 プログラミング言語

- **プログラミング言語**: TypeScript (~5.6.3)
  - **言語選択の理由**: AWS CDK の公式サポート言語、型安全性による開発効率向上
  - **テストに適した機能**: 静的型付けによるコンパイル時エラー検出

**信頼性**: 🔵 *infra/package.json、note.md より*

### 6.2 テストフレームワーク

- **テストフレームワーク**: Jest (^29.7.0)
  - **フレームワーク選択の理由**: CDK 公式推奨、aws-cdk-lib/assertions との統合
  - **テスト実行環境**: Node.js 環境、`npm test` コマンドで実行

**信頼性**: 🔵 *infra/package.json、note.md より*

### 6.3 CDK Assertions ライブラリ

- **アサーションライブラリ**: aws-cdk-lib/assertions
  - **使用する主要 API**:
    - `Template.fromStack()`: Stack から CloudFormation テンプレートを生成
    - `template.hasResourceProperties()`: リソースプロパティの検証
    - `template.resourceCountIs()`: リソース数の検証
    - `template.findResources()`: リソースの検索
    - `Match.stringLikeRegexp()`: 正規表現マッチング
    - `Match.objectLike()`: オブジェクト部分マッチング

**信頼性**: 🔵 *既存テスト (vpc-construct.test.ts, endpoints-construct.test.ts) より*

---

## 7. テストケース実装時の日本語コメント指針

### 7.1 テストケース開始時のコメント

```typescript
// 【テスト目的】: ALB Security Group が正しく作成されることを確認
// 【テスト内容】: SecurityGroupConstruct をデフォルト設定でインスタンス化し、ALB SG を検証
// 【期待される動作】: AWS::EC2::SecurityGroup リソースが ALB 用に作成される
// 🔵 信頼性: TASK-0005.md、requirements.md REQ-028 より
```

### 7.2 Given（準備フェーズ）のコメント

```typescript
beforeEach(() => {
  // 【テストデータ準備】: CDK App と Stack を作成し、テスト対象の SecurityGroupConstruct をインスタンス化
  // 【初期条件設定】: デフォルト Props で Security Group を作成（containerPort: 80）
  // 【前提条件確認】: VPC が正常に作成されていることを前提とする
});
```

### 7.3 When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: Template.fromStack(stack) で CloudFormation テンプレートを生成
// 【処理内容】: SecurityGroupConstruct が作成するリソースを CloudFormation テンプレート形式で取得
// 【実行タイミング】: Construct インスタンス化後、テンプレート検証前
```

### 7.4 Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: ALB Security Group に HTTP インバウンドルールが存在することを検証
// 【期待値確認】: Port 80、CidrIp 0.0.0.0/0 のルールが存在する
// 【品質保証】: 要件定義書 REQ-029 の HTTP 受信要件を満たしていることを確認
```

### 7.5 各 expect ステートメントのコメント

```typescript
// 【検証項目】: ALB Security Group に HTTP インバウンドルールが存在すること
// 🔵 信頼性: requirements.md REQ-029 より
template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
  IpProtocol: 'tcp',
  FromPort: 80,
  ToPort: 80,
  CidrIp: '0.0.0.0/0',
}); // 【確認内容】: HTTP トラフィックが 0.0.0.0/0 から許可されている
```

---

## 8. 要件定義との対応関係

### 8.1 参照した機能要件

| 要件ID | 内容 | 対応テストケース |
|--------|------|-----------------|
| REQ-024 | Aurora SG で外部からの直接アクセスを遮断 | TC-SG-09, TC-SG-21 |
| REQ-025 | Aurora SG で ECS SG からの 3306 のみ許可 | TC-SG-08, TC-SG-18, TC-SG-21 |
| REQ-028 | ALB を Public Subnet に配置、Internet-facing | TC-SG-02, TC-SG-03, TC-SG-19 |
| REQ-029 | HTTP→HTTPS リダイレクト（HTTP も受信） | TC-SG-02 |

### 8.2 参照した設計文書

| 文書 | 参照セクション | 対応テストケース |
|------|--------------|-----------------|
| architecture.md | CDK Stack構成、セキュリティ・配信層 | TC-SG-01〜22 |
| dataflow.md | セキュリティ境界設計 | TC-SG-05, TC-SG-08, TC-SG-17, TC-SG-18 |
| note.md | 型定義、CDKベストプラクティス | TC-SG-10, TC-SG-11, TC-SG-16, TC-SG-17, TC-SG-18 |
| TASK-0005.md | タスク定義、完了条件 | TC-SG-01〜22 |
| security-group-requirements.md | TDD用要件整理 | TC-SG-01〜22 |

---

## 9. テストケースサマリー

### 9.1 テストケース分類

| 分類 | テストケース数 | テストケースID |
|------|--------------|---------------|
| 正常系 | 11 | TC-SG-01〜11 |
| 異常系 | 2 | TC-SG-12〜13 |
| 境界値 | 3 | TC-SG-14〜16 |
| SG参照 | 2 | TC-SG-17〜18 |
| 最小権限 | 4 | TC-SG-19〜22 |
| **合計** | **22** | - |

### 9.2 信頼性レベル分布

| レベル | テストケース数 | 割合 | テストケースID |
|--------|--------------|------|---------------|
| 🔵 青信号 | 18 | 82% | TC-SG-01〜11, 16〜22 |
| 🟡 黄信号 | 3 | 14% | TC-SG-12, 14, 15 |
| 🔴 赤信号 | 1 | 4% | TC-SG-13 |

### 9.3 品質評価

**評価**: ✅ **高品質**

- **テストケース分類**: 正常系・異常系・境界値が網羅されている
- **期待値定義**: 各テストケースの期待値が明確
- **技術選択**: TypeScript + Jest + aws-cdk-lib/assertions が確定
- **実装可能性**: 既存テストパターン (vpc-construct.test.ts, endpoints-construct.test.ts) を参考に実装可能
- **信頼性レベル**: 🔵（青信号）が 82% と高い割合

---

## 10. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0005.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0005/note.md` |
| 要件整理 | `docs/implements/aws-cdk-serverless-architecture/TASK-0005/security-group-requirements.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| VPC Construct テスト (参考) | `infra/test/construct/vpc/vpc-construct.test.ts` |
| Endpoints Construct テスト (参考) | `infra/test/construct/vpc/endpoints-construct.test.ts` |

---

## 11. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-red aws-cdk-serverless-architecture TASK-0005` でRedフェーズ（失敗テスト作成）を開始します。
