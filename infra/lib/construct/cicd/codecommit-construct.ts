/**
 * CodeCommit Repository Construct 実装
 *
 * TASK-0023: CI/CD Pipeline 構築
 * フェーズ: TDD Refactor Phase - コード品質改善
 *
 * 【機能概要】: アプリケーションソースコード管理用の CodeCommit リポジトリを作成
 * 【実装方針】: シンプルな構成で再利用可能な Construct
 * 【テスト対応】: TC-CICD-001〜005, 032 の全6テストケースに対応
 *
 * 構成内容:
 * - CodeCommit リポジトリ作成 (REQ-040)
 * - リポジトリ名設定
 * - リポジトリ説明設定（オプション）
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-040 に基づく実装
 *
 * @module cicd/codecommit-construct
 */

import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import { Construct } from 'constructs';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * CodeCommit Construct の Props インターフェース
 *
 * シンプルな構成で再利用可能な CodeCommit リポジトリの設定を定義します。
 *
 * @interface CodeCommitConstructProps
 */
export interface CodeCommitConstructProps {
  /**
   * CodeCommit リポジトリの名前
   *
   * AWS アカウント内で一意である必要があります。
   *
   * @example 'dev-app-repository'
   */
  readonly repositoryName: string;

  /**
   * リポジトリの説明（オプション）
   *
   * リポジトリの目的や用途を説明するテキスト。
   *
   * @default undefined
   * @example 'Application source code repository'
   */
  readonly description?: string;
}

/**
 * CodeCommit Repository Construct
 *
 * アプリケーションソースコード管理用の CodeCommit リポジトリを作成する Construct です。
 * CI/CD パイプラインのソースステージで使用されます。
 *
 * @remarks
 * アーキテクチャ位置づけ:
 * ```
 * Ops Stack
 *   ↓
 * CodeCommit → CodeBuild → CodePipeline
 *     ↓            ↓            ↓
 * ソースコード  ビルド/テスト  オーケストレーション
 * ```
 *
 * @example
 * ```typescript
 * const codeCommit = new CodeCommitConstruct(this, 'CodeCommit', {
 *   repositoryName: 'dev-app-repository',
 *   description: 'Application source code repository',
 * });
 *
 * // CodePipeline との連携
 * const pipeline = new CodePipelineConstruct(this, 'Pipeline', {
 *   repository: codeCommit.repository,
 *   // ...
 * });
 * ```
 */
export class CodeCommitConstruct extends Construct {
  /**
   * 作成された CodeCommit リポジトリインスタンス
   *
   * CodePipeline の Source ステージで参照されます。
   */
  public readonly repository: codecommit.IRepository;

  /**
   * リポジトリの ARN
   *
   * IAM ポリシーやリソース参照で使用されます。
   */
  public readonly repositoryArn: string;

  /**
   * リポジトリの HTTPS Clone URL
   *
   * Git クローン操作で使用されます。
   */
  public readonly cloneUrlHttp: string;

  /**
   * CodeCommitConstruct を作成します
   *
   * @param scope - 親となる Construct
   * @param id - この Construct の識別子
   * @param props - リポジトリ設定
   */
  constructor(scope: Construct, id: string, props: CodeCommitConstructProps) {
    super(scope, id);

    // CodeCommit リポジトリの作成
    const repository = this.createRepository(props);

    // プロパティの公開
    this.repository = repository;
    this.repositoryArn = repository.repositoryArn;
    this.cloneUrlHttp = repository.repositoryCloneUrlHttp;
  }

  /**
   * CodeCommit リポジトリを作成します
   *
   * @param props - リポジトリ設定
   * @returns 作成された CodeCommit リポジトリ
   */
  private createRepository(
    props: CodeCommitConstructProps
  ): codecommit.Repository {
    return new codecommit.Repository(this, 'Repository', {
      repositoryName: props.repositoryName,
      description: props.description,
    });
  }
}
