# TDD テストケース: VPC Construct 実装

**タスクID**: TASK-0002
**機能名**: VPC Construct 実装
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-15
**フェーズ**: Phase 1 - 基盤構築

---

## 目次

1. [開発言語・フレームワーク](#1-開発言語フレームワーク)
2. [正常系テストケース](#2-正常系テストケース)
3. [異常系テストケース](#3-異常系テストケース)
4. [境界値テストケース](#4-境界値テストケース)
5. [テストケース実装時のコメント指針](#5-テストケース実装時のコメント指針)
6. [要件定義との対応関係](#6-要件定義との対応関係)
7. [信頼性レベルサマリー](#7-信頼性レベルサマリー)

---

## 1. 開発言語・フレームワーク

- **プログラミング言語**: TypeScript (~5.6.3)
  - **言語選択の理由**: AWS CDK v2 の公式サポート言語であり、型安全性による開発効率向上と CloudFormation テンプレート生成時のエラー検出が可能
  - **テストに適した機能**: 型定義による IDE サポート、インターフェースによるモック作成の容易さ
- **テストフレームワーク**: Jest (^29.7.0) + aws-cdk-lib/assertions
  - **フレームワーク選択の理由**: CDK 公式のアサーションライブラリとの統合が容易、スナップショットテストのサポート
  - **テスト実行環境**: Node.js (ES2018 Target)、`npm test` コマンドで実行
- 🔵 **信頼性**: 要件定義書・note.md・package.json より確認

---

## 2. 正常系テストケース

### TC-VPC-01: VPC が正しい CIDR で作成される

- **テスト名**: VPC CIDR 10.0.0.0/16 での作成確認
  - **何をテストするか**: VPC Construct が CIDR Block `10.0.0.0/16` の VPC を正しく作成すること
  - **期待される動作**: ec2.Vpc コンストラクタが指定された CIDR で VPC リソースを生成する
- **入力値**: デフォルト設定（vpcCidr 指定なし、または `'10.0.0.0/16'` を指定）
  - **入力データの意味**: 要件定義書 REQ-001 で定義された標準 CIDR Block
- **期待される結果**: `AWS::EC2::VPC` リソースの `CidrBlock` プロパティが `'10.0.0.0/16'`
  - **期待結果の理由**: REQ-001「CIDR Block 10.0.0.0/16 の VPC 作成」を満たすため
- **テストの目的**: VPC の基本作成機能の確認
  - **確認ポイント**: CidrBlock プロパティの正確な値
- 🔵 **信頼性**: REQ-001 より（要件定義書に明記）

---

### TC-VPC-02: Public Subnet が /24 で各 AZ に作成される

- **テスト名**: Public Subnet の CIDR マスク /24 での作成確認
  - **何をテストするか**: Public Subnet が CIDR マスク /24 で 2つの AZ にそれぞれ作成されること
  - **期待される動作**: SubnetConfiguration で PUBLIC タイプ、cidrMask: 24 が適用される
- **入力値**: デフォルト設定（publicSubnetCidrMask 指定なし、または `24` を指定）
  - **入力データの意味**: REQ-003 で定義された Public Subnet の CIDR マスク
- **期待される結果**:
  - `AWS::EC2::Subnet` リソースが 2つ存在する（Public タイプ）
  - `MapPublicIpOnLaunch: true` が設定されている
  - 各サブネットの CIDR が /24 サイズ（例: 10.0.0.0/24, 10.0.1.0/24）
  - **期待結果の理由**: REQ-003「Public Subnet /24 x 2」を満たすため
- **テストの目的**: Public Subnet の正しい構成確認
  - **確認ポイント**: サブネット数、CIDR マスク、MapPublicIpOnLaunch 設定
- 🔵 **信頼性**: REQ-003 より（要件定義書に明記）

---

### TC-VPC-03: Private App Subnet が /23 で各 AZ に作成される

- **テスト名**: Private App Subnet の CIDR マスク /23 での作成確認
  - **何をテストするか**: Private App Subnet が CIDR マスク /23 で 2つの AZ にそれぞれ作成されること
  - **期待される動作**: SubnetConfiguration で PRIVATE_WITH_EGRESS タイプ、cidrMask: 23 が適用される
- **入力値**: デフォルト設定（privateAppSubnetCidrMask 指定なし、または `23` を指定）
  - **入力データの意味**: REQ-004 で定義された Private App Subnet の CIDR マスク
- **期待される結果**:
  - PRIVATE_WITH_EGRESS タイプの `AWS::EC2::Subnet` リソースが 2つ存在する
  - 各サブネットの CIDR が /23 サイズ（例: 10.0.2.0/23, 10.0.4.0/23）
  - NAT Gateway へのルートが設定される
  - **期待結果の理由**: REQ-004「Private App Subnet /23 x 2」を満たすため
- **テストの目的**: Private App Subnet の正しい構成確認
  - **確認ポイント**: サブネット数、CIDR マスク、サブネットタイプ
- 🔵 **信頼性**: REQ-004 より（要件定義書に明記）

---

### TC-VPC-04: Private DB Subnet が /24 で各 AZ に作成される

- **テスト名**: Private DB Subnet の CIDR マスク /24 での作成確認
  - **何をテストするか**: Private DB Subnet が CIDR マスク /24 で 2つの AZ にそれぞれ作成されること
  - **期待される動作**: SubnetConfiguration で PRIVATE_ISOLATED タイプ、cidrMask: 24 が適用される
- **入力値**: デフォルト設定（privateDbSubnetCidrMask 指定なし、または `24` を指定）
  - **入力データの意味**: REQ-005 で定義された Private DB Subnet の CIDR マスク
- **期待される結果**:
  - PRIVATE_ISOLATED タイプの `AWS::EC2::Subnet` リソースが 2つ存在する
  - 各サブネットの CIDR が /24 サイズ（例: 10.0.6.0/24, 10.0.7.0/24）
  - 外部へのルートが存在しない
  - **期待結果の理由**: REQ-005「Private DB Subnet /24 x 2」を満たすため
- **テストの目的**: Private DB Subnet の正しい構成確認（データベース保護）
  - **確認ポイント**: サブネット数、CIDR マスク、ISOLATED タイプであること
- 🔵 **信頼性**: REQ-005 より（要件定義書に明記）

---

### TC-VPC-05: NAT Gateway が各 AZ に 1 つずつ作成される

- **テスト名**: NAT Gateway の Multi-AZ 配置確認
  - **何をテストするか**: NAT Gateway が 2つの AZ にそれぞれ 1 つずつ配置されること
  - **期待される動作**: natGateways: 2 の設定により、各 Public Subnet に NAT Gateway が作成される
- **入力値**: デフォルト設定（natGateways 指定なし、または `2` を指定）
  - **入力データの意味**: REQ-007 で定義された NAT Gateway 数（高可用性のため各 AZ に配置）
- **期待される結果**:
  - `AWS::EC2::NatGateway` リソースが 2つ存在する
  - 各 NAT Gateway が異なる Public Subnet に配置される
  - Elastic IP が NAT Gateway にアタッチされる
  - **期待結果の理由**: REQ-007「NAT Gateway 各 AZ に 1個ずつ」を満たすため
- **テストの目的**: NAT Gateway の高可用性構成確認
  - **確認ポイント**: NAT Gateway 数、配置サブネット
- 🔵 **信頼性**: REQ-007 より（要件定義書に明記）

---

### TC-VPC-06: Internet Gateway が 1 つ作成される

- **テスト名**: Internet Gateway の作成確認
  - **何をテストするか**: Internet Gateway が 1 つ作成され、VPC にアタッチされること
  - **期待される動作**: PUBLIC サブネットタイプを指定することで CDK が自動的に Internet Gateway を作成
- **入力値**: デフォルト設定（PUBLIC サブネットが存在する構成）
  - **入力データの意味**: REQ-006 で定義された Internet Gateway（インターネットアクセス用）
- **期待される結果**:
  - `AWS::EC2::InternetGateway` リソースが 1つ存在する
  - `AWS::EC2::VPCGatewayAttachment` で VPC にアタッチされる
  - **期待結果の理由**: REQ-006「Internet Gateway 1個作成」を満たすため
- **テストの目的**: インターネット接続性の基盤確認
  - **確認ポイント**: Internet Gateway 数、VPC へのアタッチメント
- 🔵 **信頼性**: REQ-006 より（要件定義書に明記）

---

### TC-VPC-07: 合計 6 つのサブネットが作成される

- **テスト名**: サブネット総数の確認
  - **何をテストするか**: 3層サブネット x 2 AZ = 合計 6 つのサブネットが作成されること
  - **期待される動作**: subnetConfiguration で指定した 3 タイプ x maxAzs: 2 = 6 サブネット
- **入力値**: デフォルト設定
  - **入力データの意味**: REQ-002〜005 で定義された Multi-AZ 3層構成
- **期待される結果**:
  - `AWS::EC2::Subnet` リソースが合計 6つ存在する
  - Public: 2、Private App: 2、Private DB: 2 の内訳
  - **期待結果の理由**: REQ-002「2つの AZ で Multi-AZ 構成」+ REQ-003〜005 の各サブネット要件を満たすため
- **テストの目的**: 全体的なサブネット構成の整合性確認
  - **確認ポイント**: サブネット総数
- 🔵 **信頼性**: REQ-002〜005 より（要件定義書に明記）

---

### TC-VPC-08: Route Table が正しく作成される

- **テスト名**: Route Table の作成確認
  - **何をテストするか**: 各サブネットタイプに対応する Route Table が作成されること
  - **期待される動作**: CDK が自動的に適切なルーティング設定を行う
- **入力値**: デフォルト設定
  - **入力データの意味**: VPC ネットワーク構成の一部
- **期待される結果**:
  - Public Subnet 用 Route Table に Internet Gateway へのルート（0.0.0.0/0）
  - Private App Subnet 用 Route Table に NAT Gateway へのルート（0.0.0.0/0）
  - Private DB Subnet 用 Route Table には外部ルートなし
  - **期待結果の理由**: 各サブネットタイプの通信要件を満たすため
- **テストの目的**: ネットワークルーティングの正確性確認
  - **確認ポイント**: Route Table 数、各ルートの宛先とターゲット
- 🟡 **信頼性**: CDK の動作仕様から妥当な推測

---

### TC-VPC-09: VPC Construct が vpc プロパティを公開する

- **テスト名**: vpc プロパティの公開確認
  - **何をテストするか**: VpcConstruct インスタンスから vpc プロパティにアクセスできること
  - **期待される動作**: Construct が作成した VPC オブジェクトを外部に公開する
- **入力値**: VpcConstruct インスタンス
  - **入力データの意味**: 他の Construct/Stack から VPC を参照するため
- **期待される結果**:
  - `vpcConstruct.vpc` が `ec2.IVpc` 型のオブジェクトを返す
  - vpc オブジェクトが null/undefined でない
  - **期待結果の理由**: interfaces.ts で定義された出力仕様を満たすため
- **テストの目的**: Construct インターフェースの確認
  - **確認ポイント**: プロパティの存在と型
- 🔵 **信頼性**: interfaces.ts・vpc-construct-requirements.md より

---

### TC-VPC-10: VPC Construct が Subnet 配列プロパティを公開する

- **テスト名**: Subnet 配列プロパティの公開確認
  - **何をテストするか**: VpcConstruct が publicSubnets, privateAppSubnets, privateDbSubnets を公開すること
  - **期待される動作**: 各サブネットタイプの配列を外部に公開する
- **入力値**: VpcConstruct インスタンス
  - **入力データの意味**: 他の Construct/Stack からサブネットを参照するため
- **期待される結果**:
  - `vpcConstruct.publicSubnets` が 2 要素の配列
  - `vpcConstruct.privateAppSubnets` が 2 要素の配列
  - `vpcConstruct.privateDbSubnets` が 2 要素の配列
  - 各要素が `ec2.ISubnet` 型
  - **期待結果の理由**: interfaces.ts で定義された出力仕様を満たすため
- **テストの目的**: Construct インターフェースの確認
  - **確認ポイント**: 配列の長さと要素の型
- 🔵 **信頼性**: interfaces.ts・vpc-construct-requirements.md より

---

### TC-VPC-11: カスタム Props での VPC 作成

- **テスト名**: カスタム設定での VPC 作成確認
  - **何をテストするか**: Props を指定した場合にその値が反映されること
  - **期待される動作**: デフォルト値を上書きして VPC を作成する
- **入力値**:
  ```typescript
  {
    vpcCidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 2,
    publicSubnetCidrMask: 24,
    privateAppSubnetCidrMask: 23,
    privateDbSubnetCidrMask: 24,
  }
  ```
  - **入力データの意味**: 明示的に全てのパラメータを指定したケース
- **期待される結果**:
  - 指定した値で VPC およびサブネットが作成される
  - デフォルト値と同じ結果になる（このテストでは同一値を使用）
  - **期待結果の理由**: Props インターフェースが正しく機能することの確認
- **テストの目的**: カスタム設定の動作確認
  - **確認ポイント**: Props 値の反映
- 🟡 **信頼性**: interfaces.ts から妥当な推測

---

## 3. 異常系テストケース

### TC-VPC-E01: 不正な CIDR 形式でのエラー

- **テスト名**: 不正な CIDR 形式の検証
  - **エラーケースの概要**: CIDR 形式として不正な文字列が指定された場合のエラー処理
  - **エラー処理の重要性**: 不正な設定でのデプロイを防止し、早期にエラーを検出するため
- **入力値**:
  - `vpcCidr: 'invalid-cidr'`（形式不正）
  - `vpcCidr: '256.0.0.0/16'`（オクテット範囲外）
  - `vpcCidr: '10.0.0.0'`（プレフィックス欠落）
  - **不正な理由**: CIDR 表記の RFC 4632 規格に準拠していない
  - **実際の発生シナリオ**: 設定ファイルの入力ミス、コピペエラー
- **期待される結果**:
  - CDK synth 時または deploy 時にエラーが発生する
  - エラーメッセージに CIDR が不正である旨が含まれる
  - **エラーメッセージの内容**: `Invalid CIDR block` または同等のメッセージ
  - **システムの安全性**: 不正な設定でリソースが作成されない
- **テストの目的**: 入力バリデーションの確認
  - **品質保証の観点**: ユーザーの設定ミスを早期に検出
- 🟡 **信頼性**: AWS 仕様・CDK バリデーション動作から妥当な推測

---

### TC-VPC-E02: CIDR マスクが VPC CIDR より大きい場合のエラー

- **テスト名**: CIDR マスク範囲エラーの検証
  - **エラーケースの概要**: サブネットの CIDR マスクが VPC CIDR マスクより小さい（範囲が大きい）場合
  - **エラー処理の重要性**: VPC の IP 範囲を超えるサブネットの作成を防止
- **入力値**:
  - `vpcCidr: '10.0.0.0/16'`
  - `publicSubnetCidrMask: 15`（VPC の /16 より広い範囲）
  - **不正な理由**: サブネットは VPC の範囲内に収まる必要がある
  - **実際の発生シナリオ**: CIDR 設計の誤り、パラメータの入力ミス
- **期待される結果**:
  - CDK synth 時にエラーが発生する
  - エラーメッセージに CIDR マスクの範囲エラーが含まれる
  - **エラーメッセージの内容**: サブネットマスクが VPC マスクより小さいことを示すメッセージ
  - **システムの安全性**: 不整合な設定でリソースが作成されない
- **テストの目的**: CIDR 設計の整合性チェック
  - **品質保証の観点**: ネットワーク設計エラーの早期検出
- 🟡 **信頼性**: AWS 仕様から妥当な推測

---

### TC-VPC-E03: maxAzs が 0 の場合のエラー

- **テスト名**: maxAzs = 0 でのエラー検証
  - **エラーケースの概要**: 可用性ゾーン数が 0 の場合のエラー処理
  - **エラー処理の重要性**: VPC にサブネットが存在しない無効な構成を防止
- **入力値**: `maxAzs: 0`
  - **不正な理由**: 最低 1 つの AZ が必要
  - **実際の発生シナリオ**: パラメータの入力ミス
- **期待される結果**:
  - CDK synth 時にエラーまたは警告が発生する
  - または、サブネットが 1 つも作成されない
  - **エラーメッセージの内容**: maxAzs の値が不正であることを示すメッセージ
  - **システムの安全性**: 使用不能な VPC 構成が作成されない
- **テストの目的**: パラメータ境界値の検証
  - **品質保証の観点**: 無効な構成の防止
- 🟡 **信頼性**: CDK 動作仕様から妥当な推測

---

### TC-VPC-E04: natGateways が maxAzs より大きい場合の動作

- **テスト名**: natGateways > maxAzs の動作確認
  - **エラーケースの概要**: NAT Gateway 数が AZ 数を超える場合の動作
  - **エラー処理の重要性**: CDK の動作を理解し、予期しない構成を防止
- **入力値**:
  - `maxAzs: 2`
  - `natGateways: 5`
  - **不正な理由**: 各 AZ に 1 つ以上の NAT Gateway を配置することは通常不要
  - **実際の発生シナリオ**: パラメータの設定ミス
- **期待される結果**:
  - CDK が自動的に maxAzs の数に制限するか、エラーが発生する
  - NAT Gateway が最大 2 つ作成される（maxAzs に制限）
  - **エラーメッセージの内容**: 警告メッセージまたは自動調整
  - **システムの安全性**: 過剰なリソース作成を防止
- **テストの目的**: CDK の自動調整動作の確認
  - **品質保証の観点**: 予期しないコスト増加の防止
- 🟡 **信頼性**: CDK 動作仕様から妥当な推測

---

### TC-VPC-E05: サブネット CIDR が重複する場合のエラー

- **テスト名**: サブネット CIDR 重複エラーの検証
  - **エラーケースの概要**: サブネットの CIDR が互いに重複する設定
  - **エラー処理の重要性**: ネットワーク競合を防止
- **入力値**:
  - 3層サブネット x 2 AZ で IP が不足する CIDR 設計
  - 例: VPC /28 に対して /24 サブネットを複数作成しようとする
  - **不正な理由**: VPC の IP アドレス空間が不足
  - **実際の発生シナリオ**: CIDR 設計の誤り
- **期待される結果**:
  - CDK synth 時にエラーが発生する
  - エラーメッセージに CIDR 重複または IP 枯渇が含まれる
  - **エラーメッセージの内容**: `overlapping CIDR blocks` または同等のメッセージ
  - **システムの安全性**: 不整合なネットワーク構成が作成されない
- **テストの目的**: CIDR 設計の整合性チェック
  - **品質保証の観点**: ネットワーク設計エラーの早期検出
- 🟡 **信頼性**: AWS 仕様から妥当な推測

---

## 4. 境界値テストケース

### TC-VPC-B01: 最小 CIDR マスク /28 での VPC 作成

- **テスト名**: 最小 CIDR /28 での VPC 作成確認
  - **境界値の意味**: AWS VPC の最小 CIDR マスクは /28（16 IP アドレス）
  - **境界値での動作保証**: 最小サイズでの VPC 作成可否の確認
- **入力値**: `vpcCidr: '10.0.0.0/28'`
  - **境界値選択の根拠**: AWS の VPC CIDR 範囲制限の下限
  - **実際の使用場面**: 極めて小規模な開発環境（通常は使用しない）
- **期待される結果**:
  - VPC は作成されるが、サブネット分割に制限がある
  - 3層 x 2 AZ = 6 サブネットは /28 VPC には収まらない
  - エラーまたは警告が発生する
  - **境界での正確性**: CIDR 計算が正確に行われる
  - **一貫した動作**: 不足時は明確なエラーを返す
- **テストの目的**: 最小 CIDR での動作限界確認
  - **堅牢性の確認**: エッジケースでの適切なエラー処理
- 🟡 **信頼性**: AWS 仕様から妥当な推測

---

### TC-VPC-B02: 最大 CIDR マスク /16 での VPC 作成

- **テスト名**: 最大 CIDR /16 での VPC 作成確認
  - **境界値の意味**: AWS VPC の推奨最大 CIDR マスクは /16（65,536 IP アドレス）
  - **境界値での動作保証**: 最大サイズでの VPC 作成の確認
- **入力値**: `vpcCidr: '10.0.0.0/16'`
  - **境界値選択の根拠**: 要件定義書 REQ-001 で指定された CIDR
  - **実際の使用場面**: 本番環境での標準的な設定
- **期待される結果**:
  - VPC が正常に作成される
  - 全てのサブネットが適切に配置される
  - IP アドレスの枯渇なし
  - **境界での正確性**: 65,536 IP が正しく確保される
  - **一貫した動作**: 通常の動作と同様に処理される
- **テストの目的**: 標準的な本番構成の確認
  - **堅牢性の確認**: 大規模 VPC での正常動作
- 🔵 **信頼性**: REQ-001 より（要件定義書に明記）

---

### TC-VPC-B03: maxAzs = 1 での Single-AZ 構成

- **テスト名**: Single-AZ 構成での VPC 作成確認
  - **境界値の意味**: 最小の AZ 数での構成
  - **境界値での動作保証**: Single-AZ でも VPC が正常に作成されること
- **入力値**: `maxAzs: 1`
  - **境界値選択の根拠**: AZ 数の下限（1）
  - **実際の使用場面**: 開発環境でのコスト削減
- **期待される結果**:
  - VPC が正常に作成される
  - サブネットが 3つ（Public, Private App, Private DB 各 1）
  - NAT Gateway が 1つ
  - **境界での正確性**: リソース数が maxAzs に比例
  - **一貫した動作**: Multi-AZ と同様のルーティング設定
- **テストの目的**: 最小構成での動作確認
  - **堅牢性の確認**: 境界条件での正常動作
- 🟡 **信頼性**: CDK 動作仕様から妥当な推測

---

### TC-VPC-B04: maxAzs = 3 での 3-AZ 構成

- **テスト名**: 3-AZ 構成での VPC 作成確認
  - **境界値の意味**: 東京リージョンの最大 AZ 数（3）での構成
  - **境界値での動作保証**: 3 AZ でも VPC が正常に作成されること
- **入力値**: `maxAzs: 3`
  - **境界値選択の根拠**: ap-northeast-1 リージョンの AZ 数上限
  - **実際の使用場面**: 最高可用性が必要な本番環境
- **期待される結果**:
  - VPC が正常に作成される
  - サブネットが 9つ（3層 x 3 AZ）
  - NAT Gateway が 3つ（natGateways を 3 に設定した場合）
  - **境界での正確性**: リソース数が maxAzs に比例
  - **一貫した動作**: 2-AZ と同様の構成パターン
- **テストの目的**: 最大 AZ 構成での動作確認
  - **堅牢性の確認**: スケールアップ時の正常動作
- 🟡 **信頼性**: AWS リージョン仕様から妥当な推測

---

### TC-VPC-B05: natGateways = 0 での NAT なし構成

- **テスト名**: NAT Gateway なし構成での VPC 作成確認
  - **境界値の意味**: NAT Gateway を配置しない最小コスト構成
  - **境界値での動作保証**: NAT なしでも VPC が正常に作成されること
- **入力値**: `natGateways: 0`
  - **境界値選択の根拠**: NAT Gateway 数の下限（0）
  - **実際の使用場面**: Private Subnet からのインターネットアクセスが不要な場合
- **期待される結果**:
  - VPC が正常に作成される
  - NAT Gateway が 0 個
  - Private App Subnet から外部への直接アクセス不可
  - **境界での正確性**: NAT 関連リソースが作成されない
  - **一貫した動作**: VPC/サブネット/IGW は通常通り作成
- **テストの目的**: NAT なし構成での動作確認
  - **堅牢性の確認**: コスト最適化構成の対応
- 🟡 **信頼性**: CDK 動作仕様から妥当な推測

---

### TC-VPC-B06: CIDR マスク境界値 /16 と /28 のサブネット

- **テスト名**: サブネット CIDR マスク境界値の確認
  - **境界値の意味**: サブネット CIDR マスクの有効範囲
  - **境界値での動作保証**: 境界値でのサブネット作成可否
- **入力値**:
  - `publicSubnetCidrMask: 28`（最小: 16 IP）
  - `privateAppSubnetCidrMask: 16`（最大: VPC 全体）
  - **境界値選択の根拠**: AWS サブネット CIDR マスク範囲
  - **実際の使用場面**: 極端なサイズ設定のテスト
- **期待される結果**:
  - /28: 正常に作成される（AWS 許容範囲内）
  - /16: VPC CIDR と同じ場合、サブネット分割不可でエラー
  - **境界での正確性**: AWS の制限に準拠した動作
  - **一貫した動作**: 制限超過時は明確なエラー
- **テストの目的**: サブネットサイズ境界値の確認
  - **堅牢性の確認**: 極端な設定での適切な処理
- 🟡 **信頼性**: AWS 仕様から妥当な推測

---

## 5. テストケース実装時のコメント指針

### テストケース開始時のコメント

```typescript
// 【テスト目的】: VPC が CIDR 10.0.0.0/16 で正しく作成されることを確認
// 【テスト内容】: VpcConstruct をデフォルト設定でインスタンス化し、生成される CloudFormation テンプレートを検証
// 【期待される動作】: AWS::EC2::VPC リソースの CidrBlock プロパティが '10.0.0.0/16' であること
// 🔵 信頼性: REQ-001 より（要件定義書に明記）
```

### Given（準備フェーズ）のコメント

```typescript
// 【テストデータ準備】: CDK App と Stack を作成し、テスト対象の VpcConstruct をインスタンス化
// 【初期条件設定】: デフォルト Props で VPC を作成（CIDR: 10.0.0.0/16, maxAzs: 2, natGateways: 2）
// 【前提条件確認】: CDK ライブラリが正しくインポートされていること
```

### When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: Template.fromStack(stack) で CloudFormation テンプレートを生成
// 【処理内容】: VpcConstruct が作成するリソースを CloudFormation テンプレート形式で取得
// 【実行タイミング】: Construct インスタンス化後、アサーション実行前
```

### Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: VPC リソースの CidrBlock プロパティを検証
// 【期待値確認】: '10.0.0.0/16' であること（REQ-001 の要件）
// 【品質保証】: ネットワーク基盤の CIDR 設計が要件通りであることを保証
```

### 各 expect ステートメントのコメント

```typescript
// 【検証項目】: VPC CIDR Block の値
// 🔵 信頼性: REQ-001 より
template.hasResourceProperties('AWS::EC2::VPC', {
  CidrBlock: '10.0.0.0/16', // 【確認内容】: 要件定義書 REQ-001 で指定された CIDR Block
});

// 【検証項目】: NAT Gateway の数
// 🔵 信頼性: REQ-007 より
template.resourceCountIs('AWS::EC2::NatGateway', 2); // 【確認内容】: 各 AZ に 1 つずつ、計 2 個の NAT Gateway

// 【検証項目】: サブネット総数
// 🔵 信頼性: REQ-002〜005 より
template.resourceCountIs('AWS::EC2::Subnet', 6); // 【確認内容】: 3層 x 2 AZ = 6 サブネット
```

### セットアップ・クリーンアップのコメント

```typescript
beforeEach(() => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  vpcConstruct = new VpcConstruct(stack, 'TestVpc');
  template = Template.fromStack(stack);
});

afterEach(() => {
  // 【テスト後処理】: CDK リソースは GC により自動解放されるため、明示的なクリーンアップは不要
  // 【状態復元】: 次のテストに影響しないよう beforeEach で新規インスタンスを作成
});
```

---

## 6. 要件定義との対応関係

### 参照した機能概要

| セクション | 内容 | 参照元 |
|-----------|------|--------|
| VPC 概要 | CIDR 10.0.0.0/16 の VPC 作成 | `vpc-construct-requirements.md` セクション 1.1 |
| Multi-AZ | 2 AZ での高可用性構成 | `vpc-construct-requirements.md` セクション 1.2 |
| 3層サブネット | Public / Private App / Private DB | `vpc-construct-requirements.md` セクション 1.4 |

### 参照した入力・出力仕様

| セクション | 内容 | 参照元 |
|-----------|------|--------|
| VpcConstructProps | 入力パラメータ定義 | `vpc-construct-requirements.md` セクション 2.1 |
| 出力プロパティ | vpc, publicSubnets, privateAppSubnets, privateDbSubnets | `vpc-construct-requirements.md` セクション 2.2 |
| データフロー | VPC → Subnet → Gateway の関係 | `vpc-construct-requirements.md` セクション 2.3〜2.4 |

### 参照した制約条件

| セクション | 内容 | 参照元 |
|-----------|------|--------|
| パフォーマンス要件 | Multi-AZ、NAT Gateway 冗長化 | `vpc-construct-requirements.md` セクション 3.1 |
| セキュリティ要件 | 3層分離、DB 保護 | `vpc-construct-requirements.md` セクション 3.2 |
| IP 設計 | サブネット CIDR 割り当て | `vpc-construct-requirements.md` セクション 3.5 |

### 参照した使用例

| セクション | 内容 | 参照元 |
|-----------|------|--------|
| 基本使用パターン | デフォルト設定での使用 | `vpc-construct-requirements.md` セクション 4.1 |
| データフロー例 | トラフィックフロー図 | `vpc-construct-requirements.md` セクション 4.2 |
| エッジケース | NAT 障害、IP 枯渇 | `vpc-construct-requirements.md` セクション 4.3 |

### 要件 ID とテストケースの対応表

| 要件ID | 要件内容 | テストケース |
|--------|----------|-------------|
| REQ-001 | CIDR Block 10.0.0.0/16 の VPC 作成 | TC-VPC-01, TC-VPC-B02 |
| REQ-002 | 2つの AZ で Multi-AZ 構成 | TC-VPC-07 |
| REQ-003 | Public Subnet /24 x 2 | TC-VPC-02 |
| REQ-004 | Private App Subnet /23 x 2 | TC-VPC-03 |
| REQ-005 | Private DB Subnet /24 x 2 | TC-VPC-04 |
| REQ-006 | Internet Gateway 1個作成 | TC-VPC-06 |
| REQ-007 | NAT Gateway 各 AZ に 1個ずつ | TC-VPC-05 |

---

## 7. 信頼性レベルサマリー

### テストケース統計

| カテゴリ | 🔵 青信号 | 🟡 黄信号 | 🔴 赤信号 | 合計 |
|---------|----------|----------|----------|------|
| 正常系 | 9 | 2 | 0 | 11 |
| 異常系 | 0 | 5 | 0 | 5 |
| 境界値 | 1 | 5 | 0 | 6 |
| **合計** | **10** | **12** | **0** | **22** |

### パーセンテージ

- 🔵 **青信号**: 10件 (45%)
- 🟡 **黄信号**: 12件 (55%)
- 🔴 **赤信号**: 0件 (0%)

### 品質評価

**✅ 高品質**

- **テストケース分類**: 正常系・異常系・境界値が網羅されている
- **期待値定義**: 各テストケースの期待値が明確に定義されている
- **技術選択**: TypeScript + Jest + CDK assertions で確定
- **実装可能性**: CDK の標準テストパターンで実装可能
- **信頼性レベル**: 青信号が 45%、赤信号が 0%

### 黄信号項目の詳細（要確認）

| テストケース | 黄信号の理由 | 確認方法 |
|-------------|-------------|----------|
| TC-VPC-08 | Route Table の自動作成は CDK 動作仕様に依存 | CDK ドキュメントで確認 |
| TC-VPC-11 | カスタム Props の動作は実装時に確認 | 実装・テスト実行で確認 |
| TC-VPC-E01〜E05 | CDK のエラーハンドリング動作は実装依存 | テスト実行で確認 |
| TC-VPC-B01, B03〜B06 | 境界値での CDK 動作は実装依存 | テスト実行で確認 |

### 次のステップ

1. `/tsumiki:tdd-red aws-cdk-serverless-architecture TASK-0002` で Red フェーズ（失敗テスト作成）を開始
2. テスト実行により黄信号項目の動作を確認
3. 必要に応じてテストケースを追加・修正

---

## 関連文書

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0002.md` |
| 要件定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0002/vpc-construct-requirements.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0002/note.md` |
| タスク概要 | `docs/tasks/aws-cdk-serverless-architecture/overview.md` |
