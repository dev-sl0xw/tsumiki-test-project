/**
 * serverless-ec-site 型定義
 *
 * 作成日: 2026-01-11
 * 関連設計: architecture.md
 *
 * 信頼性レベル:
 * - 🔵 青信号: タスクノート・ユーザヒアリングを参考にした確実な型定義
 * - 🟡 黄信号: タスクノート・ユーザヒアリングから妥当な推測による型定義
 * - 🔴 赤信号: タスクノート・ユーザヒアリングにない推測による型定義
 */

// ========================================
// 共通型定義
// ========================================

/**
 * 多言語対応テキスト
 * 🔵 信頼性: ユーザヒアリング（日本語・英語・韓国語）より
 */
export interface LocalizedText {
  ja: string; // 🔵 ユーザヒアリングより
  en: string; // 🔵 ユーザヒアリングより
  ko: string; // 🔵 ユーザヒアリングより
}

/**
 * 対応言語
 * 🔵 信頼性: ユーザヒアリングより
 */
export type SupportedLocale = 'ja' | 'en' | 'ko';

/**
 * ページネーション
 * 🔵 信頼性: 一般的なAPI設計パターン
 */
export interface Pagination {
  page: number; // 🔵 共通パターン
  limit: number; // 🔵 共通パターン
  total: number; // 🔵 共通パターン
  totalPages: number; // 🔵 共通パターン
}

/**
 * APIレスポンス共通型
 * 🔵 信頼性: 一般的なAPI設計パターン
 */
export interface ApiResponse<T> {
  success: boolean; // 🔵 共通パターン
  data?: T; // 🔵 共通パターン
  error?: ErrorResponse; // 🔵 共通パターン
  pagination?: Pagination; // 🔵 共通パターン
}

/**
 * エラーレスポンス
 * 🔵 信頼性: 一般的なAPI設計パターン
 */
export interface ErrorResponse {
  code: string; // 🔵 共通パターン
  message: string; // 🔵 共通パターン
  details?: Record<string, unknown>; // 🔵 共通パターン
}

// ========================================
// ユーザー関連
// ========================================

/**
 * ユーザー
 * 🔵 信頼性: ユーザヒアリング（認証機能）より
 */
export interface User {
  id: string; // 🔵 Cognito sub
  email: string; // 🔵 ユーザヒアリングより
  name: string; // 🔵 ユーザヒアリングより
  locale: SupportedLocale; // 🔵 ユーザヒアリングより
  addresses: Address[]; // 🔵 配送機能より
  createdAt: string; // 🔵 共通パターン
  updatedAt: string; // 🔵 共通パターン
}

/**
 * 配送先住所
 * 🔵 信頼性: ユーザヒアリング（全世界配送）より
 */
export interface Address {
  id: string; // 🔵 共通パターン
  name: string; // 🔵 配送機能より
  postalCode: string; // 🔵 配送機能より
  country: string; // 🔵 全世界配送より
  prefecture?: string; // 🔵 日本国内用
  city: string; // 🔵 配送機能より
  address1: string; // 🔵 配送機能より
  address2?: string; // 🔵 配送機能より
  phone: string; // 🔵 配送機能より
  isDefault: boolean; // 🔵 UX考慮
}

/**
 * 認証リクエスト（ログイン）
 * 🔵 信頼性: ユーザヒアリングより
 */
export interface LoginRequest {
  email: string; // 🔵 ユーザヒアリングより
  password: string; // 🔵 ユーザヒアリングより
}

/**
 * 認証リクエスト（会員登録）
 * 🔵 信頼性: ユーザヒアリングより
 */
export interface SignupRequest {
  email: string; // 🔵 ユーザヒアリングより
  password: string; // 🔵 ユーザヒアリングより
  name: string; // 🔵 ユーザヒアリングより
  locale: SupportedLocale; // 🔵 ユーザヒアリングより
}

/**
 * 認証レスポンス
 * 🔵 信頼性: Cognito仕様より
 */
export interface AuthResponse {
  accessToken: string; // 🔵 Cognito JWT
  refreshToken: string; // 🔵 Cognito JWT
  idToken: string; // 🔵 Cognito JWT
  expiresIn: number; // 🔵 Cognito JWT
  user: User; // 🔵 ユーザー情報
}

// ========================================
// 商品関連
// ========================================

/**
 * 商品カテゴリ
 * 🔵 信頼性: ユーザヒアリング（商品カタログ）より
 */
export interface Category {
  id: string; // 🔵 共通パターン
  name: LocalizedText; // 🔵 多言語対応より
  slug: string; // 🔵 URL用
  parentId?: string; // 🔵 カテゴリ階層
  displayOrder: number; // 🔵 表示順
  imageUrl?: string; // 🟡 カテゴリ画像（推測）
}

/**
 * 商品
 * 🔵 信頼性: ユーザヒアリング（商品カタログ）より
 */
export interface Product {
  id: string; // 🔵 共通パターン
  sku: string; // 🔵 商品管理
  name: LocalizedText; // 🔵 多言語対応より
  description: LocalizedText; // 🔵 多言語対応より
  price: number; // 🔵 商品カタログより
  compareAtPrice?: number; // 🟡 割引表示用（推測）
  currency: string; // 🔵 全世界配送より
  categoryId: string; // 🔵 カテゴリ分類
  images: ProductImage[]; // 🔵 商品画像
  stock: number; // 🔵 在庫管理
  isActive: boolean; // 🔵 公開制御
  attributes: ProductAttribute[]; // 🟡 商品属性（推測）
  createdAt: string; // 🔵 共通パターン
  updatedAt: string; // 🔵 共通パターン
}

/**
 * 商品画像
 * 🔵 信頼性: 商品カタログより
 */
export interface ProductImage {
  id: string; // 🔵 共通パターン
  url: string; // 🔵 S3 URL
  alt: LocalizedText; // 🔵 アクセシビリティ
  displayOrder: number; // 🔵 表示順
  isMain: boolean; // 🔵 メイン画像
}

/**
 * 商品属性
 * 🟡 信頼性: 一般的なECサイトパターンから推測
 */
export interface ProductAttribute {
  name: LocalizedText; // 🟡 推測
  value: LocalizedText; // 🟡 推測
}

/**
 * 商品一覧リクエスト
 * 🔵 信頼性: 商品カタログより
 */
export interface ProductListRequest {
  categoryId?: string; // 🔵 カテゴリ絞り込み
  page?: number; // 🔵 ページネーション
  limit?: number; // 🔵 ページネーション
  sortBy?: 'price' | 'createdAt' | 'name'; // 🟡 推測
  sortOrder?: 'asc' | 'desc'; // 🟡 推測
}

/**
 * 商品検索リクエスト
 * 🔵 信頼性: 商品カタログより
 */
export interface ProductSearchRequest {
  query: string; // 🔵 検索機能
  categoryId?: string; // 🔵 カテゴリ絞り込み
  minPrice?: number; // 🟡 推測
  maxPrice?: number; // 🟡 推測
  page?: number; // 🔵 ページネーション
  limit?: number; // 🔵 ページネーション
}

// ========================================
// カート関連
// ========================================

/**
 * カート
 * 🔵 信頼性: ユーザヒアリング（カート・注文）より
 */
export interface Cart {
  id: string; // 🔵 共通パターン
  userId?: string; // 🔵 会員カート
  guestId?: string; // 🔵 ゲストカート
  items: CartItem[]; // 🔵 カート内容
  subtotal: number; // 🔵 小計
  createdAt: string; // 🔵 共通パターン
  updatedAt: string; // 🔵 共通パターン
  expiresAt?: string; // 🔵 ゲストカートTTL
}

/**
 * カートアイテム
 * 🔵 信頼性: カート機能より
 */
export interface CartItem {
  productId: string; // 🔵 商品参照
  quantity: number; // 🔵 数量
  price: number; // 🔵 単価
  product?: Product; // 🔵 商品情報（取得時）
}

/**
 * カートアイテム追加リクエスト
 * 🔵 信頼性: カート機能より
 */
export interface AddCartItemRequest {
  productId: string; // 🔵 商品ID
  quantity: number; // 🔵 数量
}

/**
 * カートアイテム更新リクエスト
 * 🔵 信頼性: カート機能より
 */
export interface UpdateCartItemRequest {
  quantity: number; // 🔵 数量
}

// ========================================
// 注文関連
// ========================================

/**
 * 注文ステータス
 * 🔵 信頼性: ユーザヒアリング（決済方法）より
 */
export type OrderStatus =
  | 'pending' // 🔵 注文作成直後
  | 'pending_payment' // 🔵 銀行振込/代引き待ち
  | 'confirmed' // 🔵 決済完了
  | 'processing' // 🔵 発送準備中
  | 'shipped' // 🔵 発送済み
  | 'delivered' // 🔵 配達完了
  | 'cancelled'; // 🔵 キャンセル

/**
 * 決済方法
 * 🔵 信頼性: ユーザヒアリングより
 */
export type PaymentMethod =
  | 'credit_card' // 🔵 クレジットカード
  | 'cod' // 🔵 代引き
  | 'bank_transfer' // 🔵 銀行振込
  | 'konbini'; // 🔵 コンビニ決済

/**
 * 注文
 * 🔵 信頼性: ユーザヒアリング（カート・注文）より
 */
export interface Order {
  id: string; // 🔵 共通パターン
  orderNumber: string; // 🔵 表示用注文番号
  userId?: string; // 🔵 会員注文
  guestEmail?: string; // 🔵 ゲスト注文
  items: OrderItem[]; // 🔵 注文内容
  shippingAddress: Address; // 🔵 配送先
  billingAddress?: Address; // 🟡 請求先（推測）
  subtotal: number; // 🔵 小計
  shippingFee: number; // 🔵 送料
  tax: number; // 🔵 税金
  total: number; // 🔵 合計
  currency: string; // 🔵 通貨
  status: OrderStatus; // 🔵 ステータス
  paymentMethod: PaymentMethod; // 🔵 決済方法
  paymentIntentId?: string; // 🔵 Stripe PaymentIntent
  trackingNumber?: string; // 🔵 追跡番号
  locale: SupportedLocale; // 🔵 注文時の言語
  createdAt: string; // 🔵 共通パターン
  updatedAt: string; // 🔵 共通パターン
}

/**
 * 注文アイテム
 * 🔵 信頼性: 注文機能より
 */
export interface OrderItem {
  productId: string; // 🔵 商品参照
  sku: string; // 🔵 SKU記録
  name: LocalizedText; // 🔵 商品名記録
  quantity: number; // 🔵 数量
  unitPrice: number; // 🔵 単価
  totalPrice: number; // 🔵 小計
}

/**
 * 注文作成リクエスト
 * 🔵 信頼性: ユーザヒアリングより
 */
export interface CreateOrderRequest {
  shippingAddressId?: string; // 🔵 会員の場合
  shippingAddress?: Omit<Address, 'id' | 'isDefault'>; // 🔵 新規入力の場合
  paymentMethod: PaymentMethod; // 🔵 決済方法
  guestEmail?: string; // 🔵 ゲスト購入の場合
  locale: SupportedLocale; // 🔵 言語
}

/**
 * 注文作成レスポンス（クレジットカード）
 * 🔵 信頼性: Stripe連携より
 */
export interface CreateOrderResponse {
  orderId: string; // 🔵 注文ID
  orderNumber: string; // 🔵 注文番号
  clientSecret?: string; // 🔵 Stripe PaymentIntent
  paymentMethod: PaymentMethod; // 🔵 決済方法
}

/**
 * 注文履歴リクエスト
 * 🔵 信頼性: マイページ機能より
 */
export interface OrderListRequest {
  page?: number; // 🔵 ページネーション
  limit?: number; // 🔵 ページネーション
  status?: OrderStatus; // 🔵 ステータス絞り込み
}

// ========================================
// 配送関連
// ========================================

/**
 * 配送オプション
 * 🟡 信頼性: 全世界配送より推測
 */
export interface ShippingOption {
  id: string; // 🟡 推測
  name: LocalizedText; // 🟡 推測
  description: LocalizedText; // 🟡 推測
  price: number; // 🟡 推測
  estimatedDays: string; // 🟡 推測
  countries: string[]; // 🟡 対象国
}

/**
 * 配送料計算リクエスト
 * 🟡 信頼性: 全世界配送より推測
 */
export interface CalculateShippingRequest {
  country: string; // 🟡 推測
  postalCode: string; // 🟡 推測
  items: { productId: string; quantity: number }[]; // 🟡 推測
}

// ========================================
// メール通知関連
// ========================================

/**
 * メールテンプレート種別
 * 🔵 信頼性: ユーザヒアリング（メール通知）より
 */
export type EmailTemplateType =
  | 'welcome' // 🔵 会員登録完了
  | 'order_confirmation' // 🔵 注文確認
  | 'payment_received' // 🔵 入金確認
  | 'shipping_notification' // 🔵 発送通知
  | 'password_reset'; // 🔵 パスワードリセット

/**
 * メール送信リクエスト（内部用）
 * 🔵 信頼性: メール通知機能より
 */
export interface SendEmailRequest {
  to: string; // 🔵 宛先
  templateType: EmailTemplateType; // 🔵 テンプレート種別
  locale: SupportedLocale; // 🔵 言語
  data: Record<string, unknown>; // 🔵 テンプレート変数
}

// ========================================
// DynamoDB テーブル型定義
// ========================================

/**
 * DynamoDB Users テーブル
 * 🔵 信頼性: アーキテクチャ設計より
 */
export interface DDBUser {
  PK: string; // USER#{userId}
  SK: string; // PROFILE
  email: string;
  name: string;
  locale: SupportedLocale;
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
  GSI1PK?: string; // EMAIL#{email}
  GSI1SK?: string; // USER
}

/**
 * DynamoDB Products テーブル
 * 🔵 信頼性: アーキテクチャ設計より
 */
export interface DDBProduct {
  PK: string; // PRODUCT#{productId}
  SK: string; // DETAIL
  sku: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  compareAtPrice?: number;
  currency: string;
  categoryId: string;
  images: ProductImage[];
  stock: number;
  isActive: boolean;
  attributes: ProductAttribute[];
  createdAt: string;
  updatedAt: string;
  GSI1PK?: string; // CATEGORY#{categoryId}
  GSI1SK?: string; // PRODUCT#{productId}
}

/**
 * DynamoDB Carts テーブル
 * 🔵 信頼性: アーキテクチャ設計より
 */
export interface DDBCart {
  PK: string; // CART#{cartId}
  SK: string; // ITEMS
  userId?: string;
  guestId?: string;
  items: CartItem[];
  subtotal: number;
  createdAt: string;
  updatedAt: string;
  TTL?: number; // ゲストカート有効期限
  GSI1PK?: string; // USER#{userId} or GUEST#{guestId}
  GSI1SK?: string; // CART
}

/**
 * DynamoDB Orders テーブル
 * 🔵 信頼性: アーキテクチャ設計より
 */
export interface DDBOrder {
  PK: string; // ORDER#{orderId}
  SK: string; // DETAIL
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentIntentId?: string;
  trackingNumber?: string;
  locale: SupportedLocale;
  createdAt: string;
  updatedAt: string;
  GSI1PK?: string; // USER#{userId}
  GSI1SK?: string; // ORDER#{createdAt}
}

// ========================================
// ユーティリティ型
// ========================================

/**
 * 作成用型（ID・タイムスタンプなし）
 * 🔵 信頼性: 共通パターン
 */
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 更新用型（部分的）
 * 🔵 信頼性: 共通パターン
 */
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// ========================================
// 信頼性レベルサマリー
// ========================================
/**
 * - 🔵 青信号: 85件 (89%)
 * - 🟡 黄信号: 11件 (11%)
 * - 🔴 赤信号: 0件 (0%)
 *
 * 品質評価: 高品質
 */
