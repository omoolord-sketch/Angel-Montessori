
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Class
 * 
 */
export type Class = $Result.DefaultSelection<Prisma.$ClassPayload>
/**
 * Model Student
 * 
 */
export type Student = $Result.DefaultSelection<Prisma.$StudentPayload>
/**
 * Model TermLock
 * 
 */
export type TermLock = $Result.DefaultSelection<Prisma.$TermLockPayload>
/**
 * Model Result
 * 
 */
export type Result = $Result.DefaultSelection<Prisma.$ResultPayload>
/**
 * Model ReportMeta
 * 
 */
export type ReportMeta = $Result.DefaultSelection<Prisma.$ReportMetaPayload>
/**
 * Model AuditLog
 * 
 */
export type AuditLog = $Result.DefaultSelection<Prisma.$AuditLogPayload>
/**
 * Model FinanceStudentProfile
 * 
 */
export type FinanceStudentProfile = $Result.DefaultSelection<Prisma.$FinanceStudentProfilePayload>
/**
 * Model FinanceFeeStructure
 * 
 */
export type FinanceFeeStructure = $Result.DefaultSelection<Prisma.$FinanceFeeStructurePayload>
/**
 * Model FinanceFeeComponent
 * 
 */
export type FinanceFeeComponent = $Result.DefaultSelection<Prisma.$FinanceFeeComponentPayload>
/**
 * Model FinanceFeeApproval
 * 
 */
export type FinanceFeeApproval = $Result.DefaultSelection<Prisma.$FinanceFeeApprovalPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const Role: {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  VIEWER: 'VIEWER'
};

export type Role = (typeof Role)[keyof typeof Role]


export const TermStatus: {
  DRAFT: 'DRAFT',
  LOCKED: 'LOCKED'
};

export type TermStatus = (typeof TermStatus)[keyof typeof TermStatus]


export const FinanceApprovalStatus: {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED'
};

export type FinanceApprovalStatus = (typeof FinanceApprovalStatus)[keyof typeof FinanceApprovalStatus]

}

export type Role = $Enums.Role

export const Role: typeof $Enums.Role

export type TermStatus = $Enums.TermStatus

export const TermStatus: typeof $Enums.TermStatus

export type FinanceApprovalStatus = $Enums.FinanceApprovalStatus

export const FinanceApprovalStatus: typeof $Enums.FinanceApprovalStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.class`: Exposes CRUD operations for the **Class** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Classes
    * const classes = await prisma.class.findMany()
    * ```
    */
  get class(): Prisma.ClassDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.student`: Exposes CRUD operations for the **Student** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Students
    * const students = await prisma.student.findMany()
    * ```
    */
  get student(): Prisma.StudentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.termLock`: Exposes CRUD operations for the **TermLock** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TermLocks
    * const termLocks = await prisma.termLock.findMany()
    * ```
    */
  get termLock(): Prisma.TermLockDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.result`: Exposes CRUD operations for the **Result** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Results
    * const results = await prisma.result.findMany()
    * ```
    */
  get result(): Prisma.ResultDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.reportMeta`: Exposes CRUD operations for the **ReportMeta** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ReportMetas
    * const reportMetas = await prisma.reportMeta.findMany()
    * ```
    */
  get reportMeta(): Prisma.ReportMetaDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.auditLog`: Exposes CRUD operations for the **AuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditLogs
    * const auditLogs = await prisma.auditLog.findMany()
    * ```
    */
  get auditLog(): Prisma.AuditLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.financeStudentProfile`: Exposes CRUD operations for the **FinanceStudentProfile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FinanceStudentProfiles
    * const financeStudentProfiles = await prisma.financeStudentProfile.findMany()
    * ```
    */
  get financeStudentProfile(): Prisma.FinanceStudentProfileDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.financeFeeStructure`: Exposes CRUD operations for the **FinanceFeeStructure** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FinanceFeeStructures
    * const financeFeeStructures = await prisma.financeFeeStructure.findMany()
    * ```
    */
  get financeFeeStructure(): Prisma.FinanceFeeStructureDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.financeFeeComponent`: Exposes CRUD operations for the **FinanceFeeComponent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FinanceFeeComponents
    * const financeFeeComponents = await prisma.financeFeeComponent.findMany()
    * ```
    */
  get financeFeeComponent(): Prisma.FinanceFeeComponentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.financeFeeApproval`: Exposes CRUD operations for the **FinanceFeeApproval** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FinanceFeeApprovals
    * const financeFeeApprovals = await prisma.financeFeeApproval.findMany()
    * ```
    */
  get financeFeeApproval(): Prisma.FinanceFeeApprovalDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.4.2
   * Query Engine version: 94a226be1cf2967af2541cca5529f0f7ba866919
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Class: 'Class',
    Student: 'Student',
    TermLock: 'TermLock',
    Result: 'Result',
    ReportMeta: 'ReportMeta',
    AuditLog: 'AuditLog',
    FinanceStudentProfile: 'FinanceStudentProfile',
    FinanceFeeStructure: 'FinanceFeeStructure',
    FinanceFeeComponent: 'FinanceFeeComponent',
    FinanceFeeApproval: 'FinanceFeeApproval'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "class" | "student" | "termLock" | "result" | "reportMeta" | "auditLog" | "financeStudentProfile" | "financeFeeStructure" | "financeFeeComponent" | "financeFeeApproval"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Class: {
        payload: Prisma.$ClassPayload<ExtArgs>
        fields: Prisma.ClassFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ClassFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ClassFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>
          }
          findFirst: {
            args: Prisma.ClassFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ClassFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>
          }
          findMany: {
            args: Prisma.ClassFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>[]
          }
          create: {
            args: Prisma.ClassCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>
          }
          createMany: {
            args: Prisma.ClassCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ClassCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>[]
          }
          delete: {
            args: Prisma.ClassDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>
          }
          update: {
            args: Prisma.ClassUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>
          }
          deleteMany: {
            args: Prisma.ClassDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ClassUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ClassUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>[]
          }
          upsert: {
            args: Prisma.ClassUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClassPayload>
          }
          aggregate: {
            args: Prisma.ClassAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateClass>
          }
          groupBy: {
            args: Prisma.ClassGroupByArgs<ExtArgs>
            result: $Utils.Optional<ClassGroupByOutputType>[]
          }
          count: {
            args: Prisma.ClassCountArgs<ExtArgs>
            result: $Utils.Optional<ClassCountAggregateOutputType> | number
          }
        }
      }
      Student: {
        payload: Prisma.$StudentPayload<ExtArgs>
        fields: Prisma.StudentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.StudentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.StudentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>
          }
          findFirst: {
            args: Prisma.StudentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.StudentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>
          }
          findMany: {
            args: Prisma.StudentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>[]
          }
          create: {
            args: Prisma.StudentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>
          }
          createMany: {
            args: Prisma.StudentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.StudentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>[]
          }
          delete: {
            args: Prisma.StudentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>
          }
          update: {
            args: Prisma.StudentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>
          }
          deleteMany: {
            args: Prisma.StudentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.StudentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.StudentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>[]
          }
          upsert: {
            args: Prisma.StudentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentPayload>
          }
          aggregate: {
            args: Prisma.StudentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateStudent>
          }
          groupBy: {
            args: Prisma.StudentGroupByArgs<ExtArgs>
            result: $Utils.Optional<StudentGroupByOutputType>[]
          }
          count: {
            args: Prisma.StudentCountArgs<ExtArgs>
            result: $Utils.Optional<StudentCountAggregateOutputType> | number
          }
        }
      }
      TermLock: {
        payload: Prisma.$TermLockPayload<ExtArgs>
        fields: Prisma.TermLockFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TermLockFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TermLockFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>
          }
          findFirst: {
            args: Prisma.TermLockFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TermLockFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>
          }
          findMany: {
            args: Prisma.TermLockFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>[]
          }
          create: {
            args: Prisma.TermLockCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>
          }
          createMany: {
            args: Prisma.TermLockCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TermLockCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>[]
          }
          delete: {
            args: Prisma.TermLockDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>
          }
          update: {
            args: Prisma.TermLockUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>
          }
          deleteMany: {
            args: Prisma.TermLockDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TermLockUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TermLockUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>[]
          }
          upsert: {
            args: Prisma.TermLockUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TermLockPayload>
          }
          aggregate: {
            args: Prisma.TermLockAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTermLock>
          }
          groupBy: {
            args: Prisma.TermLockGroupByArgs<ExtArgs>
            result: $Utils.Optional<TermLockGroupByOutputType>[]
          }
          count: {
            args: Prisma.TermLockCountArgs<ExtArgs>
            result: $Utils.Optional<TermLockCountAggregateOutputType> | number
          }
        }
      }
      Result: {
        payload: Prisma.$ResultPayload<ExtArgs>
        fields: Prisma.ResultFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ResultFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ResultFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>
          }
          findFirst: {
            args: Prisma.ResultFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ResultFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>
          }
          findMany: {
            args: Prisma.ResultFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>[]
          }
          create: {
            args: Prisma.ResultCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>
          }
          createMany: {
            args: Prisma.ResultCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ResultCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>[]
          }
          delete: {
            args: Prisma.ResultDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>
          }
          update: {
            args: Prisma.ResultUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>
          }
          deleteMany: {
            args: Prisma.ResultDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ResultUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ResultUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>[]
          }
          upsert: {
            args: Prisma.ResultUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResultPayload>
          }
          aggregate: {
            args: Prisma.ResultAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateResult>
          }
          groupBy: {
            args: Prisma.ResultGroupByArgs<ExtArgs>
            result: $Utils.Optional<ResultGroupByOutputType>[]
          }
          count: {
            args: Prisma.ResultCountArgs<ExtArgs>
            result: $Utils.Optional<ResultCountAggregateOutputType> | number
          }
        }
      }
      ReportMeta: {
        payload: Prisma.$ReportMetaPayload<ExtArgs>
        fields: Prisma.ReportMetaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ReportMetaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ReportMetaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>
          }
          findFirst: {
            args: Prisma.ReportMetaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ReportMetaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>
          }
          findMany: {
            args: Prisma.ReportMetaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>[]
          }
          create: {
            args: Prisma.ReportMetaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>
          }
          createMany: {
            args: Prisma.ReportMetaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ReportMetaCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>[]
          }
          delete: {
            args: Prisma.ReportMetaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>
          }
          update: {
            args: Prisma.ReportMetaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>
          }
          deleteMany: {
            args: Prisma.ReportMetaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ReportMetaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ReportMetaUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>[]
          }
          upsert: {
            args: Prisma.ReportMetaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportMetaPayload>
          }
          aggregate: {
            args: Prisma.ReportMetaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateReportMeta>
          }
          groupBy: {
            args: Prisma.ReportMetaGroupByArgs<ExtArgs>
            result: $Utils.Optional<ReportMetaGroupByOutputType>[]
          }
          count: {
            args: Prisma.ReportMetaCountArgs<ExtArgs>
            result: $Utils.Optional<ReportMetaCountAggregateOutputType> | number
          }
        }
      }
      AuditLog: {
        payload: Prisma.$AuditLogPayload<ExtArgs>
        fields: Prisma.AuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findFirst: {
            args: Prisma.AuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findMany: {
            args: Prisma.AuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          create: {
            args: Prisma.AuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          createMany: {
            args: Prisma.AuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          delete: {
            args: Prisma.AuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          update: {
            args: Prisma.AuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AuditLogUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          upsert: {
            args: Prisma.AuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          aggregate: {
            args: Prisma.AuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditLog>
          }
          groupBy: {
            args: Prisma.AuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AuditLogCountAggregateOutputType> | number
          }
        }
      }
      FinanceStudentProfile: {
        payload: Prisma.$FinanceStudentProfilePayload<ExtArgs>
        fields: Prisma.FinanceStudentProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FinanceStudentProfileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FinanceStudentProfileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>
          }
          findFirst: {
            args: Prisma.FinanceStudentProfileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FinanceStudentProfileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>
          }
          findMany: {
            args: Prisma.FinanceStudentProfileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>[]
          }
          create: {
            args: Prisma.FinanceStudentProfileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>
          }
          createMany: {
            args: Prisma.FinanceStudentProfileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FinanceStudentProfileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>[]
          }
          delete: {
            args: Prisma.FinanceStudentProfileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>
          }
          update: {
            args: Prisma.FinanceStudentProfileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>
          }
          deleteMany: {
            args: Prisma.FinanceStudentProfileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FinanceStudentProfileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FinanceStudentProfileUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>[]
          }
          upsert: {
            args: Prisma.FinanceStudentProfileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceStudentProfilePayload>
          }
          aggregate: {
            args: Prisma.FinanceStudentProfileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFinanceStudentProfile>
          }
          groupBy: {
            args: Prisma.FinanceStudentProfileGroupByArgs<ExtArgs>
            result: $Utils.Optional<FinanceStudentProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.FinanceStudentProfileCountArgs<ExtArgs>
            result: $Utils.Optional<FinanceStudentProfileCountAggregateOutputType> | number
          }
        }
      }
      FinanceFeeStructure: {
        payload: Prisma.$FinanceFeeStructurePayload<ExtArgs>
        fields: Prisma.FinanceFeeStructureFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FinanceFeeStructureFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FinanceFeeStructureFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>
          }
          findFirst: {
            args: Prisma.FinanceFeeStructureFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FinanceFeeStructureFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>
          }
          findMany: {
            args: Prisma.FinanceFeeStructureFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>[]
          }
          create: {
            args: Prisma.FinanceFeeStructureCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>
          }
          createMany: {
            args: Prisma.FinanceFeeStructureCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FinanceFeeStructureCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>[]
          }
          delete: {
            args: Prisma.FinanceFeeStructureDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>
          }
          update: {
            args: Prisma.FinanceFeeStructureUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>
          }
          deleteMany: {
            args: Prisma.FinanceFeeStructureDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FinanceFeeStructureUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FinanceFeeStructureUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>[]
          }
          upsert: {
            args: Prisma.FinanceFeeStructureUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeStructurePayload>
          }
          aggregate: {
            args: Prisma.FinanceFeeStructureAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFinanceFeeStructure>
          }
          groupBy: {
            args: Prisma.FinanceFeeStructureGroupByArgs<ExtArgs>
            result: $Utils.Optional<FinanceFeeStructureGroupByOutputType>[]
          }
          count: {
            args: Prisma.FinanceFeeStructureCountArgs<ExtArgs>
            result: $Utils.Optional<FinanceFeeStructureCountAggregateOutputType> | number
          }
        }
      }
      FinanceFeeComponent: {
        payload: Prisma.$FinanceFeeComponentPayload<ExtArgs>
        fields: Prisma.FinanceFeeComponentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FinanceFeeComponentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FinanceFeeComponentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>
          }
          findFirst: {
            args: Prisma.FinanceFeeComponentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FinanceFeeComponentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>
          }
          findMany: {
            args: Prisma.FinanceFeeComponentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>[]
          }
          create: {
            args: Prisma.FinanceFeeComponentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>
          }
          createMany: {
            args: Prisma.FinanceFeeComponentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FinanceFeeComponentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>[]
          }
          delete: {
            args: Prisma.FinanceFeeComponentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>
          }
          update: {
            args: Prisma.FinanceFeeComponentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>
          }
          deleteMany: {
            args: Prisma.FinanceFeeComponentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FinanceFeeComponentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FinanceFeeComponentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>[]
          }
          upsert: {
            args: Prisma.FinanceFeeComponentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeComponentPayload>
          }
          aggregate: {
            args: Prisma.FinanceFeeComponentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFinanceFeeComponent>
          }
          groupBy: {
            args: Prisma.FinanceFeeComponentGroupByArgs<ExtArgs>
            result: $Utils.Optional<FinanceFeeComponentGroupByOutputType>[]
          }
          count: {
            args: Prisma.FinanceFeeComponentCountArgs<ExtArgs>
            result: $Utils.Optional<FinanceFeeComponentCountAggregateOutputType> | number
          }
        }
      }
      FinanceFeeApproval: {
        payload: Prisma.$FinanceFeeApprovalPayload<ExtArgs>
        fields: Prisma.FinanceFeeApprovalFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FinanceFeeApprovalFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FinanceFeeApprovalFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>
          }
          findFirst: {
            args: Prisma.FinanceFeeApprovalFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FinanceFeeApprovalFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>
          }
          findMany: {
            args: Prisma.FinanceFeeApprovalFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>[]
          }
          create: {
            args: Prisma.FinanceFeeApprovalCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>
          }
          createMany: {
            args: Prisma.FinanceFeeApprovalCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FinanceFeeApprovalCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>[]
          }
          delete: {
            args: Prisma.FinanceFeeApprovalDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>
          }
          update: {
            args: Prisma.FinanceFeeApprovalUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>
          }
          deleteMany: {
            args: Prisma.FinanceFeeApprovalDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FinanceFeeApprovalUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FinanceFeeApprovalUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>[]
          }
          upsert: {
            args: Prisma.FinanceFeeApprovalUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FinanceFeeApprovalPayload>
          }
          aggregate: {
            args: Prisma.FinanceFeeApprovalAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFinanceFeeApproval>
          }
          groupBy: {
            args: Prisma.FinanceFeeApprovalGroupByArgs<ExtArgs>
            result: $Utils.Optional<FinanceFeeApprovalGroupByOutputType>[]
          }
          count: {
            args: Prisma.FinanceFeeApprovalCountArgs<ExtArgs>
            result: $Utils.Optional<FinanceFeeApprovalCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    class?: ClassOmit
    student?: StudentOmit
    termLock?: TermLockOmit
    result?: ResultOmit
    reportMeta?: ReportMetaOmit
    auditLog?: AuditLogOmit
    financeStudentProfile?: FinanceStudentProfileOmit
    financeFeeStructure?: FinanceFeeStructureOmit
    financeFeeComponent?: FinanceFeeComponentOmit
    financeFeeApproval?: FinanceFeeApprovalOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    audits: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    audits?: boolean | UserCountOutputTypeCountAuditsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAuditsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
  }


  /**
   * Count Type ClassCountOutputType
   */

  export type ClassCountOutputType = {
    students: number
    termLocks: number
    feeStructures: number
  }

  export type ClassCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    students?: boolean | ClassCountOutputTypeCountStudentsArgs
    termLocks?: boolean | ClassCountOutputTypeCountTermLocksArgs
    feeStructures?: boolean | ClassCountOutputTypeCountFeeStructuresArgs
  }

  // Custom InputTypes
  /**
   * ClassCountOutputType without action
   */
  export type ClassCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ClassCountOutputType
     */
    select?: ClassCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ClassCountOutputType without action
   */
  export type ClassCountOutputTypeCountStudentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StudentWhereInput
  }

  /**
   * ClassCountOutputType without action
   */
  export type ClassCountOutputTypeCountTermLocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TermLockWhereInput
  }

  /**
   * ClassCountOutputType without action
   */
  export type ClassCountOutputTypeCountFeeStructuresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FinanceFeeStructureWhereInput
  }


  /**
   * Count Type StudentCountOutputType
   */

  export type StudentCountOutputType = {
    results: number
    reports: number
  }

  export type StudentCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    results?: boolean | StudentCountOutputTypeCountResultsArgs
    reports?: boolean | StudentCountOutputTypeCountReportsArgs
  }

  // Custom InputTypes
  /**
   * StudentCountOutputType without action
   */
  export type StudentCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentCountOutputType
     */
    select?: StudentCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * StudentCountOutputType without action
   */
  export type StudentCountOutputTypeCountResultsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ResultWhereInput
  }

  /**
   * StudentCountOutputType without action
   */
  export type StudentCountOutputTypeCountReportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportMetaWhereInput
  }


  /**
   * Count Type FinanceFeeStructureCountOutputType
   */

  export type FinanceFeeStructureCountOutputType = {
    components: number
    approvals: number
  }

  export type FinanceFeeStructureCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    components?: boolean | FinanceFeeStructureCountOutputTypeCountComponentsArgs
    approvals?: boolean | FinanceFeeStructureCountOutputTypeCountApprovalsArgs
  }

  // Custom InputTypes
  /**
   * FinanceFeeStructureCountOutputType without action
   */
  export type FinanceFeeStructureCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructureCountOutputType
     */
    select?: FinanceFeeStructureCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FinanceFeeStructureCountOutputType without action
   */
  export type FinanceFeeStructureCountOutputTypeCountComponentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FinanceFeeComponentWhereInput
  }

  /**
   * FinanceFeeStructureCountOutputType without action
   */
  export type FinanceFeeStructureCountOutputTypeCountApprovalsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FinanceFeeApprovalWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    password: string | null
    role: $Enums.Role | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    password: string | null
    role: $Enums.Role | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    name: number
    email: number
    password: number
    role: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    name: string
    email: string
    password: string
    role: $Enums.Role
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    audits?: boolean | User$auditsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "email" | "password" | "role" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    audits?: boolean | User$auditsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      audits: Prisma.$AuditLogPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      email: string
      password: string
      role: $Enums.Role
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    audits<T extends User$auditsArgs<ExtArgs> = {}>(args?: Subset<T, User$auditsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'Role'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.audits
   */
  export type User$auditsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    cursor?: AuditLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Class
   */

  export type AggregateClass = {
    _count: ClassCountAggregateOutputType | null
    _avg: ClassAvgAggregateOutputType | null
    _sum: ClassSumAggregateOutputType | null
    _min: ClassMinAggregateOutputType | null
    _max: ClassMaxAggregateOutputType | null
  }

  export type ClassAvgAggregateOutputType = {
    order: number | null
  }

  export type ClassSumAggregateOutputType = {
    order: number | null
  }

  export type ClassMinAggregateOutputType = {
    id: string | null
    name: string | null
    section: string | null
    order: number | null
    createdAt: Date | null
  }

  export type ClassMaxAggregateOutputType = {
    id: string | null
    name: string | null
    section: string | null
    order: number | null
    createdAt: Date | null
  }

  export type ClassCountAggregateOutputType = {
    id: number
    name: number
    section: number
    order: number
    createdAt: number
    _all: number
  }


  export type ClassAvgAggregateInputType = {
    order?: true
  }

  export type ClassSumAggregateInputType = {
    order?: true
  }

  export type ClassMinAggregateInputType = {
    id?: true
    name?: true
    section?: true
    order?: true
    createdAt?: true
  }

  export type ClassMaxAggregateInputType = {
    id?: true
    name?: true
    section?: true
    order?: true
    createdAt?: true
  }

  export type ClassCountAggregateInputType = {
    id?: true
    name?: true
    section?: true
    order?: true
    createdAt?: true
    _all?: true
  }

  export type ClassAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Class to aggregate.
     */
    where?: ClassWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Classes to fetch.
     */
    orderBy?: ClassOrderByWithRelationInput | ClassOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ClassWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Classes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Classes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Classes
    **/
    _count?: true | ClassCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ClassAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ClassSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ClassMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ClassMaxAggregateInputType
  }

  export type GetClassAggregateType<T extends ClassAggregateArgs> = {
        [P in keyof T & keyof AggregateClass]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateClass[P]>
      : GetScalarType<T[P], AggregateClass[P]>
  }




  export type ClassGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ClassWhereInput
    orderBy?: ClassOrderByWithAggregationInput | ClassOrderByWithAggregationInput[]
    by: ClassScalarFieldEnum[] | ClassScalarFieldEnum
    having?: ClassScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ClassCountAggregateInputType | true
    _avg?: ClassAvgAggregateInputType
    _sum?: ClassSumAggregateInputType
    _min?: ClassMinAggregateInputType
    _max?: ClassMaxAggregateInputType
  }

  export type ClassGroupByOutputType = {
    id: string
    name: string
    section: string
    order: number
    createdAt: Date
    _count: ClassCountAggregateOutputType | null
    _avg: ClassAvgAggregateOutputType | null
    _sum: ClassSumAggregateOutputType | null
    _min: ClassMinAggregateOutputType | null
    _max: ClassMaxAggregateOutputType | null
  }

  type GetClassGroupByPayload<T extends ClassGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ClassGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ClassGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ClassGroupByOutputType[P]>
            : GetScalarType<T[P], ClassGroupByOutputType[P]>
        }
      >
    >


  export type ClassSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    section?: boolean
    order?: boolean
    createdAt?: boolean
    students?: boolean | Class$studentsArgs<ExtArgs>
    termLocks?: boolean | Class$termLocksArgs<ExtArgs>
    feeStructures?: boolean | Class$feeStructuresArgs<ExtArgs>
    _count?: boolean | ClassCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["class"]>

  export type ClassSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    section?: boolean
    order?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["class"]>

  export type ClassSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    section?: boolean
    order?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["class"]>

  export type ClassSelectScalar = {
    id?: boolean
    name?: boolean
    section?: boolean
    order?: boolean
    createdAt?: boolean
  }

  export type ClassOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "section" | "order" | "createdAt", ExtArgs["result"]["class"]>
  export type ClassInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    students?: boolean | Class$studentsArgs<ExtArgs>
    termLocks?: boolean | Class$termLocksArgs<ExtArgs>
    feeStructures?: boolean | Class$feeStructuresArgs<ExtArgs>
    _count?: boolean | ClassCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ClassIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type ClassIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ClassPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Class"
    objects: {
      students: Prisma.$StudentPayload<ExtArgs>[]
      termLocks: Prisma.$TermLockPayload<ExtArgs>[]
      feeStructures: Prisma.$FinanceFeeStructurePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      section: string
      order: number
      createdAt: Date
    }, ExtArgs["result"]["class"]>
    composites: {}
  }

  type ClassGetPayload<S extends boolean | null | undefined | ClassDefaultArgs> = $Result.GetResult<Prisma.$ClassPayload, S>

  type ClassCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ClassFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ClassCountAggregateInputType | true
    }

  export interface ClassDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Class'], meta: { name: 'Class' } }
    /**
     * Find zero or one Class that matches the filter.
     * @param {ClassFindUniqueArgs} args - Arguments to find a Class
     * @example
     * // Get one Class
     * const class = await prisma.class.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ClassFindUniqueArgs>(args: SelectSubset<T, ClassFindUniqueArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Class that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ClassFindUniqueOrThrowArgs} args - Arguments to find a Class
     * @example
     * // Get one Class
     * const class = await prisma.class.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ClassFindUniqueOrThrowArgs>(args: SelectSubset<T, ClassFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Class that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClassFindFirstArgs} args - Arguments to find a Class
     * @example
     * // Get one Class
     * const class = await prisma.class.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ClassFindFirstArgs>(args?: SelectSubset<T, ClassFindFirstArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Class that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClassFindFirstOrThrowArgs} args - Arguments to find a Class
     * @example
     * // Get one Class
     * const class = await prisma.class.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ClassFindFirstOrThrowArgs>(args?: SelectSubset<T, ClassFindFirstOrThrowArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Classes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClassFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Classes
     * const classes = await prisma.class.findMany()
     * 
     * // Get first 10 Classes
     * const classes = await prisma.class.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const classWithIdOnly = await prisma.class.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ClassFindManyArgs>(args?: SelectSubset<T, ClassFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Class.
     * @param {ClassCreateArgs} args - Arguments to create a Class.
     * @example
     * // Create one Class
     * const Class = await prisma.class.create({
     *   data: {
     *     // ... data to create a Class
     *   }
     * })
     * 
     */
    create<T extends ClassCreateArgs>(args: SelectSubset<T, ClassCreateArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Classes.
     * @param {ClassCreateManyArgs} args - Arguments to create many Classes.
     * @example
     * // Create many Classes
     * const class = await prisma.class.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ClassCreateManyArgs>(args?: SelectSubset<T, ClassCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Classes and returns the data saved in the database.
     * @param {ClassCreateManyAndReturnArgs} args - Arguments to create many Classes.
     * @example
     * // Create many Classes
     * const class = await prisma.class.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Classes and only return the `id`
     * const classWithIdOnly = await prisma.class.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ClassCreateManyAndReturnArgs>(args?: SelectSubset<T, ClassCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Class.
     * @param {ClassDeleteArgs} args - Arguments to delete one Class.
     * @example
     * // Delete one Class
     * const Class = await prisma.class.delete({
     *   where: {
     *     // ... filter to delete one Class
     *   }
     * })
     * 
     */
    delete<T extends ClassDeleteArgs>(args: SelectSubset<T, ClassDeleteArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Class.
     * @param {ClassUpdateArgs} args - Arguments to update one Class.
     * @example
     * // Update one Class
     * const class = await prisma.class.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ClassUpdateArgs>(args: SelectSubset<T, ClassUpdateArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Classes.
     * @param {ClassDeleteManyArgs} args - Arguments to filter Classes to delete.
     * @example
     * // Delete a few Classes
     * const { count } = await prisma.class.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ClassDeleteManyArgs>(args?: SelectSubset<T, ClassDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Classes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClassUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Classes
     * const class = await prisma.class.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ClassUpdateManyArgs>(args: SelectSubset<T, ClassUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Classes and returns the data updated in the database.
     * @param {ClassUpdateManyAndReturnArgs} args - Arguments to update many Classes.
     * @example
     * // Update many Classes
     * const class = await prisma.class.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Classes and only return the `id`
     * const classWithIdOnly = await prisma.class.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ClassUpdateManyAndReturnArgs>(args: SelectSubset<T, ClassUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Class.
     * @param {ClassUpsertArgs} args - Arguments to update or create a Class.
     * @example
     * // Update or create a Class
     * const class = await prisma.class.upsert({
     *   create: {
     *     // ... data to create a Class
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Class we want to update
     *   }
     * })
     */
    upsert<T extends ClassUpsertArgs>(args: SelectSubset<T, ClassUpsertArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Classes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClassCountArgs} args - Arguments to filter Classes to count.
     * @example
     * // Count the number of Classes
     * const count = await prisma.class.count({
     *   where: {
     *     // ... the filter for the Classes we want to count
     *   }
     * })
    **/
    count<T extends ClassCountArgs>(
      args?: Subset<T, ClassCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ClassCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Class.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClassAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ClassAggregateArgs>(args: Subset<T, ClassAggregateArgs>): Prisma.PrismaPromise<GetClassAggregateType<T>>

    /**
     * Group by Class.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClassGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ClassGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ClassGroupByArgs['orderBy'] }
        : { orderBy?: ClassGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ClassGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetClassGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Class model
   */
  readonly fields: ClassFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Class.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ClassClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    students<T extends Class$studentsArgs<ExtArgs> = {}>(args?: Subset<T, Class$studentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    termLocks<T extends Class$termLocksArgs<ExtArgs> = {}>(args?: Subset<T, Class$termLocksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    feeStructures<T extends Class$feeStructuresArgs<ExtArgs> = {}>(args?: Subset<T, Class$feeStructuresArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Class model
   */
  interface ClassFieldRefs {
    readonly id: FieldRef<"Class", 'String'>
    readonly name: FieldRef<"Class", 'String'>
    readonly section: FieldRef<"Class", 'String'>
    readonly order: FieldRef<"Class", 'Int'>
    readonly createdAt: FieldRef<"Class", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Class findUnique
   */
  export type ClassFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * Filter, which Class to fetch.
     */
    where: ClassWhereUniqueInput
  }

  /**
   * Class findUniqueOrThrow
   */
  export type ClassFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * Filter, which Class to fetch.
     */
    where: ClassWhereUniqueInput
  }

  /**
   * Class findFirst
   */
  export type ClassFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * Filter, which Class to fetch.
     */
    where?: ClassWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Classes to fetch.
     */
    orderBy?: ClassOrderByWithRelationInput | ClassOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Classes.
     */
    cursor?: ClassWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Classes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Classes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Classes.
     */
    distinct?: ClassScalarFieldEnum | ClassScalarFieldEnum[]
  }

  /**
   * Class findFirstOrThrow
   */
  export type ClassFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * Filter, which Class to fetch.
     */
    where?: ClassWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Classes to fetch.
     */
    orderBy?: ClassOrderByWithRelationInput | ClassOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Classes.
     */
    cursor?: ClassWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Classes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Classes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Classes.
     */
    distinct?: ClassScalarFieldEnum | ClassScalarFieldEnum[]
  }

  /**
   * Class findMany
   */
  export type ClassFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * Filter, which Classes to fetch.
     */
    where?: ClassWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Classes to fetch.
     */
    orderBy?: ClassOrderByWithRelationInput | ClassOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Classes.
     */
    cursor?: ClassWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Classes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Classes.
     */
    skip?: number
    distinct?: ClassScalarFieldEnum | ClassScalarFieldEnum[]
  }

  /**
   * Class create
   */
  export type ClassCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * The data needed to create a Class.
     */
    data: XOR<ClassCreateInput, ClassUncheckedCreateInput>
  }

  /**
   * Class createMany
   */
  export type ClassCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Classes.
     */
    data: ClassCreateManyInput | ClassCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Class createManyAndReturn
   */
  export type ClassCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * The data used to create many Classes.
     */
    data: ClassCreateManyInput | ClassCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Class update
   */
  export type ClassUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * The data needed to update a Class.
     */
    data: XOR<ClassUpdateInput, ClassUncheckedUpdateInput>
    /**
     * Choose, which Class to update.
     */
    where: ClassWhereUniqueInput
  }

  /**
   * Class updateMany
   */
  export type ClassUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Classes.
     */
    data: XOR<ClassUpdateManyMutationInput, ClassUncheckedUpdateManyInput>
    /**
     * Filter which Classes to update
     */
    where?: ClassWhereInput
    /**
     * Limit how many Classes to update.
     */
    limit?: number
  }

  /**
   * Class updateManyAndReturn
   */
  export type ClassUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * The data used to update Classes.
     */
    data: XOR<ClassUpdateManyMutationInput, ClassUncheckedUpdateManyInput>
    /**
     * Filter which Classes to update
     */
    where?: ClassWhereInput
    /**
     * Limit how many Classes to update.
     */
    limit?: number
  }

  /**
   * Class upsert
   */
  export type ClassUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * The filter to search for the Class to update in case it exists.
     */
    where: ClassWhereUniqueInput
    /**
     * In case the Class found by the `where` argument doesn't exist, create a new Class with this data.
     */
    create: XOR<ClassCreateInput, ClassUncheckedCreateInput>
    /**
     * In case the Class was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ClassUpdateInput, ClassUncheckedUpdateInput>
  }

  /**
   * Class delete
   */
  export type ClassDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
    /**
     * Filter which Class to delete.
     */
    where: ClassWhereUniqueInput
  }

  /**
   * Class deleteMany
   */
  export type ClassDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Classes to delete
     */
    where?: ClassWhereInput
    /**
     * Limit how many Classes to delete.
     */
    limit?: number
  }

  /**
   * Class.students
   */
  export type Class$studentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    where?: StudentWhereInput
    orderBy?: StudentOrderByWithRelationInput | StudentOrderByWithRelationInput[]
    cursor?: StudentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: StudentScalarFieldEnum | StudentScalarFieldEnum[]
  }

  /**
   * Class.termLocks
   */
  export type Class$termLocksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    where?: TermLockWhereInput
    orderBy?: TermLockOrderByWithRelationInput | TermLockOrderByWithRelationInput[]
    cursor?: TermLockWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TermLockScalarFieldEnum | TermLockScalarFieldEnum[]
  }

  /**
   * Class.feeStructures
   */
  export type Class$feeStructuresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    where?: FinanceFeeStructureWhereInput
    orderBy?: FinanceFeeStructureOrderByWithRelationInput | FinanceFeeStructureOrderByWithRelationInput[]
    cursor?: FinanceFeeStructureWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FinanceFeeStructureScalarFieldEnum | FinanceFeeStructureScalarFieldEnum[]
  }

  /**
   * Class without action
   */
  export type ClassDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Class
     */
    select?: ClassSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Class
     */
    omit?: ClassOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClassInclude<ExtArgs> | null
  }


  /**
   * Model Student
   */

  export type AggregateStudent = {
    _count: StudentCountAggregateOutputType | null
    _min: StudentMinAggregateOutputType | null
    _max: StudentMaxAggregateOutputType | null
  }

  export type StudentMinAggregateOutputType = {
    id: string | null
    name: string | null
    classId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type StudentMaxAggregateOutputType = {
    id: string | null
    name: string | null
    classId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type StudentCountAggregateOutputType = {
    id: number
    name: number
    classId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type StudentMinAggregateInputType = {
    id?: true
    name?: true
    classId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type StudentMaxAggregateInputType = {
    id?: true
    name?: true
    classId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type StudentCountAggregateInputType = {
    id?: true
    name?: true
    classId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type StudentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Student to aggregate.
     */
    where?: StudentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Students to fetch.
     */
    orderBy?: StudentOrderByWithRelationInput | StudentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: StudentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Students from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Students.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Students
    **/
    _count?: true | StudentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: StudentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: StudentMaxAggregateInputType
  }

  export type GetStudentAggregateType<T extends StudentAggregateArgs> = {
        [P in keyof T & keyof AggregateStudent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateStudent[P]>
      : GetScalarType<T[P], AggregateStudent[P]>
  }




  export type StudentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StudentWhereInput
    orderBy?: StudentOrderByWithAggregationInput | StudentOrderByWithAggregationInput[]
    by: StudentScalarFieldEnum[] | StudentScalarFieldEnum
    having?: StudentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: StudentCountAggregateInputType | true
    _min?: StudentMinAggregateInputType
    _max?: StudentMaxAggregateInputType
  }

  export type StudentGroupByOutputType = {
    id: string
    name: string
    classId: string
    createdAt: Date
    updatedAt: Date
    _count: StudentCountAggregateOutputType | null
    _min: StudentMinAggregateOutputType | null
    _max: StudentMaxAggregateOutputType | null
  }

  type GetStudentGroupByPayload<T extends StudentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<StudentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof StudentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], StudentGroupByOutputType[P]>
            : GetScalarType<T[P], StudentGroupByOutputType[P]>
        }
      >
    >


  export type StudentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    classId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
    results?: boolean | Student$resultsArgs<ExtArgs>
    reports?: boolean | Student$reportsArgs<ExtArgs>
    financeProfile?: boolean | Student$financeProfileArgs<ExtArgs>
    _count?: boolean | StudentCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["student"]>

  export type StudentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    classId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["student"]>

  export type StudentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    classId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["student"]>

  export type StudentSelectScalar = {
    id?: boolean
    name?: boolean
    classId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type StudentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "classId" | "createdAt" | "updatedAt", ExtArgs["result"]["student"]>
  export type StudentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
    results?: boolean | Student$resultsArgs<ExtArgs>
    reports?: boolean | Student$reportsArgs<ExtArgs>
    financeProfile?: boolean | Student$financeProfileArgs<ExtArgs>
    _count?: boolean | StudentCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type StudentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }
  export type StudentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }

  export type $StudentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Student"
    objects: {
      class: Prisma.$ClassPayload<ExtArgs>
      results: Prisma.$ResultPayload<ExtArgs>[]
      reports: Prisma.$ReportMetaPayload<ExtArgs>[]
      financeProfile: Prisma.$FinanceStudentProfilePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      classId: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["student"]>
    composites: {}
  }

  type StudentGetPayload<S extends boolean | null | undefined | StudentDefaultArgs> = $Result.GetResult<Prisma.$StudentPayload, S>

  type StudentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<StudentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: StudentCountAggregateInputType | true
    }

  export interface StudentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Student'], meta: { name: 'Student' } }
    /**
     * Find zero or one Student that matches the filter.
     * @param {StudentFindUniqueArgs} args - Arguments to find a Student
     * @example
     * // Get one Student
     * const student = await prisma.student.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends StudentFindUniqueArgs>(args: SelectSubset<T, StudentFindUniqueArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Student that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {StudentFindUniqueOrThrowArgs} args - Arguments to find a Student
     * @example
     * // Get one Student
     * const student = await prisma.student.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends StudentFindUniqueOrThrowArgs>(args: SelectSubset<T, StudentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Student that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentFindFirstArgs} args - Arguments to find a Student
     * @example
     * // Get one Student
     * const student = await prisma.student.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends StudentFindFirstArgs>(args?: SelectSubset<T, StudentFindFirstArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Student that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentFindFirstOrThrowArgs} args - Arguments to find a Student
     * @example
     * // Get one Student
     * const student = await prisma.student.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends StudentFindFirstOrThrowArgs>(args?: SelectSubset<T, StudentFindFirstOrThrowArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Students that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Students
     * const students = await prisma.student.findMany()
     * 
     * // Get first 10 Students
     * const students = await prisma.student.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const studentWithIdOnly = await prisma.student.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends StudentFindManyArgs>(args?: SelectSubset<T, StudentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Student.
     * @param {StudentCreateArgs} args - Arguments to create a Student.
     * @example
     * // Create one Student
     * const Student = await prisma.student.create({
     *   data: {
     *     // ... data to create a Student
     *   }
     * })
     * 
     */
    create<T extends StudentCreateArgs>(args: SelectSubset<T, StudentCreateArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Students.
     * @param {StudentCreateManyArgs} args - Arguments to create many Students.
     * @example
     * // Create many Students
     * const student = await prisma.student.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends StudentCreateManyArgs>(args?: SelectSubset<T, StudentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Students and returns the data saved in the database.
     * @param {StudentCreateManyAndReturnArgs} args - Arguments to create many Students.
     * @example
     * // Create many Students
     * const student = await prisma.student.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Students and only return the `id`
     * const studentWithIdOnly = await prisma.student.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends StudentCreateManyAndReturnArgs>(args?: SelectSubset<T, StudentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Student.
     * @param {StudentDeleteArgs} args - Arguments to delete one Student.
     * @example
     * // Delete one Student
     * const Student = await prisma.student.delete({
     *   where: {
     *     // ... filter to delete one Student
     *   }
     * })
     * 
     */
    delete<T extends StudentDeleteArgs>(args: SelectSubset<T, StudentDeleteArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Student.
     * @param {StudentUpdateArgs} args - Arguments to update one Student.
     * @example
     * // Update one Student
     * const student = await prisma.student.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends StudentUpdateArgs>(args: SelectSubset<T, StudentUpdateArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Students.
     * @param {StudentDeleteManyArgs} args - Arguments to filter Students to delete.
     * @example
     * // Delete a few Students
     * const { count } = await prisma.student.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends StudentDeleteManyArgs>(args?: SelectSubset<T, StudentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Students.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Students
     * const student = await prisma.student.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends StudentUpdateManyArgs>(args: SelectSubset<T, StudentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Students and returns the data updated in the database.
     * @param {StudentUpdateManyAndReturnArgs} args - Arguments to update many Students.
     * @example
     * // Update many Students
     * const student = await prisma.student.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Students and only return the `id`
     * const studentWithIdOnly = await prisma.student.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends StudentUpdateManyAndReturnArgs>(args: SelectSubset<T, StudentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Student.
     * @param {StudentUpsertArgs} args - Arguments to update or create a Student.
     * @example
     * // Update or create a Student
     * const student = await prisma.student.upsert({
     *   create: {
     *     // ... data to create a Student
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Student we want to update
     *   }
     * })
     */
    upsert<T extends StudentUpsertArgs>(args: SelectSubset<T, StudentUpsertArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Students.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentCountArgs} args - Arguments to filter Students to count.
     * @example
     * // Count the number of Students
     * const count = await prisma.student.count({
     *   where: {
     *     // ... the filter for the Students we want to count
     *   }
     * })
    **/
    count<T extends StudentCountArgs>(
      args?: Subset<T, StudentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], StudentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Student.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends StudentAggregateArgs>(args: Subset<T, StudentAggregateArgs>): Prisma.PrismaPromise<GetStudentAggregateType<T>>

    /**
     * Group by Student.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends StudentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: StudentGroupByArgs['orderBy'] }
        : { orderBy?: StudentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, StudentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetStudentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Student model
   */
  readonly fields: StudentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Student.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__StudentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    class<T extends ClassDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ClassDefaultArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    results<T extends Student$resultsArgs<ExtArgs> = {}>(args?: Subset<T, Student$resultsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    reports<T extends Student$reportsArgs<ExtArgs> = {}>(args?: Subset<T, Student$reportsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    financeProfile<T extends Student$financeProfileArgs<ExtArgs> = {}>(args?: Subset<T, Student$financeProfileArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Student model
   */
  interface StudentFieldRefs {
    readonly id: FieldRef<"Student", 'String'>
    readonly name: FieldRef<"Student", 'String'>
    readonly classId: FieldRef<"Student", 'String'>
    readonly createdAt: FieldRef<"Student", 'DateTime'>
    readonly updatedAt: FieldRef<"Student", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Student findUnique
   */
  export type StudentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * Filter, which Student to fetch.
     */
    where: StudentWhereUniqueInput
  }

  /**
   * Student findUniqueOrThrow
   */
  export type StudentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * Filter, which Student to fetch.
     */
    where: StudentWhereUniqueInput
  }

  /**
   * Student findFirst
   */
  export type StudentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * Filter, which Student to fetch.
     */
    where?: StudentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Students to fetch.
     */
    orderBy?: StudentOrderByWithRelationInput | StudentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Students.
     */
    cursor?: StudentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Students from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Students.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Students.
     */
    distinct?: StudentScalarFieldEnum | StudentScalarFieldEnum[]
  }

  /**
   * Student findFirstOrThrow
   */
  export type StudentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * Filter, which Student to fetch.
     */
    where?: StudentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Students to fetch.
     */
    orderBy?: StudentOrderByWithRelationInput | StudentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Students.
     */
    cursor?: StudentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Students from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Students.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Students.
     */
    distinct?: StudentScalarFieldEnum | StudentScalarFieldEnum[]
  }

  /**
   * Student findMany
   */
  export type StudentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * Filter, which Students to fetch.
     */
    where?: StudentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Students to fetch.
     */
    orderBy?: StudentOrderByWithRelationInput | StudentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Students.
     */
    cursor?: StudentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Students from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Students.
     */
    skip?: number
    distinct?: StudentScalarFieldEnum | StudentScalarFieldEnum[]
  }

  /**
   * Student create
   */
  export type StudentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * The data needed to create a Student.
     */
    data: XOR<StudentCreateInput, StudentUncheckedCreateInput>
  }

  /**
   * Student createMany
   */
  export type StudentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Students.
     */
    data: StudentCreateManyInput | StudentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Student createManyAndReturn
   */
  export type StudentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * The data used to create many Students.
     */
    data: StudentCreateManyInput | StudentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Student update
   */
  export type StudentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * The data needed to update a Student.
     */
    data: XOR<StudentUpdateInput, StudentUncheckedUpdateInput>
    /**
     * Choose, which Student to update.
     */
    where: StudentWhereUniqueInput
  }

  /**
   * Student updateMany
   */
  export type StudentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Students.
     */
    data: XOR<StudentUpdateManyMutationInput, StudentUncheckedUpdateManyInput>
    /**
     * Filter which Students to update
     */
    where?: StudentWhereInput
    /**
     * Limit how many Students to update.
     */
    limit?: number
  }

  /**
   * Student updateManyAndReturn
   */
  export type StudentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * The data used to update Students.
     */
    data: XOR<StudentUpdateManyMutationInput, StudentUncheckedUpdateManyInput>
    /**
     * Filter which Students to update
     */
    where?: StudentWhereInput
    /**
     * Limit how many Students to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Student upsert
   */
  export type StudentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * The filter to search for the Student to update in case it exists.
     */
    where: StudentWhereUniqueInput
    /**
     * In case the Student found by the `where` argument doesn't exist, create a new Student with this data.
     */
    create: XOR<StudentCreateInput, StudentUncheckedCreateInput>
    /**
     * In case the Student was found with the provided `where` argument, update it with this data.
     */
    update: XOR<StudentUpdateInput, StudentUncheckedUpdateInput>
  }

  /**
   * Student delete
   */
  export type StudentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
    /**
     * Filter which Student to delete.
     */
    where: StudentWhereUniqueInput
  }

  /**
   * Student deleteMany
   */
  export type StudentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Students to delete
     */
    where?: StudentWhereInput
    /**
     * Limit how many Students to delete.
     */
    limit?: number
  }

  /**
   * Student.results
   */
  export type Student$resultsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    where?: ResultWhereInput
    orderBy?: ResultOrderByWithRelationInput | ResultOrderByWithRelationInput[]
    cursor?: ResultWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ResultScalarFieldEnum | ResultScalarFieldEnum[]
  }

  /**
   * Student.reports
   */
  export type Student$reportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    where?: ReportMetaWhereInput
    orderBy?: ReportMetaOrderByWithRelationInput | ReportMetaOrderByWithRelationInput[]
    cursor?: ReportMetaWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ReportMetaScalarFieldEnum | ReportMetaScalarFieldEnum[]
  }

  /**
   * Student.financeProfile
   */
  export type Student$financeProfileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    where?: FinanceStudentProfileWhereInput
  }

  /**
   * Student without action
   */
  export type StudentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Student
     */
    select?: StudentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Student
     */
    omit?: StudentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentInclude<ExtArgs> | null
  }


  /**
   * Model TermLock
   */

  export type AggregateTermLock = {
    _count: TermLockCountAggregateOutputType | null
    _min: TermLockMinAggregateOutputType | null
    _max: TermLockMaxAggregateOutputType | null
  }

  export type TermLockMinAggregateOutputType = {
    id: string | null
    classId: string | null
    session: string | null
    term: string | null
    status: $Enums.TermStatus | null
    lockedBy: string | null
    lockedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TermLockMaxAggregateOutputType = {
    id: string | null
    classId: string | null
    session: string | null
    term: string | null
    status: $Enums.TermStatus | null
    lockedBy: string | null
    lockedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TermLockCountAggregateOutputType = {
    id: number
    classId: number
    session: number
    term: number
    status: number
    lockedBy: number
    lockedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TermLockMinAggregateInputType = {
    id?: true
    classId?: true
    session?: true
    term?: true
    status?: true
    lockedBy?: true
    lockedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TermLockMaxAggregateInputType = {
    id?: true
    classId?: true
    session?: true
    term?: true
    status?: true
    lockedBy?: true
    lockedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TermLockCountAggregateInputType = {
    id?: true
    classId?: true
    session?: true
    term?: true
    status?: true
    lockedBy?: true
    lockedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TermLockAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TermLock to aggregate.
     */
    where?: TermLockWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TermLocks to fetch.
     */
    orderBy?: TermLockOrderByWithRelationInput | TermLockOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TermLockWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TermLocks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TermLocks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TermLocks
    **/
    _count?: true | TermLockCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TermLockMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TermLockMaxAggregateInputType
  }

  export type GetTermLockAggregateType<T extends TermLockAggregateArgs> = {
        [P in keyof T & keyof AggregateTermLock]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTermLock[P]>
      : GetScalarType<T[P], AggregateTermLock[P]>
  }




  export type TermLockGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TermLockWhereInput
    orderBy?: TermLockOrderByWithAggregationInput | TermLockOrderByWithAggregationInput[]
    by: TermLockScalarFieldEnum[] | TermLockScalarFieldEnum
    having?: TermLockScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TermLockCountAggregateInputType | true
    _min?: TermLockMinAggregateInputType
    _max?: TermLockMaxAggregateInputType
  }

  export type TermLockGroupByOutputType = {
    id: string
    classId: string
    session: string
    term: string
    status: $Enums.TermStatus
    lockedBy: string | null
    lockedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: TermLockCountAggregateOutputType | null
    _min: TermLockMinAggregateOutputType | null
    _max: TermLockMaxAggregateOutputType | null
  }

  type GetTermLockGroupByPayload<T extends TermLockGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TermLockGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TermLockGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TermLockGroupByOutputType[P]>
            : GetScalarType<T[P], TermLockGroupByOutputType[P]>
        }
      >
    >


  export type TermLockSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    classId?: boolean
    session?: boolean
    term?: boolean
    status?: boolean
    lockedBy?: boolean
    lockedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["termLock"]>

  export type TermLockSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    classId?: boolean
    session?: boolean
    term?: boolean
    status?: boolean
    lockedBy?: boolean
    lockedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["termLock"]>

  export type TermLockSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    classId?: boolean
    session?: boolean
    term?: boolean
    status?: boolean
    lockedBy?: boolean
    lockedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["termLock"]>

  export type TermLockSelectScalar = {
    id?: boolean
    classId?: boolean
    session?: boolean
    term?: boolean
    status?: boolean
    lockedBy?: boolean
    lockedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TermLockOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "classId" | "session" | "term" | "status" | "lockedBy" | "lockedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["termLock"]>
  export type TermLockInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }
  export type TermLockIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }
  export type TermLockIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }

  export type $TermLockPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TermLock"
    objects: {
      class: Prisma.$ClassPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      classId: string
      session: string
      term: string
      status: $Enums.TermStatus
      lockedBy: string | null
      lockedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["termLock"]>
    composites: {}
  }

  type TermLockGetPayload<S extends boolean | null | undefined | TermLockDefaultArgs> = $Result.GetResult<Prisma.$TermLockPayload, S>

  type TermLockCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TermLockFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TermLockCountAggregateInputType | true
    }

  export interface TermLockDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TermLock'], meta: { name: 'TermLock' } }
    /**
     * Find zero or one TermLock that matches the filter.
     * @param {TermLockFindUniqueArgs} args - Arguments to find a TermLock
     * @example
     * // Get one TermLock
     * const termLock = await prisma.termLock.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TermLockFindUniqueArgs>(args: SelectSubset<T, TermLockFindUniqueArgs<ExtArgs>>): Prisma__TermLockClient<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TermLock that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TermLockFindUniqueOrThrowArgs} args - Arguments to find a TermLock
     * @example
     * // Get one TermLock
     * const termLock = await prisma.termLock.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TermLockFindUniqueOrThrowArgs>(args: SelectSubset<T, TermLockFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TermLockClient<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TermLock that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TermLockFindFirstArgs} args - Arguments to find a TermLock
     * @example
     * // Get one TermLock
     * const termLock = await prisma.termLock.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TermLockFindFirstArgs>(args?: SelectSubset<T, TermLockFindFirstArgs<ExtArgs>>): Prisma__TermLockClient<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TermLock that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TermLockFindFirstOrThrowArgs} args - Arguments to find a TermLock
     * @example
     * // Get one TermLock
     * const termLock = await prisma.termLock.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TermLockFindFirstOrThrowArgs>(args?: SelectSubset<T, TermLockFindFirstOrThrowArgs<ExtArgs>>): Prisma__TermLockClient<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TermLocks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TermLockFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TermLocks
     * const termLocks = await prisma.termLock.findMany()
     * 
     * // Get first 10 TermLocks
     * const termLocks = await prisma.termLock.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const termLockWithIdOnly = await prisma.termLock.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TermLockFindManyArgs>(args?: SelectSubset<T, TermLockFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TermLock.
     * @param {TermLockCreateArgs} args - Arguments to create a TermLock.
     * @example
     * // Create one TermLock
     * const TermLock = await prisma.termLock.create({
     *   data: {
     *     // ... data to create a TermLock
     *   }
     * })
     * 
     */
    create<T extends TermLockCreateArgs>(args: SelectSubset<T, TermLockCreateArgs<ExtArgs>>): Prisma__TermLockClient<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TermLocks.
     * @param {TermLockCreateManyArgs} args - Arguments to create many TermLocks.
     * @example
     * // Create many TermLocks
     * const termLock = await prisma.termLock.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TermLockCreateManyArgs>(args?: SelectSubset<T, TermLockCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TermLocks and returns the data saved in the database.
     * @param {TermLockCreateManyAndReturnArgs} args - Arguments to create many TermLocks.
     * @example
     * // Create many TermLocks
     * const termLock = await prisma.termLock.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TermLocks and only return the `id`
     * const termLockWithIdOnly = await prisma.termLock.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TermLockCreateManyAndReturnArgs>(args?: SelectSubset<T, TermLockCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TermLock.
     * @param {TermLockDeleteArgs} args - Arguments to delete one TermLock.
     * @example
     * // Delete one TermLock
     * const TermLock = await prisma.termLock.delete({
     *   where: {
     *     // ... filter to delete one TermLock
     *   }
     * })
     * 
     */
    delete<T extends TermLockDeleteArgs>(args: SelectSubset<T, TermLockDeleteArgs<ExtArgs>>): Prisma__TermLockClient<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TermLock.
     * @param {TermLockUpdateArgs} args - Arguments to update one TermLock.
     * @example
     * // Update one TermLock
     * const termLock = await prisma.termLock.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TermLockUpdateArgs>(args: SelectSubset<T, TermLockUpdateArgs<ExtArgs>>): Prisma__TermLockClient<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TermLocks.
     * @param {TermLockDeleteManyArgs} args - Arguments to filter TermLocks to delete.
     * @example
     * // Delete a few TermLocks
     * const { count } = await prisma.termLock.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TermLockDeleteManyArgs>(args?: SelectSubset<T, TermLockDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TermLocks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TermLockUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TermLocks
     * const termLock = await prisma.termLock.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TermLockUpdateManyArgs>(args: SelectSubset<T, TermLockUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TermLocks and returns the data updated in the database.
     * @param {TermLockUpdateManyAndReturnArgs} args - Arguments to update many TermLocks.
     * @example
     * // Update many TermLocks
     * const termLock = await prisma.termLock.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TermLocks and only return the `id`
     * const termLockWithIdOnly = await prisma.termLock.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TermLockUpdateManyAndReturnArgs>(args: SelectSubset<T, TermLockUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TermLock.
     * @param {TermLockUpsertArgs} args - Arguments to update or create a TermLock.
     * @example
     * // Update or create a TermLock
     * const termLock = await prisma.termLock.upsert({
     *   create: {
     *     // ... data to create a TermLock
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TermLock we want to update
     *   }
     * })
     */
    upsert<T extends TermLockUpsertArgs>(args: SelectSubset<T, TermLockUpsertArgs<ExtArgs>>): Prisma__TermLockClient<$Result.GetResult<Prisma.$TermLockPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TermLocks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TermLockCountArgs} args - Arguments to filter TermLocks to count.
     * @example
     * // Count the number of TermLocks
     * const count = await prisma.termLock.count({
     *   where: {
     *     // ... the filter for the TermLocks we want to count
     *   }
     * })
    **/
    count<T extends TermLockCountArgs>(
      args?: Subset<T, TermLockCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TermLockCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TermLock.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TermLockAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TermLockAggregateArgs>(args: Subset<T, TermLockAggregateArgs>): Prisma.PrismaPromise<GetTermLockAggregateType<T>>

    /**
     * Group by TermLock.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TermLockGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TermLockGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TermLockGroupByArgs['orderBy'] }
        : { orderBy?: TermLockGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TermLockGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTermLockGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TermLock model
   */
  readonly fields: TermLockFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TermLock.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TermLockClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    class<T extends ClassDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ClassDefaultArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TermLock model
   */
  interface TermLockFieldRefs {
    readonly id: FieldRef<"TermLock", 'String'>
    readonly classId: FieldRef<"TermLock", 'String'>
    readonly session: FieldRef<"TermLock", 'String'>
    readonly term: FieldRef<"TermLock", 'String'>
    readonly status: FieldRef<"TermLock", 'TermStatus'>
    readonly lockedBy: FieldRef<"TermLock", 'String'>
    readonly lockedAt: FieldRef<"TermLock", 'DateTime'>
    readonly createdAt: FieldRef<"TermLock", 'DateTime'>
    readonly updatedAt: FieldRef<"TermLock", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TermLock findUnique
   */
  export type TermLockFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * Filter, which TermLock to fetch.
     */
    where: TermLockWhereUniqueInput
  }

  /**
   * TermLock findUniqueOrThrow
   */
  export type TermLockFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * Filter, which TermLock to fetch.
     */
    where: TermLockWhereUniqueInput
  }

  /**
   * TermLock findFirst
   */
  export type TermLockFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * Filter, which TermLock to fetch.
     */
    where?: TermLockWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TermLocks to fetch.
     */
    orderBy?: TermLockOrderByWithRelationInput | TermLockOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TermLocks.
     */
    cursor?: TermLockWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TermLocks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TermLocks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TermLocks.
     */
    distinct?: TermLockScalarFieldEnum | TermLockScalarFieldEnum[]
  }

  /**
   * TermLock findFirstOrThrow
   */
  export type TermLockFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * Filter, which TermLock to fetch.
     */
    where?: TermLockWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TermLocks to fetch.
     */
    orderBy?: TermLockOrderByWithRelationInput | TermLockOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TermLocks.
     */
    cursor?: TermLockWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TermLocks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TermLocks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TermLocks.
     */
    distinct?: TermLockScalarFieldEnum | TermLockScalarFieldEnum[]
  }

  /**
   * TermLock findMany
   */
  export type TermLockFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * Filter, which TermLocks to fetch.
     */
    where?: TermLockWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TermLocks to fetch.
     */
    orderBy?: TermLockOrderByWithRelationInput | TermLockOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TermLocks.
     */
    cursor?: TermLockWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TermLocks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TermLocks.
     */
    skip?: number
    distinct?: TermLockScalarFieldEnum | TermLockScalarFieldEnum[]
  }

  /**
   * TermLock create
   */
  export type TermLockCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * The data needed to create a TermLock.
     */
    data: XOR<TermLockCreateInput, TermLockUncheckedCreateInput>
  }

  /**
   * TermLock createMany
   */
  export type TermLockCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TermLocks.
     */
    data: TermLockCreateManyInput | TermLockCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TermLock createManyAndReturn
   */
  export type TermLockCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * The data used to create many TermLocks.
     */
    data: TermLockCreateManyInput | TermLockCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TermLock update
   */
  export type TermLockUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * The data needed to update a TermLock.
     */
    data: XOR<TermLockUpdateInput, TermLockUncheckedUpdateInput>
    /**
     * Choose, which TermLock to update.
     */
    where: TermLockWhereUniqueInput
  }

  /**
   * TermLock updateMany
   */
  export type TermLockUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TermLocks.
     */
    data: XOR<TermLockUpdateManyMutationInput, TermLockUncheckedUpdateManyInput>
    /**
     * Filter which TermLocks to update
     */
    where?: TermLockWhereInput
    /**
     * Limit how many TermLocks to update.
     */
    limit?: number
  }

  /**
   * TermLock updateManyAndReturn
   */
  export type TermLockUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * The data used to update TermLocks.
     */
    data: XOR<TermLockUpdateManyMutationInput, TermLockUncheckedUpdateManyInput>
    /**
     * Filter which TermLocks to update
     */
    where?: TermLockWhereInput
    /**
     * Limit how many TermLocks to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TermLock upsert
   */
  export type TermLockUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * The filter to search for the TermLock to update in case it exists.
     */
    where: TermLockWhereUniqueInput
    /**
     * In case the TermLock found by the `where` argument doesn't exist, create a new TermLock with this data.
     */
    create: XOR<TermLockCreateInput, TermLockUncheckedCreateInput>
    /**
     * In case the TermLock was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TermLockUpdateInput, TermLockUncheckedUpdateInput>
  }

  /**
   * TermLock delete
   */
  export type TermLockDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
    /**
     * Filter which TermLock to delete.
     */
    where: TermLockWhereUniqueInput
  }

  /**
   * TermLock deleteMany
   */
  export type TermLockDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TermLocks to delete
     */
    where?: TermLockWhereInput
    /**
     * Limit how many TermLocks to delete.
     */
    limit?: number
  }

  /**
   * TermLock without action
   */
  export type TermLockDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TermLock
     */
    select?: TermLockSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TermLock
     */
    omit?: TermLockOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TermLockInclude<ExtArgs> | null
  }


  /**
   * Model Result
   */

  export type AggregateResult = {
    _count: ResultCountAggregateOutputType | null
    _avg: ResultAvgAggregateOutputType | null
    _sum: ResultSumAggregateOutputType | null
    _min: ResultMinAggregateOutputType | null
    _max: ResultMaxAggregateOutputType | null
  }

  export type ResultAvgAggregateOutputType = {
    score: number | null
  }

  export type ResultSumAggregateOutputType = {
    score: number | null
  }

  export type ResultMinAggregateOutputType = {
    id: string | null
    studentId: string | null
    session: string | null
    term: string | null
    subject: string | null
    score: number | null
    date: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ResultMaxAggregateOutputType = {
    id: string | null
    studentId: string | null
    session: string | null
    term: string | null
    subject: string | null
    score: number | null
    date: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ResultCountAggregateOutputType = {
    id: number
    studentId: number
    session: number
    term: number
    subject: number
    score: number
    date: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ResultAvgAggregateInputType = {
    score?: true
  }

  export type ResultSumAggregateInputType = {
    score?: true
  }

  export type ResultMinAggregateInputType = {
    id?: true
    studentId?: true
    session?: true
    term?: true
    subject?: true
    score?: true
    date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ResultMaxAggregateInputType = {
    id?: true
    studentId?: true
    session?: true
    term?: true
    subject?: true
    score?: true
    date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ResultCountAggregateInputType = {
    id?: true
    studentId?: true
    session?: true
    term?: true
    subject?: true
    score?: true
    date?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ResultAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Result to aggregate.
     */
    where?: ResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Results to fetch.
     */
    orderBy?: ResultOrderByWithRelationInput | ResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Results from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Results.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Results
    **/
    _count?: true | ResultCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ResultAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ResultSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ResultMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ResultMaxAggregateInputType
  }

  export type GetResultAggregateType<T extends ResultAggregateArgs> = {
        [P in keyof T & keyof AggregateResult]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateResult[P]>
      : GetScalarType<T[P], AggregateResult[P]>
  }




  export type ResultGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ResultWhereInput
    orderBy?: ResultOrderByWithAggregationInput | ResultOrderByWithAggregationInput[]
    by: ResultScalarFieldEnum[] | ResultScalarFieldEnum
    having?: ResultScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ResultCountAggregateInputType | true
    _avg?: ResultAvgAggregateInputType
    _sum?: ResultSumAggregateInputType
    _min?: ResultMinAggregateInputType
    _max?: ResultMaxAggregateInputType
  }

  export type ResultGroupByOutputType = {
    id: string
    studentId: string
    session: string
    term: string
    subject: string
    score: number
    date: string | null
    createdAt: Date
    updatedAt: Date
    _count: ResultCountAggregateOutputType | null
    _avg: ResultAvgAggregateOutputType | null
    _sum: ResultSumAggregateOutputType | null
    _min: ResultMinAggregateOutputType | null
    _max: ResultMaxAggregateOutputType | null
  }

  type GetResultGroupByPayload<T extends ResultGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ResultGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ResultGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ResultGroupByOutputType[P]>
            : GetScalarType<T[P], ResultGroupByOutputType[P]>
        }
      >
    >


  export type ResultSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    session?: boolean
    term?: boolean
    subject?: boolean
    score?: boolean
    date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["result"]>

  export type ResultSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    session?: boolean
    term?: boolean
    subject?: boolean
    score?: boolean
    date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["result"]>

  export type ResultSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    session?: boolean
    term?: boolean
    subject?: boolean
    score?: boolean
    date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["result"]>

  export type ResultSelectScalar = {
    id?: boolean
    studentId?: boolean
    session?: boolean
    term?: boolean
    subject?: boolean
    score?: boolean
    date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ResultOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "studentId" | "session" | "term" | "subject" | "score" | "date" | "createdAt" | "updatedAt", ExtArgs["result"]["result"]>
  export type ResultInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }
  export type ResultIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }
  export type ResultIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }

  export type $ResultPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Result"
    objects: {
      student: Prisma.$StudentPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      studentId: string
      session: string
      term: string
      subject: string
      score: number
      date: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["result"]>
    composites: {}
  }

  type ResultGetPayload<S extends boolean | null | undefined | ResultDefaultArgs> = $Result.GetResult<Prisma.$ResultPayload, S>

  type ResultCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ResultFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ResultCountAggregateInputType | true
    }

  export interface ResultDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Result'], meta: { name: 'Result' } }
    /**
     * Find zero or one Result that matches the filter.
     * @param {ResultFindUniqueArgs} args - Arguments to find a Result
     * @example
     * // Get one Result
     * const result = await prisma.result.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ResultFindUniqueArgs>(args: SelectSubset<T, ResultFindUniqueArgs<ExtArgs>>): Prisma__ResultClient<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Result that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ResultFindUniqueOrThrowArgs} args - Arguments to find a Result
     * @example
     * // Get one Result
     * const result = await prisma.result.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ResultFindUniqueOrThrowArgs>(args: SelectSubset<T, ResultFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ResultClient<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Result that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResultFindFirstArgs} args - Arguments to find a Result
     * @example
     * // Get one Result
     * const result = await prisma.result.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ResultFindFirstArgs>(args?: SelectSubset<T, ResultFindFirstArgs<ExtArgs>>): Prisma__ResultClient<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Result that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResultFindFirstOrThrowArgs} args - Arguments to find a Result
     * @example
     * // Get one Result
     * const result = await prisma.result.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ResultFindFirstOrThrowArgs>(args?: SelectSubset<T, ResultFindFirstOrThrowArgs<ExtArgs>>): Prisma__ResultClient<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Results that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResultFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Results
     * const results = await prisma.result.findMany()
     * 
     * // Get first 10 Results
     * const results = await prisma.result.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const resultWithIdOnly = await prisma.result.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ResultFindManyArgs>(args?: SelectSubset<T, ResultFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Result.
     * @param {ResultCreateArgs} args - Arguments to create a Result.
     * @example
     * // Create one Result
     * const Result = await prisma.result.create({
     *   data: {
     *     // ... data to create a Result
     *   }
     * })
     * 
     */
    create<T extends ResultCreateArgs>(args: SelectSubset<T, ResultCreateArgs<ExtArgs>>): Prisma__ResultClient<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Results.
     * @param {ResultCreateManyArgs} args - Arguments to create many Results.
     * @example
     * // Create many Results
     * const result = await prisma.result.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ResultCreateManyArgs>(args?: SelectSubset<T, ResultCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Results and returns the data saved in the database.
     * @param {ResultCreateManyAndReturnArgs} args - Arguments to create many Results.
     * @example
     * // Create many Results
     * const result = await prisma.result.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Results and only return the `id`
     * const resultWithIdOnly = await prisma.result.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ResultCreateManyAndReturnArgs>(args?: SelectSubset<T, ResultCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Result.
     * @param {ResultDeleteArgs} args - Arguments to delete one Result.
     * @example
     * // Delete one Result
     * const Result = await prisma.result.delete({
     *   where: {
     *     // ... filter to delete one Result
     *   }
     * })
     * 
     */
    delete<T extends ResultDeleteArgs>(args: SelectSubset<T, ResultDeleteArgs<ExtArgs>>): Prisma__ResultClient<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Result.
     * @param {ResultUpdateArgs} args - Arguments to update one Result.
     * @example
     * // Update one Result
     * const result = await prisma.result.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ResultUpdateArgs>(args: SelectSubset<T, ResultUpdateArgs<ExtArgs>>): Prisma__ResultClient<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Results.
     * @param {ResultDeleteManyArgs} args - Arguments to filter Results to delete.
     * @example
     * // Delete a few Results
     * const { count } = await prisma.result.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ResultDeleteManyArgs>(args?: SelectSubset<T, ResultDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Results.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResultUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Results
     * const result = await prisma.result.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ResultUpdateManyArgs>(args: SelectSubset<T, ResultUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Results and returns the data updated in the database.
     * @param {ResultUpdateManyAndReturnArgs} args - Arguments to update many Results.
     * @example
     * // Update many Results
     * const result = await prisma.result.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Results and only return the `id`
     * const resultWithIdOnly = await prisma.result.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ResultUpdateManyAndReturnArgs>(args: SelectSubset<T, ResultUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Result.
     * @param {ResultUpsertArgs} args - Arguments to update or create a Result.
     * @example
     * // Update or create a Result
     * const result = await prisma.result.upsert({
     *   create: {
     *     // ... data to create a Result
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Result we want to update
     *   }
     * })
     */
    upsert<T extends ResultUpsertArgs>(args: SelectSubset<T, ResultUpsertArgs<ExtArgs>>): Prisma__ResultClient<$Result.GetResult<Prisma.$ResultPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Results.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResultCountArgs} args - Arguments to filter Results to count.
     * @example
     * // Count the number of Results
     * const count = await prisma.result.count({
     *   where: {
     *     // ... the filter for the Results we want to count
     *   }
     * })
    **/
    count<T extends ResultCountArgs>(
      args?: Subset<T, ResultCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ResultCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Result.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResultAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ResultAggregateArgs>(args: Subset<T, ResultAggregateArgs>): Prisma.PrismaPromise<GetResultAggregateType<T>>

    /**
     * Group by Result.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResultGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ResultGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ResultGroupByArgs['orderBy'] }
        : { orderBy?: ResultGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ResultGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetResultGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Result model
   */
  readonly fields: ResultFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Result.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ResultClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    student<T extends StudentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, StudentDefaultArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Result model
   */
  interface ResultFieldRefs {
    readonly id: FieldRef<"Result", 'String'>
    readonly studentId: FieldRef<"Result", 'String'>
    readonly session: FieldRef<"Result", 'String'>
    readonly term: FieldRef<"Result", 'String'>
    readonly subject: FieldRef<"Result", 'String'>
    readonly score: FieldRef<"Result", 'Int'>
    readonly date: FieldRef<"Result", 'String'>
    readonly createdAt: FieldRef<"Result", 'DateTime'>
    readonly updatedAt: FieldRef<"Result", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Result findUnique
   */
  export type ResultFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * Filter, which Result to fetch.
     */
    where: ResultWhereUniqueInput
  }

  /**
   * Result findUniqueOrThrow
   */
  export type ResultFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * Filter, which Result to fetch.
     */
    where: ResultWhereUniqueInput
  }

  /**
   * Result findFirst
   */
  export type ResultFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * Filter, which Result to fetch.
     */
    where?: ResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Results to fetch.
     */
    orderBy?: ResultOrderByWithRelationInput | ResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Results.
     */
    cursor?: ResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Results from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Results.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Results.
     */
    distinct?: ResultScalarFieldEnum | ResultScalarFieldEnum[]
  }

  /**
   * Result findFirstOrThrow
   */
  export type ResultFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * Filter, which Result to fetch.
     */
    where?: ResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Results to fetch.
     */
    orderBy?: ResultOrderByWithRelationInput | ResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Results.
     */
    cursor?: ResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Results from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Results.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Results.
     */
    distinct?: ResultScalarFieldEnum | ResultScalarFieldEnum[]
  }

  /**
   * Result findMany
   */
  export type ResultFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * Filter, which Results to fetch.
     */
    where?: ResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Results to fetch.
     */
    orderBy?: ResultOrderByWithRelationInput | ResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Results.
     */
    cursor?: ResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Results from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Results.
     */
    skip?: number
    distinct?: ResultScalarFieldEnum | ResultScalarFieldEnum[]
  }

  /**
   * Result create
   */
  export type ResultCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * The data needed to create a Result.
     */
    data: XOR<ResultCreateInput, ResultUncheckedCreateInput>
  }

  /**
   * Result createMany
   */
  export type ResultCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Results.
     */
    data: ResultCreateManyInput | ResultCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Result createManyAndReturn
   */
  export type ResultCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * The data used to create many Results.
     */
    data: ResultCreateManyInput | ResultCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Result update
   */
  export type ResultUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * The data needed to update a Result.
     */
    data: XOR<ResultUpdateInput, ResultUncheckedUpdateInput>
    /**
     * Choose, which Result to update.
     */
    where: ResultWhereUniqueInput
  }

  /**
   * Result updateMany
   */
  export type ResultUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Results.
     */
    data: XOR<ResultUpdateManyMutationInput, ResultUncheckedUpdateManyInput>
    /**
     * Filter which Results to update
     */
    where?: ResultWhereInput
    /**
     * Limit how many Results to update.
     */
    limit?: number
  }

  /**
   * Result updateManyAndReturn
   */
  export type ResultUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * The data used to update Results.
     */
    data: XOR<ResultUpdateManyMutationInput, ResultUncheckedUpdateManyInput>
    /**
     * Filter which Results to update
     */
    where?: ResultWhereInput
    /**
     * Limit how many Results to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Result upsert
   */
  export type ResultUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * The filter to search for the Result to update in case it exists.
     */
    where: ResultWhereUniqueInput
    /**
     * In case the Result found by the `where` argument doesn't exist, create a new Result with this data.
     */
    create: XOR<ResultCreateInput, ResultUncheckedCreateInput>
    /**
     * In case the Result was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ResultUpdateInput, ResultUncheckedUpdateInput>
  }

  /**
   * Result delete
   */
  export type ResultDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
    /**
     * Filter which Result to delete.
     */
    where: ResultWhereUniqueInput
  }

  /**
   * Result deleteMany
   */
  export type ResultDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Results to delete
     */
    where?: ResultWhereInput
    /**
     * Limit how many Results to delete.
     */
    limit?: number
  }

  /**
   * Result without action
   */
  export type ResultDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Result
     */
    select?: ResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Result
     */
    omit?: ResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ResultInclude<ExtArgs> | null
  }


  /**
   * Model ReportMeta
   */

  export type AggregateReportMeta = {
    _count: ReportMetaCountAggregateOutputType | null
    _avg: ReportMetaAvgAggregateOutputType | null
    _sum: ReportMetaSumAggregateOutputType | null
    _min: ReportMetaMinAggregateOutputType | null
    _max: ReportMetaMaxAggregateOutputType | null
  }

  export type ReportMetaAvgAggregateOutputType = {
    present: number | null
    absent: number | null
    total: number | null
  }

  export type ReportMetaSumAggregateOutputType = {
    present: number | null
    absent: number | null
    total: number | null
  }

  export type ReportMetaMinAggregateOutputType = {
    id: string | null
    studentId: string | null
    session: string | null
    term: string | null
    nextTermBegins: string | null
    teacherComment: string | null
    headTeacherComment: string | null
    present: number | null
    absent: number | null
    total: number | null
    updatedAt: Date | null
  }

  export type ReportMetaMaxAggregateOutputType = {
    id: string | null
    studentId: string | null
    session: string | null
    term: string | null
    nextTermBegins: string | null
    teacherComment: string | null
    headTeacherComment: string | null
    present: number | null
    absent: number | null
    total: number | null
    updatedAt: Date | null
  }

  export type ReportMetaCountAggregateOutputType = {
    id: number
    studentId: number
    session: number
    term: number
    nextTermBegins: number
    teacherComment: number
    headTeacherComment: number
    present: number
    absent: number
    total: number
    updatedAt: number
    _all: number
  }


  export type ReportMetaAvgAggregateInputType = {
    present?: true
    absent?: true
    total?: true
  }

  export type ReportMetaSumAggregateInputType = {
    present?: true
    absent?: true
    total?: true
  }

  export type ReportMetaMinAggregateInputType = {
    id?: true
    studentId?: true
    session?: true
    term?: true
    nextTermBegins?: true
    teacherComment?: true
    headTeacherComment?: true
    present?: true
    absent?: true
    total?: true
    updatedAt?: true
  }

  export type ReportMetaMaxAggregateInputType = {
    id?: true
    studentId?: true
    session?: true
    term?: true
    nextTermBegins?: true
    teacherComment?: true
    headTeacherComment?: true
    present?: true
    absent?: true
    total?: true
    updatedAt?: true
  }

  export type ReportMetaCountAggregateInputType = {
    id?: true
    studentId?: true
    session?: true
    term?: true
    nextTermBegins?: true
    teacherComment?: true
    headTeacherComment?: true
    present?: true
    absent?: true
    total?: true
    updatedAt?: true
    _all?: true
  }

  export type ReportMetaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReportMeta to aggregate.
     */
    where?: ReportMetaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportMetas to fetch.
     */
    orderBy?: ReportMetaOrderByWithRelationInput | ReportMetaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ReportMetaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportMetas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportMetas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ReportMetas
    **/
    _count?: true | ReportMetaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ReportMetaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ReportMetaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ReportMetaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ReportMetaMaxAggregateInputType
  }

  export type GetReportMetaAggregateType<T extends ReportMetaAggregateArgs> = {
        [P in keyof T & keyof AggregateReportMeta]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateReportMeta[P]>
      : GetScalarType<T[P], AggregateReportMeta[P]>
  }




  export type ReportMetaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportMetaWhereInput
    orderBy?: ReportMetaOrderByWithAggregationInput | ReportMetaOrderByWithAggregationInput[]
    by: ReportMetaScalarFieldEnum[] | ReportMetaScalarFieldEnum
    having?: ReportMetaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ReportMetaCountAggregateInputType | true
    _avg?: ReportMetaAvgAggregateInputType
    _sum?: ReportMetaSumAggregateInputType
    _min?: ReportMetaMinAggregateInputType
    _max?: ReportMetaMaxAggregateInputType
  }

  export type ReportMetaGroupByOutputType = {
    id: string
    studentId: string
    session: string
    term: string
    nextTermBegins: string | null
    teacherComment: string | null
    headTeacherComment: string | null
    present: number
    absent: number
    total: number
    updatedAt: Date
    _count: ReportMetaCountAggregateOutputType | null
    _avg: ReportMetaAvgAggregateOutputType | null
    _sum: ReportMetaSumAggregateOutputType | null
    _min: ReportMetaMinAggregateOutputType | null
    _max: ReportMetaMaxAggregateOutputType | null
  }

  type GetReportMetaGroupByPayload<T extends ReportMetaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ReportMetaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ReportMetaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ReportMetaGroupByOutputType[P]>
            : GetScalarType<T[P], ReportMetaGroupByOutputType[P]>
        }
      >
    >


  export type ReportMetaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    session?: boolean
    term?: boolean
    nextTermBegins?: boolean
    teacherComment?: boolean
    headTeacherComment?: boolean
    present?: boolean
    absent?: boolean
    total?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reportMeta"]>

  export type ReportMetaSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    session?: boolean
    term?: boolean
    nextTermBegins?: boolean
    teacherComment?: boolean
    headTeacherComment?: boolean
    present?: boolean
    absent?: boolean
    total?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reportMeta"]>

  export type ReportMetaSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    session?: boolean
    term?: boolean
    nextTermBegins?: boolean
    teacherComment?: boolean
    headTeacherComment?: boolean
    present?: boolean
    absent?: boolean
    total?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reportMeta"]>

  export type ReportMetaSelectScalar = {
    id?: boolean
    studentId?: boolean
    session?: boolean
    term?: boolean
    nextTermBegins?: boolean
    teacherComment?: boolean
    headTeacherComment?: boolean
    present?: boolean
    absent?: boolean
    total?: boolean
    updatedAt?: boolean
  }

  export type ReportMetaOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "studentId" | "session" | "term" | "nextTermBegins" | "teacherComment" | "headTeacherComment" | "present" | "absent" | "total" | "updatedAt", ExtArgs["result"]["reportMeta"]>
  export type ReportMetaInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }
  export type ReportMetaIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }
  export type ReportMetaIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }

  export type $ReportMetaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ReportMeta"
    objects: {
      student: Prisma.$StudentPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      studentId: string
      session: string
      term: string
      nextTermBegins: string | null
      teacherComment: string | null
      headTeacherComment: string | null
      present: number
      absent: number
      total: number
      updatedAt: Date
    }, ExtArgs["result"]["reportMeta"]>
    composites: {}
  }

  type ReportMetaGetPayload<S extends boolean | null | undefined | ReportMetaDefaultArgs> = $Result.GetResult<Prisma.$ReportMetaPayload, S>

  type ReportMetaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ReportMetaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ReportMetaCountAggregateInputType | true
    }

  export interface ReportMetaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ReportMeta'], meta: { name: 'ReportMeta' } }
    /**
     * Find zero or one ReportMeta that matches the filter.
     * @param {ReportMetaFindUniqueArgs} args - Arguments to find a ReportMeta
     * @example
     * // Get one ReportMeta
     * const reportMeta = await prisma.reportMeta.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ReportMetaFindUniqueArgs>(args: SelectSubset<T, ReportMetaFindUniqueArgs<ExtArgs>>): Prisma__ReportMetaClient<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ReportMeta that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ReportMetaFindUniqueOrThrowArgs} args - Arguments to find a ReportMeta
     * @example
     * // Get one ReportMeta
     * const reportMeta = await prisma.reportMeta.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ReportMetaFindUniqueOrThrowArgs>(args: SelectSubset<T, ReportMetaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ReportMetaClient<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ReportMeta that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportMetaFindFirstArgs} args - Arguments to find a ReportMeta
     * @example
     * // Get one ReportMeta
     * const reportMeta = await prisma.reportMeta.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ReportMetaFindFirstArgs>(args?: SelectSubset<T, ReportMetaFindFirstArgs<ExtArgs>>): Prisma__ReportMetaClient<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ReportMeta that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportMetaFindFirstOrThrowArgs} args - Arguments to find a ReportMeta
     * @example
     * // Get one ReportMeta
     * const reportMeta = await prisma.reportMeta.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ReportMetaFindFirstOrThrowArgs>(args?: SelectSubset<T, ReportMetaFindFirstOrThrowArgs<ExtArgs>>): Prisma__ReportMetaClient<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ReportMetas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportMetaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ReportMetas
     * const reportMetas = await prisma.reportMeta.findMany()
     * 
     * // Get first 10 ReportMetas
     * const reportMetas = await prisma.reportMeta.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const reportMetaWithIdOnly = await prisma.reportMeta.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ReportMetaFindManyArgs>(args?: SelectSubset<T, ReportMetaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ReportMeta.
     * @param {ReportMetaCreateArgs} args - Arguments to create a ReportMeta.
     * @example
     * // Create one ReportMeta
     * const ReportMeta = await prisma.reportMeta.create({
     *   data: {
     *     // ... data to create a ReportMeta
     *   }
     * })
     * 
     */
    create<T extends ReportMetaCreateArgs>(args: SelectSubset<T, ReportMetaCreateArgs<ExtArgs>>): Prisma__ReportMetaClient<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ReportMetas.
     * @param {ReportMetaCreateManyArgs} args - Arguments to create many ReportMetas.
     * @example
     * // Create many ReportMetas
     * const reportMeta = await prisma.reportMeta.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ReportMetaCreateManyArgs>(args?: SelectSubset<T, ReportMetaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ReportMetas and returns the data saved in the database.
     * @param {ReportMetaCreateManyAndReturnArgs} args - Arguments to create many ReportMetas.
     * @example
     * // Create many ReportMetas
     * const reportMeta = await prisma.reportMeta.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ReportMetas and only return the `id`
     * const reportMetaWithIdOnly = await prisma.reportMeta.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ReportMetaCreateManyAndReturnArgs>(args?: SelectSubset<T, ReportMetaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ReportMeta.
     * @param {ReportMetaDeleteArgs} args - Arguments to delete one ReportMeta.
     * @example
     * // Delete one ReportMeta
     * const ReportMeta = await prisma.reportMeta.delete({
     *   where: {
     *     // ... filter to delete one ReportMeta
     *   }
     * })
     * 
     */
    delete<T extends ReportMetaDeleteArgs>(args: SelectSubset<T, ReportMetaDeleteArgs<ExtArgs>>): Prisma__ReportMetaClient<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ReportMeta.
     * @param {ReportMetaUpdateArgs} args - Arguments to update one ReportMeta.
     * @example
     * // Update one ReportMeta
     * const reportMeta = await prisma.reportMeta.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ReportMetaUpdateArgs>(args: SelectSubset<T, ReportMetaUpdateArgs<ExtArgs>>): Prisma__ReportMetaClient<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ReportMetas.
     * @param {ReportMetaDeleteManyArgs} args - Arguments to filter ReportMetas to delete.
     * @example
     * // Delete a few ReportMetas
     * const { count } = await prisma.reportMeta.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ReportMetaDeleteManyArgs>(args?: SelectSubset<T, ReportMetaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ReportMetas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportMetaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ReportMetas
     * const reportMeta = await prisma.reportMeta.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ReportMetaUpdateManyArgs>(args: SelectSubset<T, ReportMetaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ReportMetas and returns the data updated in the database.
     * @param {ReportMetaUpdateManyAndReturnArgs} args - Arguments to update many ReportMetas.
     * @example
     * // Update many ReportMetas
     * const reportMeta = await prisma.reportMeta.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ReportMetas and only return the `id`
     * const reportMetaWithIdOnly = await prisma.reportMeta.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ReportMetaUpdateManyAndReturnArgs>(args: SelectSubset<T, ReportMetaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ReportMeta.
     * @param {ReportMetaUpsertArgs} args - Arguments to update or create a ReportMeta.
     * @example
     * // Update or create a ReportMeta
     * const reportMeta = await prisma.reportMeta.upsert({
     *   create: {
     *     // ... data to create a ReportMeta
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ReportMeta we want to update
     *   }
     * })
     */
    upsert<T extends ReportMetaUpsertArgs>(args: SelectSubset<T, ReportMetaUpsertArgs<ExtArgs>>): Prisma__ReportMetaClient<$Result.GetResult<Prisma.$ReportMetaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ReportMetas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportMetaCountArgs} args - Arguments to filter ReportMetas to count.
     * @example
     * // Count the number of ReportMetas
     * const count = await prisma.reportMeta.count({
     *   where: {
     *     // ... the filter for the ReportMetas we want to count
     *   }
     * })
    **/
    count<T extends ReportMetaCountArgs>(
      args?: Subset<T, ReportMetaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ReportMetaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ReportMeta.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportMetaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ReportMetaAggregateArgs>(args: Subset<T, ReportMetaAggregateArgs>): Prisma.PrismaPromise<GetReportMetaAggregateType<T>>

    /**
     * Group by ReportMeta.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportMetaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ReportMetaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ReportMetaGroupByArgs['orderBy'] }
        : { orderBy?: ReportMetaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ReportMetaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetReportMetaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ReportMeta model
   */
  readonly fields: ReportMetaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ReportMeta.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ReportMetaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    student<T extends StudentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, StudentDefaultArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ReportMeta model
   */
  interface ReportMetaFieldRefs {
    readonly id: FieldRef<"ReportMeta", 'String'>
    readonly studentId: FieldRef<"ReportMeta", 'String'>
    readonly session: FieldRef<"ReportMeta", 'String'>
    readonly term: FieldRef<"ReportMeta", 'String'>
    readonly nextTermBegins: FieldRef<"ReportMeta", 'String'>
    readonly teacherComment: FieldRef<"ReportMeta", 'String'>
    readonly headTeacherComment: FieldRef<"ReportMeta", 'String'>
    readonly present: FieldRef<"ReportMeta", 'Int'>
    readonly absent: FieldRef<"ReportMeta", 'Int'>
    readonly total: FieldRef<"ReportMeta", 'Int'>
    readonly updatedAt: FieldRef<"ReportMeta", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ReportMeta findUnique
   */
  export type ReportMetaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * Filter, which ReportMeta to fetch.
     */
    where: ReportMetaWhereUniqueInput
  }

  /**
   * ReportMeta findUniqueOrThrow
   */
  export type ReportMetaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * Filter, which ReportMeta to fetch.
     */
    where: ReportMetaWhereUniqueInput
  }

  /**
   * ReportMeta findFirst
   */
  export type ReportMetaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * Filter, which ReportMeta to fetch.
     */
    where?: ReportMetaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportMetas to fetch.
     */
    orderBy?: ReportMetaOrderByWithRelationInput | ReportMetaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReportMetas.
     */
    cursor?: ReportMetaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportMetas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportMetas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReportMetas.
     */
    distinct?: ReportMetaScalarFieldEnum | ReportMetaScalarFieldEnum[]
  }

  /**
   * ReportMeta findFirstOrThrow
   */
  export type ReportMetaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * Filter, which ReportMeta to fetch.
     */
    where?: ReportMetaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportMetas to fetch.
     */
    orderBy?: ReportMetaOrderByWithRelationInput | ReportMetaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReportMetas.
     */
    cursor?: ReportMetaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportMetas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportMetas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReportMetas.
     */
    distinct?: ReportMetaScalarFieldEnum | ReportMetaScalarFieldEnum[]
  }

  /**
   * ReportMeta findMany
   */
  export type ReportMetaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * Filter, which ReportMetas to fetch.
     */
    where?: ReportMetaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportMetas to fetch.
     */
    orderBy?: ReportMetaOrderByWithRelationInput | ReportMetaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ReportMetas.
     */
    cursor?: ReportMetaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportMetas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportMetas.
     */
    skip?: number
    distinct?: ReportMetaScalarFieldEnum | ReportMetaScalarFieldEnum[]
  }

  /**
   * ReportMeta create
   */
  export type ReportMetaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * The data needed to create a ReportMeta.
     */
    data: XOR<ReportMetaCreateInput, ReportMetaUncheckedCreateInput>
  }

  /**
   * ReportMeta createMany
   */
  export type ReportMetaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ReportMetas.
     */
    data: ReportMetaCreateManyInput | ReportMetaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ReportMeta createManyAndReturn
   */
  export type ReportMetaCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * The data used to create many ReportMetas.
     */
    data: ReportMetaCreateManyInput | ReportMetaCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ReportMeta update
   */
  export type ReportMetaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * The data needed to update a ReportMeta.
     */
    data: XOR<ReportMetaUpdateInput, ReportMetaUncheckedUpdateInput>
    /**
     * Choose, which ReportMeta to update.
     */
    where: ReportMetaWhereUniqueInput
  }

  /**
   * ReportMeta updateMany
   */
  export type ReportMetaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ReportMetas.
     */
    data: XOR<ReportMetaUpdateManyMutationInput, ReportMetaUncheckedUpdateManyInput>
    /**
     * Filter which ReportMetas to update
     */
    where?: ReportMetaWhereInput
    /**
     * Limit how many ReportMetas to update.
     */
    limit?: number
  }

  /**
   * ReportMeta updateManyAndReturn
   */
  export type ReportMetaUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * The data used to update ReportMetas.
     */
    data: XOR<ReportMetaUpdateManyMutationInput, ReportMetaUncheckedUpdateManyInput>
    /**
     * Filter which ReportMetas to update
     */
    where?: ReportMetaWhereInput
    /**
     * Limit how many ReportMetas to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ReportMeta upsert
   */
  export type ReportMetaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * The filter to search for the ReportMeta to update in case it exists.
     */
    where: ReportMetaWhereUniqueInput
    /**
     * In case the ReportMeta found by the `where` argument doesn't exist, create a new ReportMeta with this data.
     */
    create: XOR<ReportMetaCreateInput, ReportMetaUncheckedCreateInput>
    /**
     * In case the ReportMeta was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ReportMetaUpdateInput, ReportMetaUncheckedUpdateInput>
  }

  /**
   * ReportMeta delete
   */
  export type ReportMetaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
    /**
     * Filter which ReportMeta to delete.
     */
    where: ReportMetaWhereUniqueInput
  }

  /**
   * ReportMeta deleteMany
   */
  export type ReportMetaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReportMetas to delete
     */
    where?: ReportMetaWhereInput
    /**
     * Limit how many ReportMetas to delete.
     */
    limit?: number
  }

  /**
   * ReportMeta without action
   */
  export type ReportMetaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportMeta
     */
    select?: ReportMetaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportMeta
     */
    omit?: ReportMetaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportMetaInclude<ExtArgs> | null
  }


  /**
   * Model AuditLog
   */

  export type AggregateAuditLog = {
    _count: AuditLogCountAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  export type AuditLogMinAggregateOutputType = {
    id: string | null
    userId: string | null
    action: string | null
    entity: string | null
    entityId: string | null
    createdAt: Date | null
  }

  export type AuditLogMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    action: string | null
    entity: string | null
    entityId: string | null
    createdAt: Date | null
  }

  export type AuditLogCountAggregateOutputType = {
    id: number
    userId: number
    action: number
    entity: number
    entityId: number
    before: number
    after: number
    createdAt: number
    _all: number
  }


  export type AuditLogMinAggregateInputType = {
    id?: true
    userId?: true
    action?: true
    entity?: true
    entityId?: true
    createdAt?: true
  }

  export type AuditLogMaxAggregateInputType = {
    id?: true
    userId?: true
    action?: true
    entity?: true
    entityId?: true
    createdAt?: true
  }

  export type AuditLogCountAggregateInputType = {
    id?: true
    userId?: true
    action?: true
    entity?: true
    entityId?: true
    before?: true
    after?: true
    createdAt?: true
    _all?: true
  }

  export type AuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLog to aggregate.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditLogs
    **/
    _count?: true | AuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditLogMaxAggregateInputType
  }

  export type GetAuditLogAggregateType<T extends AuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditLog[P]>
      : GetScalarType<T[P], AggregateAuditLog[P]>
  }




  export type AuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithAggregationInput | AuditLogOrderByWithAggregationInput[]
    by: AuditLogScalarFieldEnum[] | AuditLogScalarFieldEnum
    having?: AuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditLogCountAggregateInputType | true
    _min?: AuditLogMinAggregateInputType
    _max?: AuditLogMaxAggregateInputType
  }

  export type AuditLogGroupByOutputType = {
    id: string
    userId: string | null
    action: string
    entity: string
    entityId: string | null
    before: JsonValue | null
    after: JsonValue | null
    createdAt: Date
    _count: AuditLogCountAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  type GetAuditLogGroupByPayload<T extends AuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    before?: boolean
    after?: boolean
    createdAt?: boolean
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    before?: boolean
    after?: boolean
    createdAt?: boolean
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    before?: boolean
    after?: boolean
    createdAt?: boolean
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectScalar = {
    id?: boolean
    userId?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    before?: boolean
    after?: boolean
    createdAt?: boolean
  }

  export type AuditLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "action" | "entity" | "entityId" | "before" | "after" | "createdAt", ExtArgs["result"]["auditLog"]>
  export type AuditLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }
  export type AuditLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }
  export type AuditLogIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }

  export type $AuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditLog"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string | null
      action: string
      entity: string
      entityId: string | null
      before: Prisma.JsonValue | null
      after: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["auditLog"]>
    composites: {}
  }

  type AuditLogGetPayload<S extends boolean | null | undefined | AuditLogDefaultArgs> = $Result.GetResult<Prisma.$AuditLogPayload, S>

  type AuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuditLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuditLogCountAggregateInputType | true
    }

  export interface AuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditLog'], meta: { name: 'AuditLog' } }
    /**
     * Find zero or one AuditLog that matches the filter.
     * @param {AuditLogFindUniqueArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditLogFindUniqueArgs>(args: SelectSubset<T, AuditLogFindUniqueArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuditLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuditLogFindUniqueOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditLogFindFirstArgs>(args?: SelectSubset<T, AuditLogFindFirstArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditLogs
     * const auditLogs = await prisma.auditLog.findMany()
     * 
     * // Get first 10 AuditLogs
     * const auditLogs = await prisma.auditLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuditLogFindManyArgs>(args?: SelectSubset<T, AuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuditLog.
     * @param {AuditLogCreateArgs} args - Arguments to create a AuditLog.
     * @example
     * // Create one AuditLog
     * const AuditLog = await prisma.auditLog.create({
     *   data: {
     *     // ... data to create a AuditLog
     *   }
     * })
     * 
     */
    create<T extends AuditLogCreateArgs>(args: SelectSubset<T, AuditLogCreateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuditLogs.
     * @param {AuditLogCreateManyArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditLogCreateManyArgs>(args?: SelectSubset<T, AuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuditLogs and returns the data saved in the database.
     * @param {AuditLogCreateManyAndReturnArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AuditLog.
     * @param {AuditLogDeleteArgs} args - Arguments to delete one AuditLog.
     * @example
     * // Delete one AuditLog
     * const AuditLog = await prisma.auditLog.delete({
     *   where: {
     *     // ... filter to delete one AuditLog
     *   }
     * })
     * 
     */
    delete<T extends AuditLogDeleteArgs>(args: SelectSubset<T, AuditLogDeleteArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuditLog.
     * @param {AuditLogUpdateArgs} args - Arguments to update one AuditLog.
     * @example
     * // Update one AuditLog
     * const auditLog = await prisma.auditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditLogUpdateArgs>(args: SelectSubset<T, AuditLogUpdateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuditLogs.
     * @param {AuditLogDeleteManyArgs} args - Arguments to filter AuditLogs to delete.
     * @example
     * // Delete a few AuditLogs
     * const { count } = await prisma.auditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditLogDeleteManyArgs>(args?: SelectSubset<T, AuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditLogUpdateManyArgs>(args: SelectSubset<T, AuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs and returns the data updated in the database.
     * @param {AuditLogUpdateManyAndReturnArgs} args - Arguments to update many AuditLogs.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AuditLogUpdateManyAndReturnArgs>(args: SelectSubset<T, AuditLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AuditLog.
     * @param {AuditLogUpsertArgs} args - Arguments to update or create a AuditLog.
     * @example
     * // Update or create a AuditLog
     * const auditLog = await prisma.auditLog.upsert({
     *   create: {
     *     // ... data to create a AuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AuditLogUpsertArgs>(args: SelectSubset<T, AuditLogUpsertArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogCountArgs} args - Arguments to filter AuditLogs to count.
     * @example
     * // Count the number of AuditLogs
     * const count = await prisma.auditLog.count({
     *   where: {
     *     // ... the filter for the AuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AuditLogCountArgs>(
      args?: Subset<T, AuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuditLogAggregateArgs>(args: Subset<T, AuditLogAggregateArgs>): Prisma.PrismaPromise<GetAuditLogAggregateType<T>>

    /**
     * Group by AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AuditLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditLog model
   */
  readonly fields: AuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends AuditLog$userArgs<ExtArgs> = {}>(args?: Subset<T, AuditLog$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuditLog model
   */
  interface AuditLogFieldRefs {
    readonly id: FieldRef<"AuditLog", 'String'>
    readonly userId: FieldRef<"AuditLog", 'String'>
    readonly action: FieldRef<"AuditLog", 'String'>
    readonly entity: FieldRef<"AuditLog", 'String'>
    readonly entityId: FieldRef<"AuditLog", 'String'>
    readonly before: FieldRef<"AuditLog", 'Json'>
    readonly after: FieldRef<"AuditLog", 'Json'>
    readonly createdAt: FieldRef<"AuditLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuditLog findUnique
   */
  export type AuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findUniqueOrThrow
   */
  export type AuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findFirst
   */
  export type AuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findFirstOrThrow
   */
  export type AuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findMany
   */
  export type AuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLogs to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog create
   */
  export type AuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AuditLog.
     */
    data: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
  }

  /**
   * AuditLog createMany
   */
  export type AuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuditLog createManyAndReturn
   */
  export type AuditLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog update
   */
  export type AuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AuditLog.
     */
    data: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
    /**
     * Choose, which AuditLog to update.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog updateMany
   */
  export type AuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
  }

  /**
   * AuditLog updateManyAndReturn
   */
  export type AuditLogUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog upsert
   */
  export type AuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AuditLog to update in case it exists.
     */
    where: AuditLogWhereUniqueInput
    /**
     * In case the AuditLog found by the `where` argument doesn't exist, create a new AuditLog with this data.
     */
    create: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
    /**
     * In case the AuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
  }

  /**
   * AuditLog delete
   */
  export type AuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter which AuditLog to delete.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog deleteMany
   */
  export type AuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLogs to delete
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to delete.
     */
    limit?: number
  }

  /**
   * AuditLog.user
   */
  export type AuditLog$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * AuditLog without action
   */
  export type AuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
  }


  /**
   * Model FinanceStudentProfile
   */

  export type AggregateFinanceStudentProfile = {
    _count: FinanceStudentProfileCountAggregateOutputType | null
    _min: FinanceStudentProfileMinAggregateOutputType | null
    _max: FinanceStudentProfileMaxAggregateOutputType | null
  }

  export type FinanceStudentProfileMinAggregateOutputType = {
    id: string | null
    studentId: string | null
    studentType: string | null
    canStudentView: boolean | null
    canParentView: boolean | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FinanceStudentProfileMaxAggregateOutputType = {
    id: string | null
    studentId: string | null
    studentType: string | null
    canStudentView: boolean | null
    canParentView: boolean | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FinanceStudentProfileCountAggregateOutputType = {
    id: number
    studentId: number
    studentType: number
    canStudentView: number
    canParentView: number
    notes: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FinanceStudentProfileMinAggregateInputType = {
    id?: true
    studentId?: true
    studentType?: true
    canStudentView?: true
    canParentView?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FinanceStudentProfileMaxAggregateInputType = {
    id?: true
    studentId?: true
    studentType?: true
    canStudentView?: true
    canParentView?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FinanceStudentProfileCountAggregateInputType = {
    id?: true
    studentId?: true
    studentType?: true
    canStudentView?: true
    canParentView?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FinanceStudentProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FinanceStudentProfile to aggregate.
     */
    where?: FinanceStudentProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceStudentProfiles to fetch.
     */
    orderBy?: FinanceStudentProfileOrderByWithRelationInput | FinanceStudentProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FinanceStudentProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceStudentProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceStudentProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FinanceStudentProfiles
    **/
    _count?: true | FinanceStudentProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FinanceStudentProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FinanceStudentProfileMaxAggregateInputType
  }

  export type GetFinanceStudentProfileAggregateType<T extends FinanceStudentProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateFinanceStudentProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFinanceStudentProfile[P]>
      : GetScalarType<T[P], AggregateFinanceStudentProfile[P]>
  }




  export type FinanceStudentProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FinanceStudentProfileWhereInput
    orderBy?: FinanceStudentProfileOrderByWithAggregationInput | FinanceStudentProfileOrderByWithAggregationInput[]
    by: FinanceStudentProfileScalarFieldEnum[] | FinanceStudentProfileScalarFieldEnum
    having?: FinanceStudentProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FinanceStudentProfileCountAggregateInputType | true
    _min?: FinanceStudentProfileMinAggregateInputType
    _max?: FinanceStudentProfileMaxAggregateInputType
  }

  export type FinanceStudentProfileGroupByOutputType = {
    id: string
    studentId: string
    studentType: string
    canStudentView: boolean
    canParentView: boolean
    notes: string | null
    createdAt: Date
    updatedAt: Date
    _count: FinanceStudentProfileCountAggregateOutputType | null
    _min: FinanceStudentProfileMinAggregateOutputType | null
    _max: FinanceStudentProfileMaxAggregateOutputType | null
  }

  type GetFinanceStudentProfileGroupByPayload<T extends FinanceStudentProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FinanceStudentProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FinanceStudentProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FinanceStudentProfileGroupByOutputType[P]>
            : GetScalarType<T[P], FinanceStudentProfileGroupByOutputType[P]>
        }
      >
    >


  export type FinanceStudentProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    studentType?: boolean
    canStudentView?: boolean
    canParentView?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeStudentProfile"]>

  export type FinanceStudentProfileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    studentType?: boolean
    canStudentView?: boolean
    canParentView?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeStudentProfile"]>

  export type FinanceStudentProfileSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    studentType?: boolean
    canStudentView?: boolean
    canParentView?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeStudentProfile"]>

  export type FinanceStudentProfileSelectScalar = {
    id?: boolean
    studentId?: boolean
    studentType?: boolean
    canStudentView?: boolean
    canParentView?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FinanceStudentProfileOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "studentId" | "studentType" | "canStudentView" | "canParentView" | "notes" | "createdAt" | "updatedAt", ExtArgs["result"]["financeStudentProfile"]>
  export type FinanceStudentProfileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }
  export type FinanceStudentProfileIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }
  export type FinanceStudentProfileIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    student?: boolean | StudentDefaultArgs<ExtArgs>
  }

  export type $FinanceStudentProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FinanceStudentProfile"
    objects: {
      student: Prisma.$StudentPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      studentId: string
      studentType: string
      canStudentView: boolean
      canParentView: boolean
      notes: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["financeStudentProfile"]>
    composites: {}
  }

  type FinanceStudentProfileGetPayload<S extends boolean | null | undefined | FinanceStudentProfileDefaultArgs> = $Result.GetResult<Prisma.$FinanceStudentProfilePayload, S>

  type FinanceStudentProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FinanceStudentProfileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FinanceStudentProfileCountAggregateInputType | true
    }

  export interface FinanceStudentProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FinanceStudentProfile'], meta: { name: 'FinanceStudentProfile' } }
    /**
     * Find zero or one FinanceStudentProfile that matches the filter.
     * @param {FinanceStudentProfileFindUniqueArgs} args - Arguments to find a FinanceStudentProfile
     * @example
     * // Get one FinanceStudentProfile
     * const financeStudentProfile = await prisma.financeStudentProfile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FinanceStudentProfileFindUniqueArgs>(args: SelectSubset<T, FinanceStudentProfileFindUniqueArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FinanceStudentProfile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FinanceStudentProfileFindUniqueOrThrowArgs} args - Arguments to find a FinanceStudentProfile
     * @example
     * // Get one FinanceStudentProfile
     * const financeStudentProfile = await prisma.financeStudentProfile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FinanceStudentProfileFindUniqueOrThrowArgs>(args: SelectSubset<T, FinanceStudentProfileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FinanceStudentProfile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceStudentProfileFindFirstArgs} args - Arguments to find a FinanceStudentProfile
     * @example
     * // Get one FinanceStudentProfile
     * const financeStudentProfile = await prisma.financeStudentProfile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FinanceStudentProfileFindFirstArgs>(args?: SelectSubset<T, FinanceStudentProfileFindFirstArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FinanceStudentProfile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceStudentProfileFindFirstOrThrowArgs} args - Arguments to find a FinanceStudentProfile
     * @example
     * // Get one FinanceStudentProfile
     * const financeStudentProfile = await prisma.financeStudentProfile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FinanceStudentProfileFindFirstOrThrowArgs>(args?: SelectSubset<T, FinanceStudentProfileFindFirstOrThrowArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FinanceStudentProfiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceStudentProfileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FinanceStudentProfiles
     * const financeStudentProfiles = await prisma.financeStudentProfile.findMany()
     * 
     * // Get first 10 FinanceStudentProfiles
     * const financeStudentProfiles = await prisma.financeStudentProfile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const financeStudentProfileWithIdOnly = await prisma.financeStudentProfile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FinanceStudentProfileFindManyArgs>(args?: SelectSubset<T, FinanceStudentProfileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FinanceStudentProfile.
     * @param {FinanceStudentProfileCreateArgs} args - Arguments to create a FinanceStudentProfile.
     * @example
     * // Create one FinanceStudentProfile
     * const FinanceStudentProfile = await prisma.financeStudentProfile.create({
     *   data: {
     *     // ... data to create a FinanceStudentProfile
     *   }
     * })
     * 
     */
    create<T extends FinanceStudentProfileCreateArgs>(args: SelectSubset<T, FinanceStudentProfileCreateArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FinanceStudentProfiles.
     * @param {FinanceStudentProfileCreateManyArgs} args - Arguments to create many FinanceStudentProfiles.
     * @example
     * // Create many FinanceStudentProfiles
     * const financeStudentProfile = await prisma.financeStudentProfile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FinanceStudentProfileCreateManyArgs>(args?: SelectSubset<T, FinanceStudentProfileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FinanceStudentProfiles and returns the data saved in the database.
     * @param {FinanceStudentProfileCreateManyAndReturnArgs} args - Arguments to create many FinanceStudentProfiles.
     * @example
     * // Create many FinanceStudentProfiles
     * const financeStudentProfile = await prisma.financeStudentProfile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FinanceStudentProfiles and only return the `id`
     * const financeStudentProfileWithIdOnly = await prisma.financeStudentProfile.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FinanceStudentProfileCreateManyAndReturnArgs>(args?: SelectSubset<T, FinanceStudentProfileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FinanceStudentProfile.
     * @param {FinanceStudentProfileDeleteArgs} args - Arguments to delete one FinanceStudentProfile.
     * @example
     * // Delete one FinanceStudentProfile
     * const FinanceStudentProfile = await prisma.financeStudentProfile.delete({
     *   where: {
     *     // ... filter to delete one FinanceStudentProfile
     *   }
     * })
     * 
     */
    delete<T extends FinanceStudentProfileDeleteArgs>(args: SelectSubset<T, FinanceStudentProfileDeleteArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FinanceStudentProfile.
     * @param {FinanceStudentProfileUpdateArgs} args - Arguments to update one FinanceStudentProfile.
     * @example
     * // Update one FinanceStudentProfile
     * const financeStudentProfile = await prisma.financeStudentProfile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FinanceStudentProfileUpdateArgs>(args: SelectSubset<T, FinanceStudentProfileUpdateArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FinanceStudentProfiles.
     * @param {FinanceStudentProfileDeleteManyArgs} args - Arguments to filter FinanceStudentProfiles to delete.
     * @example
     * // Delete a few FinanceStudentProfiles
     * const { count } = await prisma.financeStudentProfile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FinanceStudentProfileDeleteManyArgs>(args?: SelectSubset<T, FinanceStudentProfileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FinanceStudentProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceStudentProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FinanceStudentProfiles
     * const financeStudentProfile = await prisma.financeStudentProfile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FinanceStudentProfileUpdateManyArgs>(args: SelectSubset<T, FinanceStudentProfileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FinanceStudentProfiles and returns the data updated in the database.
     * @param {FinanceStudentProfileUpdateManyAndReturnArgs} args - Arguments to update many FinanceStudentProfiles.
     * @example
     * // Update many FinanceStudentProfiles
     * const financeStudentProfile = await prisma.financeStudentProfile.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FinanceStudentProfiles and only return the `id`
     * const financeStudentProfileWithIdOnly = await prisma.financeStudentProfile.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FinanceStudentProfileUpdateManyAndReturnArgs>(args: SelectSubset<T, FinanceStudentProfileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FinanceStudentProfile.
     * @param {FinanceStudentProfileUpsertArgs} args - Arguments to update or create a FinanceStudentProfile.
     * @example
     * // Update or create a FinanceStudentProfile
     * const financeStudentProfile = await prisma.financeStudentProfile.upsert({
     *   create: {
     *     // ... data to create a FinanceStudentProfile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FinanceStudentProfile we want to update
     *   }
     * })
     */
    upsert<T extends FinanceStudentProfileUpsertArgs>(args: SelectSubset<T, FinanceStudentProfileUpsertArgs<ExtArgs>>): Prisma__FinanceStudentProfileClient<$Result.GetResult<Prisma.$FinanceStudentProfilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FinanceStudentProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceStudentProfileCountArgs} args - Arguments to filter FinanceStudentProfiles to count.
     * @example
     * // Count the number of FinanceStudentProfiles
     * const count = await prisma.financeStudentProfile.count({
     *   where: {
     *     // ... the filter for the FinanceStudentProfiles we want to count
     *   }
     * })
    **/
    count<T extends FinanceStudentProfileCountArgs>(
      args?: Subset<T, FinanceStudentProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FinanceStudentProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FinanceStudentProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceStudentProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FinanceStudentProfileAggregateArgs>(args: Subset<T, FinanceStudentProfileAggregateArgs>): Prisma.PrismaPromise<GetFinanceStudentProfileAggregateType<T>>

    /**
     * Group by FinanceStudentProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceStudentProfileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FinanceStudentProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FinanceStudentProfileGroupByArgs['orderBy'] }
        : { orderBy?: FinanceStudentProfileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FinanceStudentProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFinanceStudentProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FinanceStudentProfile model
   */
  readonly fields: FinanceStudentProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FinanceStudentProfile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FinanceStudentProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    student<T extends StudentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, StudentDefaultArgs<ExtArgs>>): Prisma__StudentClient<$Result.GetResult<Prisma.$StudentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FinanceStudentProfile model
   */
  interface FinanceStudentProfileFieldRefs {
    readonly id: FieldRef<"FinanceStudentProfile", 'String'>
    readonly studentId: FieldRef<"FinanceStudentProfile", 'String'>
    readonly studentType: FieldRef<"FinanceStudentProfile", 'String'>
    readonly canStudentView: FieldRef<"FinanceStudentProfile", 'Boolean'>
    readonly canParentView: FieldRef<"FinanceStudentProfile", 'Boolean'>
    readonly notes: FieldRef<"FinanceStudentProfile", 'String'>
    readonly createdAt: FieldRef<"FinanceStudentProfile", 'DateTime'>
    readonly updatedAt: FieldRef<"FinanceStudentProfile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FinanceStudentProfile findUnique
   */
  export type FinanceStudentProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which FinanceStudentProfile to fetch.
     */
    where: FinanceStudentProfileWhereUniqueInput
  }

  /**
   * FinanceStudentProfile findUniqueOrThrow
   */
  export type FinanceStudentProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which FinanceStudentProfile to fetch.
     */
    where: FinanceStudentProfileWhereUniqueInput
  }

  /**
   * FinanceStudentProfile findFirst
   */
  export type FinanceStudentProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which FinanceStudentProfile to fetch.
     */
    where?: FinanceStudentProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceStudentProfiles to fetch.
     */
    orderBy?: FinanceStudentProfileOrderByWithRelationInput | FinanceStudentProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FinanceStudentProfiles.
     */
    cursor?: FinanceStudentProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceStudentProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceStudentProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FinanceStudentProfiles.
     */
    distinct?: FinanceStudentProfileScalarFieldEnum | FinanceStudentProfileScalarFieldEnum[]
  }

  /**
   * FinanceStudentProfile findFirstOrThrow
   */
  export type FinanceStudentProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which FinanceStudentProfile to fetch.
     */
    where?: FinanceStudentProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceStudentProfiles to fetch.
     */
    orderBy?: FinanceStudentProfileOrderByWithRelationInput | FinanceStudentProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FinanceStudentProfiles.
     */
    cursor?: FinanceStudentProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceStudentProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceStudentProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FinanceStudentProfiles.
     */
    distinct?: FinanceStudentProfileScalarFieldEnum | FinanceStudentProfileScalarFieldEnum[]
  }

  /**
   * FinanceStudentProfile findMany
   */
  export type FinanceStudentProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which FinanceStudentProfiles to fetch.
     */
    where?: FinanceStudentProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceStudentProfiles to fetch.
     */
    orderBy?: FinanceStudentProfileOrderByWithRelationInput | FinanceStudentProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FinanceStudentProfiles.
     */
    cursor?: FinanceStudentProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceStudentProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceStudentProfiles.
     */
    skip?: number
    distinct?: FinanceStudentProfileScalarFieldEnum | FinanceStudentProfileScalarFieldEnum[]
  }

  /**
   * FinanceStudentProfile create
   */
  export type FinanceStudentProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * The data needed to create a FinanceStudentProfile.
     */
    data: XOR<FinanceStudentProfileCreateInput, FinanceStudentProfileUncheckedCreateInput>
  }

  /**
   * FinanceStudentProfile createMany
   */
  export type FinanceStudentProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FinanceStudentProfiles.
     */
    data: FinanceStudentProfileCreateManyInput | FinanceStudentProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FinanceStudentProfile createManyAndReturn
   */
  export type FinanceStudentProfileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * The data used to create many FinanceStudentProfiles.
     */
    data: FinanceStudentProfileCreateManyInput | FinanceStudentProfileCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FinanceStudentProfile update
   */
  export type FinanceStudentProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * The data needed to update a FinanceStudentProfile.
     */
    data: XOR<FinanceStudentProfileUpdateInput, FinanceStudentProfileUncheckedUpdateInput>
    /**
     * Choose, which FinanceStudentProfile to update.
     */
    where: FinanceStudentProfileWhereUniqueInput
  }

  /**
   * FinanceStudentProfile updateMany
   */
  export type FinanceStudentProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FinanceStudentProfiles.
     */
    data: XOR<FinanceStudentProfileUpdateManyMutationInput, FinanceStudentProfileUncheckedUpdateManyInput>
    /**
     * Filter which FinanceStudentProfiles to update
     */
    where?: FinanceStudentProfileWhereInput
    /**
     * Limit how many FinanceStudentProfiles to update.
     */
    limit?: number
  }

  /**
   * FinanceStudentProfile updateManyAndReturn
   */
  export type FinanceStudentProfileUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * The data used to update FinanceStudentProfiles.
     */
    data: XOR<FinanceStudentProfileUpdateManyMutationInput, FinanceStudentProfileUncheckedUpdateManyInput>
    /**
     * Filter which FinanceStudentProfiles to update
     */
    where?: FinanceStudentProfileWhereInput
    /**
     * Limit how many FinanceStudentProfiles to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FinanceStudentProfile upsert
   */
  export type FinanceStudentProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * The filter to search for the FinanceStudentProfile to update in case it exists.
     */
    where: FinanceStudentProfileWhereUniqueInput
    /**
     * In case the FinanceStudentProfile found by the `where` argument doesn't exist, create a new FinanceStudentProfile with this data.
     */
    create: XOR<FinanceStudentProfileCreateInput, FinanceStudentProfileUncheckedCreateInput>
    /**
     * In case the FinanceStudentProfile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FinanceStudentProfileUpdateInput, FinanceStudentProfileUncheckedUpdateInput>
  }

  /**
   * FinanceStudentProfile delete
   */
  export type FinanceStudentProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
    /**
     * Filter which FinanceStudentProfile to delete.
     */
    where: FinanceStudentProfileWhereUniqueInput
  }

  /**
   * FinanceStudentProfile deleteMany
   */
  export type FinanceStudentProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FinanceStudentProfiles to delete
     */
    where?: FinanceStudentProfileWhereInput
    /**
     * Limit how many FinanceStudentProfiles to delete.
     */
    limit?: number
  }

  /**
   * FinanceStudentProfile without action
   */
  export type FinanceStudentProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceStudentProfile
     */
    select?: FinanceStudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceStudentProfile
     */
    omit?: FinanceStudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceStudentProfileInclude<ExtArgs> | null
  }


  /**
   * Model FinanceFeeStructure
   */

  export type AggregateFinanceFeeStructure = {
    _count: FinanceFeeStructureCountAggregateOutputType | null
    _min: FinanceFeeStructureMinAggregateOutputType | null
    _max: FinanceFeeStructureMaxAggregateOutputType | null
  }

  export type FinanceFeeStructureMinAggregateOutputType = {
    id: string | null
    classId: string | null
    session: string | null
    term: string | null
    studentType: string | null
    title: string | null
    description: string | null
    status: $Enums.FinanceApprovalStatus | null
    submittedAt: Date | null
    submittedById: string | null
    submittedByName: string | null
    approvedAt: Date | null
    approvedById: string | null
    approvedByName: string | null
    rejectedAt: Date | null
    rejectedById: string | null
    rejectedByName: string | null
    rejectionReason: string | null
    createdById: string | null
    createdByName: string | null
    updatedById: string | null
    updatedByName: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FinanceFeeStructureMaxAggregateOutputType = {
    id: string | null
    classId: string | null
    session: string | null
    term: string | null
    studentType: string | null
    title: string | null
    description: string | null
    status: $Enums.FinanceApprovalStatus | null
    submittedAt: Date | null
    submittedById: string | null
    submittedByName: string | null
    approvedAt: Date | null
    approvedById: string | null
    approvedByName: string | null
    rejectedAt: Date | null
    rejectedById: string | null
    rejectedByName: string | null
    rejectionReason: string | null
    createdById: string | null
    createdByName: string | null
    updatedById: string | null
    updatedByName: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FinanceFeeStructureCountAggregateOutputType = {
    id: number
    classId: number
    session: number
    term: number
    studentType: number
    title: number
    description: number
    status: number
    submittedAt: number
    submittedById: number
    submittedByName: number
    approvedAt: number
    approvedById: number
    approvedByName: number
    rejectedAt: number
    rejectedById: number
    rejectedByName: number
    rejectionReason: number
    createdById: number
    createdByName: number
    updatedById: number
    updatedByName: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FinanceFeeStructureMinAggregateInputType = {
    id?: true
    classId?: true
    session?: true
    term?: true
    studentType?: true
    title?: true
    description?: true
    status?: true
    submittedAt?: true
    submittedById?: true
    submittedByName?: true
    approvedAt?: true
    approvedById?: true
    approvedByName?: true
    rejectedAt?: true
    rejectedById?: true
    rejectedByName?: true
    rejectionReason?: true
    createdById?: true
    createdByName?: true
    updatedById?: true
    updatedByName?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FinanceFeeStructureMaxAggregateInputType = {
    id?: true
    classId?: true
    session?: true
    term?: true
    studentType?: true
    title?: true
    description?: true
    status?: true
    submittedAt?: true
    submittedById?: true
    submittedByName?: true
    approvedAt?: true
    approvedById?: true
    approvedByName?: true
    rejectedAt?: true
    rejectedById?: true
    rejectedByName?: true
    rejectionReason?: true
    createdById?: true
    createdByName?: true
    updatedById?: true
    updatedByName?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FinanceFeeStructureCountAggregateInputType = {
    id?: true
    classId?: true
    session?: true
    term?: true
    studentType?: true
    title?: true
    description?: true
    status?: true
    submittedAt?: true
    submittedById?: true
    submittedByName?: true
    approvedAt?: true
    approvedById?: true
    approvedByName?: true
    rejectedAt?: true
    rejectedById?: true
    rejectedByName?: true
    rejectionReason?: true
    createdById?: true
    createdByName?: true
    updatedById?: true
    updatedByName?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FinanceFeeStructureAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FinanceFeeStructure to aggregate.
     */
    where?: FinanceFeeStructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeStructures to fetch.
     */
    orderBy?: FinanceFeeStructureOrderByWithRelationInput | FinanceFeeStructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FinanceFeeStructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeStructures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeStructures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FinanceFeeStructures
    **/
    _count?: true | FinanceFeeStructureCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FinanceFeeStructureMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FinanceFeeStructureMaxAggregateInputType
  }

  export type GetFinanceFeeStructureAggregateType<T extends FinanceFeeStructureAggregateArgs> = {
        [P in keyof T & keyof AggregateFinanceFeeStructure]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFinanceFeeStructure[P]>
      : GetScalarType<T[P], AggregateFinanceFeeStructure[P]>
  }




  export type FinanceFeeStructureGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FinanceFeeStructureWhereInput
    orderBy?: FinanceFeeStructureOrderByWithAggregationInput | FinanceFeeStructureOrderByWithAggregationInput[]
    by: FinanceFeeStructureScalarFieldEnum[] | FinanceFeeStructureScalarFieldEnum
    having?: FinanceFeeStructureScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FinanceFeeStructureCountAggregateInputType | true
    _min?: FinanceFeeStructureMinAggregateInputType
    _max?: FinanceFeeStructureMaxAggregateInputType
  }

  export type FinanceFeeStructureGroupByOutputType = {
    id: string
    classId: string
    session: string
    term: string
    studentType: string
    title: string | null
    description: string | null
    status: $Enums.FinanceApprovalStatus
    submittedAt: Date | null
    submittedById: string | null
    submittedByName: string | null
    approvedAt: Date | null
    approvedById: string | null
    approvedByName: string | null
    rejectedAt: Date | null
    rejectedById: string | null
    rejectedByName: string | null
    rejectionReason: string | null
    createdById: string | null
    createdByName: string | null
    updatedById: string | null
    updatedByName: string | null
    createdAt: Date
    updatedAt: Date
    _count: FinanceFeeStructureCountAggregateOutputType | null
    _min: FinanceFeeStructureMinAggregateOutputType | null
    _max: FinanceFeeStructureMaxAggregateOutputType | null
  }

  type GetFinanceFeeStructureGroupByPayload<T extends FinanceFeeStructureGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FinanceFeeStructureGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FinanceFeeStructureGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FinanceFeeStructureGroupByOutputType[P]>
            : GetScalarType<T[P], FinanceFeeStructureGroupByOutputType[P]>
        }
      >
    >


  export type FinanceFeeStructureSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    classId?: boolean
    session?: boolean
    term?: boolean
    studentType?: boolean
    title?: boolean
    description?: boolean
    status?: boolean
    submittedAt?: boolean
    submittedById?: boolean
    submittedByName?: boolean
    approvedAt?: boolean
    approvedById?: boolean
    approvedByName?: boolean
    rejectedAt?: boolean
    rejectedById?: boolean
    rejectedByName?: boolean
    rejectionReason?: boolean
    createdById?: boolean
    createdByName?: boolean
    updatedById?: boolean
    updatedByName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
    components?: boolean | FinanceFeeStructure$componentsArgs<ExtArgs>
    approvals?: boolean | FinanceFeeStructure$approvalsArgs<ExtArgs>
    _count?: boolean | FinanceFeeStructureCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeStructure"]>

  export type FinanceFeeStructureSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    classId?: boolean
    session?: boolean
    term?: boolean
    studentType?: boolean
    title?: boolean
    description?: boolean
    status?: boolean
    submittedAt?: boolean
    submittedById?: boolean
    submittedByName?: boolean
    approvedAt?: boolean
    approvedById?: boolean
    approvedByName?: boolean
    rejectedAt?: boolean
    rejectedById?: boolean
    rejectedByName?: boolean
    rejectionReason?: boolean
    createdById?: boolean
    createdByName?: boolean
    updatedById?: boolean
    updatedByName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeStructure"]>

  export type FinanceFeeStructureSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    classId?: boolean
    session?: boolean
    term?: boolean
    studentType?: boolean
    title?: boolean
    description?: boolean
    status?: boolean
    submittedAt?: boolean
    submittedById?: boolean
    submittedByName?: boolean
    approvedAt?: boolean
    approvedById?: boolean
    approvedByName?: boolean
    rejectedAt?: boolean
    rejectedById?: boolean
    rejectedByName?: boolean
    rejectionReason?: boolean
    createdById?: boolean
    createdByName?: boolean
    updatedById?: boolean
    updatedByName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeStructure"]>

  export type FinanceFeeStructureSelectScalar = {
    id?: boolean
    classId?: boolean
    session?: boolean
    term?: boolean
    studentType?: boolean
    title?: boolean
    description?: boolean
    status?: boolean
    submittedAt?: boolean
    submittedById?: boolean
    submittedByName?: boolean
    approvedAt?: boolean
    approvedById?: boolean
    approvedByName?: boolean
    rejectedAt?: boolean
    rejectedById?: boolean
    rejectedByName?: boolean
    rejectionReason?: boolean
    createdById?: boolean
    createdByName?: boolean
    updatedById?: boolean
    updatedByName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FinanceFeeStructureOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "classId" | "session" | "term" | "studentType" | "title" | "description" | "status" | "submittedAt" | "submittedById" | "submittedByName" | "approvedAt" | "approvedById" | "approvedByName" | "rejectedAt" | "rejectedById" | "rejectedByName" | "rejectionReason" | "createdById" | "createdByName" | "updatedById" | "updatedByName" | "createdAt" | "updatedAt", ExtArgs["result"]["financeFeeStructure"]>
  export type FinanceFeeStructureInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
    components?: boolean | FinanceFeeStructure$componentsArgs<ExtArgs>
    approvals?: boolean | FinanceFeeStructure$approvalsArgs<ExtArgs>
    _count?: boolean | FinanceFeeStructureCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type FinanceFeeStructureIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }
  export type FinanceFeeStructureIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    class?: boolean | ClassDefaultArgs<ExtArgs>
  }

  export type $FinanceFeeStructurePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FinanceFeeStructure"
    objects: {
      class: Prisma.$ClassPayload<ExtArgs>
      components: Prisma.$FinanceFeeComponentPayload<ExtArgs>[]
      approvals: Prisma.$FinanceFeeApprovalPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      classId: string
      session: string
      term: string
      studentType: string
      title: string | null
      description: string | null
      status: $Enums.FinanceApprovalStatus
      submittedAt: Date | null
      submittedById: string | null
      submittedByName: string | null
      approvedAt: Date | null
      approvedById: string | null
      approvedByName: string | null
      rejectedAt: Date | null
      rejectedById: string | null
      rejectedByName: string | null
      rejectionReason: string | null
      createdById: string | null
      createdByName: string | null
      updatedById: string | null
      updatedByName: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["financeFeeStructure"]>
    composites: {}
  }

  type FinanceFeeStructureGetPayload<S extends boolean | null | undefined | FinanceFeeStructureDefaultArgs> = $Result.GetResult<Prisma.$FinanceFeeStructurePayload, S>

  type FinanceFeeStructureCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FinanceFeeStructureFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FinanceFeeStructureCountAggregateInputType | true
    }

  export interface FinanceFeeStructureDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FinanceFeeStructure'], meta: { name: 'FinanceFeeStructure' } }
    /**
     * Find zero or one FinanceFeeStructure that matches the filter.
     * @param {FinanceFeeStructureFindUniqueArgs} args - Arguments to find a FinanceFeeStructure
     * @example
     * // Get one FinanceFeeStructure
     * const financeFeeStructure = await prisma.financeFeeStructure.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FinanceFeeStructureFindUniqueArgs>(args: SelectSubset<T, FinanceFeeStructureFindUniqueArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FinanceFeeStructure that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FinanceFeeStructureFindUniqueOrThrowArgs} args - Arguments to find a FinanceFeeStructure
     * @example
     * // Get one FinanceFeeStructure
     * const financeFeeStructure = await prisma.financeFeeStructure.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FinanceFeeStructureFindUniqueOrThrowArgs>(args: SelectSubset<T, FinanceFeeStructureFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FinanceFeeStructure that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeStructureFindFirstArgs} args - Arguments to find a FinanceFeeStructure
     * @example
     * // Get one FinanceFeeStructure
     * const financeFeeStructure = await prisma.financeFeeStructure.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FinanceFeeStructureFindFirstArgs>(args?: SelectSubset<T, FinanceFeeStructureFindFirstArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FinanceFeeStructure that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeStructureFindFirstOrThrowArgs} args - Arguments to find a FinanceFeeStructure
     * @example
     * // Get one FinanceFeeStructure
     * const financeFeeStructure = await prisma.financeFeeStructure.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FinanceFeeStructureFindFirstOrThrowArgs>(args?: SelectSubset<T, FinanceFeeStructureFindFirstOrThrowArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FinanceFeeStructures that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeStructureFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FinanceFeeStructures
     * const financeFeeStructures = await prisma.financeFeeStructure.findMany()
     * 
     * // Get first 10 FinanceFeeStructures
     * const financeFeeStructures = await prisma.financeFeeStructure.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const financeFeeStructureWithIdOnly = await prisma.financeFeeStructure.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FinanceFeeStructureFindManyArgs>(args?: SelectSubset<T, FinanceFeeStructureFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FinanceFeeStructure.
     * @param {FinanceFeeStructureCreateArgs} args - Arguments to create a FinanceFeeStructure.
     * @example
     * // Create one FinanceFeeStructure
     * const FinanceFeeStructure = await prisma.financeFeeStructure.create({
     *   data: {
     *     // ... data to create a FinanceFeeStructure
     *   }
     * })
     * 
     */
    create<T extends FinanceFeeStructureCreateArgs>(args: SelectSubset<T, FinanceFeeStructureCreateArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FinanceFeeStructures.
     * @param {FinanceFeeStructureCreateManyArgs} args - Arguments to create many FinanceFeeStructures.
     * @example
     * // Create many FinanceFeeStructures
     * const financeFeeStructure = await prisma.financeFeeStructure.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FinanceFeeStructureCreateManyArgs>(args?: SelectSubset<T, FinanceFeeStructureCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FinanceFeeStructures and returns the data saved in the database.
     * @param {FinanceFeeStructureCreateManyAndReturnArgs} args - Arguments to create many FinanceFeeStructures.
     * @example
     * // Create many FinanceFeeStructures
     * const financeFeeStructure = await prisma.financeFeeStructure.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FinanceFeeStructures and only return the `id`
     * const financeFeeStructureWithIdOnly = await prisma.financeFeeStructure.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FinanceFeeStructureCreateManyAndReturnArgs>(args?: SelectSubset<T, FinanceFeeStructureCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FinanceFeeStructure.
     * @param {FinanceFeeStructureDeleteArgs} args - Arguments to delete one FinanceFeeStructure.
     * @example
     * // Delete one FinanceFeeStructure
     * const FinanceFeeStructure = await prisma.financeFeeStructure.delete({
     *   where: {
     *     // ... filter to delete one FinanceFeeStructure
     *   }
     * })
     * 
     */
    delete<T extends FinanceFeeStructureDeleteArgs>(args: SelectSubset<T, FinanceFeeStructureDeleteArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FinanceFeeStructure.
     * @param {FinanceFeeStructureUpdateArgs} args - Arguments to update one FinanceFeeStructure.
     * @example
     * // Update one FinanceFeeStructure
     * const financeFeeStructure = await prisma.financeFeeStructure.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FinanceFeeStructureUpdateArgs>(args: SelectSubset<T, FinanceFeeStructureUpdateArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FinanceFeeStructures.
     * @param {FinanceFeeStructureDeleteManyArgs} args - Arguments to filter FinanceFeeStructures to delete.
     * @example
     * // Delete a few FinanceFeeStructures
     * const { count } = await prisma.financeFeeStructure.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FinanceFeeStructureDeleteManyArgs>(args?: SelectSubset<T, FinanceFeeStructureDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FinanceFeeStructures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeStructureUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FinanceFeeStructures
     * const financeFeeStructure = await prisma.financeFeeStructure.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FinanceFeeStructureUpdateManyArgs>(args: SelectSubset<T, FinanceFeeStructureUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FinanceFeeStructures and returns the data updated in the database.
     * @param {FinanceFeeStructureUpdateManyAndReturnArgs} args - Arguments to update many FinanceFeeStructures.
     * @example
     * // Update many FinanceFeeStructures
     * const financeFeeStructure = await prisma.financeFeeStructure.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FinanceFeeStructures and only return the `id`
     * const financeFeeStructureWithIdOnly = await prisma.financeFeeStructure.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FinanceFeeStructureUpdateManyAndReturnArgs>(args: SelectSubset<T, FinanceFeeStructureUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FinanceFeeStructure.
     * @param {FinanceFeeStructureUpsertArgs} args - Arguments to update or create a FinanceFeeStructure.
     * @example
     * // Update or create a FinanceFeeStructure
     * const financeFeeStructure = await prisma.financeFeeStructure.upsert({
     *   create: {
     *     // ... data to create a FinanceFeeStructure
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FinanceFeeStructure we want to update
     *   }
     * })
     */
    upsert<T extends FinanceFeeStructureUpsertArgs>(args: SelectSubset<T, FinanceFeeStructureUpsertArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FinanceFeeStructures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeStructureCountArgs} args - Arguments to filter FinanceFeeStructures to count.
     * @example
     * // Count the number of FinanceFeeStructures
     * const count = await prisma.financeFeeStructure.count({
     *   where: {
     *     // ... the filter for the FinanceFeeStructures we want to count
     *   }
     * })
    **/
    count<T extends FinanceFeeStructureCountArgs>(
      args?: Subset<T, FinanceFeeStructureCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FinanceFeeStructureCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FinanceFeeStructure.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeStructureAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FinanceFeeStructureAggregateArgs>(args: Subset<T, FinanceFeeStructureAggregateArgs>): Prisma.PrismaPromise<GetFinanceFeeStructureAggregateType<T>>

    /**
     * Group by FinanceFeeStructure.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeStructureGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FinanceFeeStructureGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FinanceFeeStructureGroupByArgs['orderBy'] }
        : { orderBy?: FinanceFeeStructureGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FinanceFeeStructureGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFinanceFeeStructureGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FinanceFeeStructure model
   */
  readonly fields: FinanceFeeStructureFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FinanceFeeStructure.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FinanceFeeStructureClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    class<T extends ClassDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ClassDefaultArgs<ExtArgs>>): Prisma__ClassClient<$Result.GetResult<Prisma.$ClassPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    components<T extends FinanceFeeStructure$componentsArgs<ExtArgs> = {}>(args?: Subset<T, FinanceFeeStructure$componentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    approvals<T extends FinanceFeeStructure$approvalsArgs<ExtArgs> = {}>(args?: Subset<T, FinanceFeeStructure$approvalsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FinanceFeeStructure model
   */
  interface FinanceFeeStructureFieldRefs {
    readonly id: FieldRef<"FinanceFeeStructure", 'String'>
    readonly classId: FieldRef<"FinanceFeeStructure", 'String'>
    readonly session: FieldRef<"FinanceFeeStructure", 'String'>
    readonly term: FieldRef<"FinanceFeeStructure", 'String'>
    readonly studentType: FieldRef<"FinanceFeeStructure", 'String'>
    readonly title: FieldRef<"FinanceFeeStructure", 'String'>
    readonly description: FieldRef<"FinanceFeeStructure", 'String'>
    readonly status: FieldRef<"FinanceFeeStructure", 'FinanceApprovalStatus'>
    readonly submittedAt: FieldRef<"FinanceFeeStructure", 'DateTime'>
    readonly submittedById: FieldRef<"FinanceFeeStructure", 'String'>
    readonly submittedByName: FieldRef<"FinanceFeeStructure", 'String'>
    readonly approvedAt: FieldRef<"FinanceFeeStructure", 'DateTime'>
    readonly approvedById: FieldRef<"FinanceFeeStructure", 'String'>
    readonly approvedByName: FieldRef<"FinanceFeeStructure", 'String'>
    readonly rejectedAt: FieldRef<"FinanceFeeStructure", 'DateTime'>
    readonly rejectedById: FieldRef<"FinanceFeeStructure", 'String'>
    readonly rejectedByName: FieldRef<"FinanceFeeStructure", 'String'>
    readonly rejectionReason: FieldRef<"FinanceFeeStructure", 'String'>
    readonly createdById: FieldRef<"FinanceFeeStructure", 'String'>
    readonly createdByName: FieldRef<"FinanceFeeStructure", 'String'>
    readonly updatedById: FieldRef<"FinanceFeeStructure", 'String'>
    readonly updatedByName: FieldRef<"FinanceFeeStructure", 'String'>
    readonly createdAt: FieldRef<"FinanceFeeStructure", 'DateTime'>
    readonly updatedAt: FieldRef<"FinanceFeeStructure", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FinanceFeeStructure findUnique
   */
  export type FinanceFeeStructureFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeStructure to fetch.
     */
    where: FinanceFeeStructureWhereUniqueInput
  }

  /**
   * FinanceFeeStructure findUniqueOrThrow
   */
  export type FinanceFeeStructureFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeStructure to fetch.
     */
    where: FinanceFeeStructureWhereUniqueInput
  }

  /**
   * FinanceFeeStructure findFirst
   */
  export type FinanceFeeStructureFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeStructure to fetch.
     */
    where?: FinanceFeeStructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeStructures to fetch.
     */
    orderBy?: FinanceFeeStructureOrderByWithRelationInput | FinanceFeeStructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FinanceFeeStructures.
     */
    cursor?: FinanceFeeStructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeStructures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeStructures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FinanceFeeStructures.
     */
    distinct?: FinanceFeeStructureScalarFieldEnum | FinanceFeeStructureScalarFieldEnum[]
  }

  /**
   * FinanceFeeStructure findFirstOrThrow
   */
  export type FinanceFeeStructureFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeStructure to fetch.
     */
    where?: FinanceFeeStructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeStructures to fetch.
     */
    orderBy?: FinanceFeeStructureOrderByWithRelationInput | FinanceFeeStructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FinanceFeeStructures.
     */
    cursor?: FinanceFeeStructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeStructures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeStructures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FinanceFeeStructures.
     */
    distinct?: FinanceFeeStructureScalarFieldEnum | FinanceFeeStructureScalarFieldEnum[]
  }

  /**
   * FinanceFeeStructure findMany
   */
  export type FinanceFeeStructureFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeStructures to fetch.
     */
    where?: FinanceFeeStructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeStructures to fetch.
     */
    orderBy?: FinanceFeeStructureOrderByWithRelationInput | FinanceFeeStructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FinanceFeeStructures.
     */
    cursor?: FinanceFeeStructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeStructures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeStructures.
     */
    skip?: number
    distinct?: FinanceFeeStructureScalarFieldEnum | FinanceFeeStructureScalarFieldEnum[]
  }

  /**
   * FinanceFeeStructure create
   */
  export type FinanceFeeStructureCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * The data needed to create a FinanceFeeStructure.
     */
    data: XOR<FinanceFeeStructureCreateInput, FinanceFeeStructureUncheckedCreateInput>
  }

  /**
   * FinanceFeeStructure createMany
   */
  export type FinanceFeeStructureCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FinanceFeeStructures.
     */
    data: FinanceFeeStructureCreateManyInput | FinanceFeeStructureCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FinanceFeeStructure createManyAndReturn
   */
  export type FinanceFeeStructureCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * The data used to create many FinanceFeeStructures.
     */
    data: FinanceFeeStructureCreateManyInput | FinanceFeeStructureCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FinanceFeeStructure update
   */
  export type FinanceFeeStructureUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * The data needed to update a FinanceFeeStructure.
     */
    data: XOR<FinanceFeeStructureUpdateInput, FinanceFeeStructureUncheckedUpdateInput>
    /**
     * Choose, which FinanceFeeStructure to update.
     */
    where: FinanceFeeStructureWhereUniqueInput
  }

  /**
   * FinanceFeeStructure updateMany
   */
  export type FinanceFeeStructureUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FinanceFeeStructures.
     */
    data: XOR<FinanceFeeStructureUpdateManyMutationInput, FinanceFeeStructureUncheckedUpdateManyInput>
    /**
     * Filter which FinanceFeeStructures to update
     */
    where?: FinanceFeeStructureWhereInput
    /**
     * Limit how many FinanceFeeStructures to update.
     */
    limit?: number
  }

  /**
   * FinanceFeeStructure updateManyAndReturn
   */
  export type FinanceFeeStructureUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * The data used to update FinanceFeeStructures.
     */
    data: XOR<FinanceFeeStructureUpdateManyMutationInput, FinanceFeeStructureUncheckedUpdateManyInput>
    /**
     * Filter which FinanceFeeStructures to update
     */
    where?: FinanceFeeStructureWhereInput
    /**
     * Limit how many FinanceFeeStructures to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FinanceFeeStructure upsert
   */
  export type FinanceFeeStructureUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * The filter to search for the FinanceFeeStructure to update in case it exists.
     */
    where: FinanceFeeStructureWhereUniqueInput
    /**
     * In case the FinanceFeeStructure found by the `where` argument doesn't exist, create a new FinanceFeeStructure with this data.
     */
    create: XOR<FinanceFeeStructureCreateInput, FinanceFeeStructureUncheckedCreateInput>
    /**
     * In case the FinanceFeeStructure was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FinanceFeeStructureUpdateInput, FinanceFeeStructureUncheckedUpdateInput>
  }

  /**
   * FinanceFeeStructure delete
   */
  export type FinanceFeeStructureDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
    /**
     * Filter which FinanceFeeStructure to delete.
     */
    where: FinanceFeeStructureWhereUniqueInput
  }

  /**
   * FinanceFeeStructure deleteMany
   */
  export type FinanceFeeStructureDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FinanceFeeStructures to delete
     */
    where?: FinanceFeeStructureWhereInput
    /**
     * Limit how many FinanceFeeStructures to delete.
     */
    limit?: number
  }

  /**
   * FinanceFeeStructure.components
   */
  export type FinanceFeeStructure$componentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    where?: FinanceFeeComponentWhereInput
    orderBy?: FinanceFeeComponentOrderByWithRelationInput | FinanceFeeComponentOrderByWithRelationInput[]
    cursor?: FinanceFeeComponentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FinanceFeeComponentScalarFieldEnum | FinanceFeeComponentScalarFieldEnum[]
  }

  /**
   * FinanceFeeStructure.approvals
   */
  export type FinanceFeeStructure$approvalsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    where?: FinanceFeeApprovalWhereInput
    orderBy?: FinanceFeeApprovalOrderByWithRelationInput | FinanceFeeApprovalOrderByWithRelationInput[]
    cursor?: FinanceFeeApprovalWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FinanceFeeApprovalScalarFieldEnum | FinanceFeeApprovalScalarFieldEnum[]
  }

  /**
   * FinanceFeeStructure without action
   */
  export type FinanceFeeStructureDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeStructure
     */
    select?: FinanceFeeStructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeStructure
     */
    omit?: FinanceFeeStructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeStructureInclude<ExtArgs> | null
  }


  /**
   * Model FinanceFeeComponent
   */

  export type AggregateFinanceFeeComponent = {
    _count: FinanceFeeComponentCountAggregateOutputType | null
    _avg: FinanceFeeComponentAvgAggregateOutputType | null
    _sum: FinanceFeeComponentSumAggregateOutputType | null
    _min: FinanceFeeComponentMinAggregateOutputType | null
    _max: FinanceFeeComponentMaxAggregateOutputType | null
  }

  export type FinanceFeeComponentAvgAggregateOutputType = {
    amount: number | null
    sortOrder: number | null
  }

  export type FinanceFeeComponentSumAggregateOutputType = {
    amount: number | null
    sortOrder: number | null
  }

  export type FinanceFeeComponentMinAggregateOutputType = {
    id: string | null
    feeStructureId: string | null
    code: string | null
    name: string | null
    description: string | null
    amount: number | null
    isOptional: boolean | null
    visibleToStudent: boolean | null
    visibleToParent: boolean | null
    sortOrder: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FinanceFeeComponentMaxAggregateOutputType = {
    id: string | null
    feeStructureId: string | null
    code: string | null
    name: string | null
    description: string | null
    amount: number | null
    isOptional: boolean | null
    visibleToStudent: boolean | null
    visibleToParent: boolean | null
    sortOrder: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FinanceFeeComponentCountAggregateOutputType = {
    id: number
    feeStructureId: number
    code: number
    name: number
    description: number
    amount: number
    isOptional: number
    visibleToStudent: number
    visibleToParent: number
    sortOrder: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FinanceFeeComponentAvgAggregateInputType = {
    amount?: true
    sortOrder?: true
  }

  export type FinanceFeeComponentSumAggregateInputType = {
    amount?: true
    sortOrder?: true
  }

  export type FinanceFeeComponentMinAggregateInputType = {
    id?: true
    feeStructureId?: true
    code?: true
    name?: true
    description?: true
    amount?: true
    isOptional?: true
    visibleToStudent?: true
    visibleToParent?: true
    sortOrder?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FinanceFeeComponentMaxAggregateInputType = {
    id?: true
    feeStructureId?: true
    code?: true
    name?: true
    description?: true
    amount?: true
    isOptional?: true
    visibleToStudent?: true
    visibleToParent?: true
    sortOrder?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FinanceFeeComponentCountAggregateInputType = {
    id?: true
    feeStructureId?: true
    code?: true
    name?: true
    description?: true
    amount?: true
    isOptional?: true
    visibleToStudent?: true
    visibleToParent?: true
    sortOrder?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FinanceFeeComponentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FinanceFeeComponent to aggregate.
     */
    where?: FinanceFeeComponentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeComponents to fetch.
     */
    orderBy?: FinanceFeeComponentOrderByWithRelationInput | FinanceFeeComponentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FinanceFeeComponentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeComponents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeComponents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FinanceFeeComponents
    **/
    _count?: true | FinanceFeeComponentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FinanceFeeComponentAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FinanceFeeComponentSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FinanceFeeComponentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FinanceFeeComponentMaxAggregateInputType
  }

  export type GetFinanceFeeComponentAggregateType<T extends FinanceFeeComponentAggregateArgs> = {
        [P in keyof T & keyof AggregateFinanceFeeComponent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFinanceFeeComponent[P]>
      : GetScalarType<T[P], AggregateFinanceFeeComponent[P]>
  }




  export type FinanceFeeComponentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FinanceFeeComponentWhereInput
    orderBy?: FinanceFeeComponentOrderByWithAggregationInput | FinanceFeeComponentOrderByWithAggregationInput[]
    by: FinanceFeeComponentScalarFieldEnum[] | FinanceFeeComponentScalarFieldEnum
    having?: FinanceFeeComponentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FinanceFeeComponentCountAggregateInputType | true
    _avg?: FinanceFeeComponentAvgAggregateInputType
    _sum?: FinanceFeeComponentSumAggregateInputType
    _min?: FinanceFeeComponentMinAggregateInputType
    _max?: FinanceFeeComponentMaxAggregateInputType
  }

  export type FinanceFeeComponentGroupByOutputType = {
    id: string
    feeStructureId: string
    code: string
    name: string
    description: string | null
    amount: number
    isOptional: boolean
    visibleToStudent: boolean
    visibleToParent: boolean
    sortOrder: number
    createdAt: Date
    updatedAt: Date
    _count: FinanceFeeComponentCountAggregateOutputType | null
    _avg: FinanceFeeComponentAvgAggregateOutputType | null
    _sum: FinanceFeeComponentSumAggregateOutputType | null
    _min: FinanceFeeComponentMinAggregateOutputType | null
    _max: FinanceFeeComponentMaxAggregateOutputType | null
  }

  type GetFinanceFeeComponentGroupByPayload<T extends FinanceFeeComponentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FinanceFeeComponentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FinanceFeeComponentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FinanceFeeComponentGroupByOutputType[P]>
            : GetScalarType<T[P], FinanceFeeComponentGroupByOutputType[P]>
        }
      >
    >


  export type FinanceFeeComponentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    feeStructureId?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    amount?: boolean
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeComponent"]>

  export type FinanceFeeComponentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    feeStructureId?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    amount?: boolean
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeComponent"]>

  export type FinanceFeeComponentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    feeStructureId?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    amount?: boolean
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeComponent"]>

  export type FinanceFeeComponentSelectScalar = {
    id?: boolean
    feeStructureId?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    amount?: boolean
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FinanceFeeComponentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "feeStructureId" | "code" | "name" | "description" | "amount" | "isOptional" | "visibleToStudent" | "visibleToParent" | "sortOrder" | "createdAt" | "updatedAt", ExtArgs["result"]["financeFeeComponent"]>
  export type FinanceFeeComponentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }
  export type FinanceFeeComponentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }
  export type FinanceFeeComponentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }

  export type $FinanceFeeComponentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FinanceFeeComponent"
    objects: {
      feeStructure: Prisma.$FinanceFeeStructurePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      feeStructureId: string
      code: string
      name: string
      description: string | null
      amount: number
      isOptional: boolean
      visibleToStudent: boolean
      visibleToParent: boolean
      sortOrder: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["financeFeeComponent"]>
    composites: {}
  }

  type FinanceFeeComponentGetPayload<S extends boolean | null | undefined | FinanceFeeComponentDefaultArgs> = $Result.GetResult<Prisma.$FinanceFeeComponentPayload, S>

  type FinanceFeeComponentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FinanceFeeComponentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FinanceFeeComponentCountAggregateInputType | true
    }

  export interface FinanceFeeComponentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FinanceFeeComponent'], meta: { name: 'FinanceFeeComponent' } }
    /**
     * Find zero or one FinanceFeeComponent that matches the filter.
     * @param {FinanceFeeComponentFindUniqueArgs} args - Arguments to find a FinanceFeeComponent
     * @example
     * // Get one FinanceFeeComponent
     * const financeFeeComponent = await prisma.financeFeeComponent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FinanceFeeComponentFindUniqueArgs>(args: SelectSubset<T, FinanceFeeComponentFindUniqueArgs<ExtArgs>>): Prisma__FinanceFeeComponentClient<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FinanceFeeComponent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FinanceFeeComponentFindUniqueOrThrowArgs} args - Arguments to find a FinanceFeeComponent
     * @example
     * // Get one FinanceFeeComponent
     * const financeFeeComponent = await prisma.financeFeeComponent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FinanceFeeComponentFindUniqueOrThrowArgs>(args: SelectSubset<T, FinanceFeeComponentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FinanceFeeComponentClient<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FinanceFeeComponent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeComponentFindFirstArgs} args - Arguments to find a FinanceFeeComponent
     * @example
     * // Get one FinanceFeeComponent
     * const financeFeeComponent = await prisma.financeFeeComponent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FinanceFeeComponentFindFirstArgs>(args?: SelectSubset<T, FinanceFeeComponentFindFirstArgs<ExtArgs>>): Prisma__FinanceFeeComponentClient<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FinanceFeeComponent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeComponentFindFirstOrThrowArgs} args - Arguments to find a FinanceFeeComponent
     * @example
     * // Get one FinanceFeeComponent
     * const financeFeeComponent = await prisma.financeFeeComponent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FinanceFeeComponentFindFirstOrThrowArgs>(args?: SelectSubset<T, FinanceFeeComponentFindFirstOrThrowArgs<ExtArgs>>): Prisma__FinanceFeeComponentClient<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FinanceFeeComponents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeComponentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FinanceFeeComponents
     * const financeFeeComponents = await prisma.financeFeeComponent.findMany()
     * 
     * // Get first 10 FinanceFeeComponents
     * const financeFeeComponents = await prisma.financeFeeComponent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const financeFeeComponentWithIdOnly = await prisma.financeFeeComponent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FinanceFeeComponentFindManyArgs>(args?: SelectSubset<T, FinanceFeeComponentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FinanceFeeComponent.
     * @param {FinanceFeeComponentCreateArgs} args - Arguments to create a FinanceFeeComponent.
     * @example
     * // Create one FinanceFeeComponent
     * const FinanceFeeComponent = await prisma.financeFeeComponent.create({
     *   data: {
     *     // ... data to create a FinanceFeeComponent
     *   }
     * })
     * 
     */
    create<T extends FinanceFeeComponentCreateArgs>(args: SelectSubset<T, FinanceFeeComponentCreateArgs<ExtArgs>>): Prisma__FinanceFeeComponentClient<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FinanceFeeComponents.
     * @param {FinanceFeeComponentCreateManyArgs} args - Arguments to create many FinanceFeeComponents.
     * @example
     * // Create many FinanceFeeComponents
     * const financeFeeComponent = await prisma.financeFeeComponent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FinanceFeeComponentCreateManyArgs>(args?: SelectSubset<T, FinanceFeeComponentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FinanceFeeComponents and returns the data saved in the database.
     * @param {FinanceFeeComponentCreateManyAndReturnArgs} args - Arguments to create many FinanceFeeComponents.
     * @example
     * // Create many FinanceFeeComponents
     * const financeFeeComponent = await prisma.financeFeeComponent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FinanceFeeComponents and only return the `id`
     * const financeFeeComponentWithIdOnly = await prisma.financeFeeComponent.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FinanceFeeComponentCreateManyAndReturnArgs>(args?: SelectSubset<T, FinanceFeeComponentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FinanceFeeComponent.
     * @param {FinanceFeeComponentDeleteArgs} args - Arguments to delete one FinanceFeeComponent.
     * @example
     * // Delete one FinanceFeeComponent
     * const FinanceFeeComponent = await prisma.financeFeeComponent.delete({
     *   where: {
     *     // ... filter to delete one FinanceFeeComponent
     *   }
     * })
     * 
     */
    delete<T extends FinanceFeeComponentDeleteArgs>(args: SelectSubset<T, FinanceFeeComponentDeleteArgs<ExtArgs>>): Prisma__FinanceFeeComponentClient<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FinanceFeeComponent.
     * @param {FinanceFeeComponentUpdateArgs} args - Arguments to update one FinanceFeeComponent.
     * @example
     * // Update one FinanceFeeComponent
     * const financeFeeComponent = await prisma.financeFeeComponent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FinanceFeeComponentUpdateArgs>(args: SelectSubset<T, FinanceFeeComponentUpdateArgs<ExtArgs>>): Prisma__FinanceFeeComponentClient<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FinanceFeeComponents.
     * @param {FinanceFeeComponentDeleteManyArgs} args - Arguments to filter FinanceFeeComponents to delete.
     * @example
     * // Delete a few FinanceFeeComponents
     * const { count } = await prisma.financeFeeComponent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FinanceFeeComponentDeleteManyArgs>(args?: SelectSubset<T, FinanceFeeComponentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FinanceFeeComponents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeComponentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FinanceFeeComponents
     * const financeFeeComponent = await prisma.financeFeeComponent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FinanceFeeComponentUpdateManyArgs>(args: SelectSubset<T, FinanceFeeComponentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FinanceFeeComponents and returns the data updated in the database.
     * @param {FinanceFeeComponentUpdateManyAndReturnArgs} args - Arguments to update many FinanceFeeComponents.
     * @example
     * // Update many FinanceFeeComponents
     * const financeFeeComponent = await prisma.financeFeeComponent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FinanceFeeComponents and only return the `id`
     * const financeFeeComponentWithIdOnly = await prisma.financeFeeComponent.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FinanceFeeComponentUpdateManyAndReturnArgs>(args: SelectSubset<T, FinanceFeeComponentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FinanceFeeComponent.
     * @param {FinanceFeeComponentUpsertArgs} args - Arguments to update or create a FinanceFeeComponent.
     * @example
     * // Update or create a FinanceFeeComponent
     * const financeFeeComponent = await prisma.financeFeeComponent.upsert({
     *   create: {
     *     // ... data to create a FinanceFeeComponent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FinanceFeeComponent we want to update
     *   }
     * })
     */
    upsert<T extends FinanceFeeComponentUpsertArgs>(args: SelectSubset<T, FinanceFeeComponentUpsertArgs<ExtArgs>>): Prisma__FinanceFeeComponentClient<$Result.GetResult<Prisma.$FinanceFeeComponentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FinanceFeeComponents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeComponentCountArgs} args - Arguments to filter FinanceFeeComponents to count.
     * @example
     * // Count the number of FinanceFeeComponents
     * const count = await prisma.financeFeeComponent.count({
     *   where: {
     *     // ... the filter for the FinanceFeeComponents we want to count
     *   }
     * })
    **/
    count<T extends FinanceFeeComponentCountArgs>(
      args?: Subset<T, FinanceFeeComponentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FinanceFeeComponentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FinanceFeeComponent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeComponentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FinanceFeeComponentAggregateArgs>(args: Subset<T, FinanceFeeComponentAggregateArgs>): Prisma.PrismaPromise<GetFinanceFeeComponentAggregateType<T>>

    /**
     * Group by FinanceFeeComponent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeComponentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FinanceFeeComponentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FinanceFeeComponentGroupByArgs['orderBy'] }
        : { orderBy?: FinanceFeeComponentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FinanceFeeComponentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFinanceFeeComponentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FinanceFeeComponent model
   */
  readonly fields: FinanceFeeComponentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FinanceFeeComponent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FinanceFeeComponentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    feeStructure<T extends FinanceFeeStructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FinanceFeeStructureDefaultArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FinanceFeeComponent model
   */
  interface FinanceFeeComponentFieldRefs {
    readonly id: FieldRef<"FinanceFeeComponent", 'String'>
    readonly feeStructureId: FieldRef<"FinanceFeeComponent", 'String'>
    readonly code: FieldRef<"FinanceFeeComponent", 'String'>
    readonly name: FieldRef<"FinanceFeeComponent", 'String'>
    readonly description: FieldRef<"FinanceFeeComponent", 'String'>
    readonly amount: FieldRef<"FinanceFeeComponent", 'Int'>
    readonly isOptional: FieldRef<"FinanceFeeComponent", 'Boolean'>
    readonly visibleToStudent: FieldRef<"FinanceFeeComponent", 'Boolean'>
    readonly visibleToParent: FieldRef<"FinanceFeeComponent", 'Boolean'>
    readonly sortOrder: FieldRef<"FinanceFeeComponent", 'Int'>
    readonly createdAt: FieldRef<"FinanceFeeComponent", 'DateTime'>
    readonly updatedAt: FieldRef<"FinanceFeeComponent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FinanceFeeComponent findUnique
   */
  export type FinanceFeeComponentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeComponent to fetch.
     */
    where: FinanceFeeComponentWhereUniqueInput
  }

  /**
   * FinanceFeeComponent findUniqueOrThrow
   */
  export type FinanceFeeComponentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeComponent to fetch.
     */
    where: FinanceFeeComponentWhereUniqueInput
  }

  /**
   * FinanceFeeComponent findFirst
   */
  export type FinanceFeeComponentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeComponent to fetch.
     */
    where?: FinanceFeeComponentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeComponents to fetch.
     */
    orderBy?: FinanceFeeComponentOrderByWithRelationInput | FinanceFeeComponentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FinanceFeeComponents.
     */
    cursor?: FinanceFeeComponentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeComponents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeComponents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FinanceFeeComponents.
     */
    distinct?: FinanceFeeComponentScalarFieldEnum | FinanceFeeComponentScalarFieldEnum[]
  }

  /**
   * FinanceFeeComponent findFirstOrThrow
   */
  export type FinanceFeeComponentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeComponent to fetch.
     */
    where?: FinanceFeeComponentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeComponents to fetch.
     */
    orderBy?: FinanceFeeComponentOrderByWithRelationInput | FinanceFeeComponentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FinanceFeeComponents.
     */
    cursor?: FinanceFeeComponentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeComponents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeComponents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FinanceFeeComponents.
     */
    distinct?: FinanceFeeComponentScalarFieldEnum | FinanceFeeComponentScalarFieldEnum[]
  }

  /**
   * FinanceFeeComponent findMany
   */
  export type FinanceFeeComponentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeComponents to fetch.
     */
    where?: FinanceFeeComponentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeComponents to fetch.
     */
    orderBy?: FinanceFeeComponentOrderByWithRelationInput | FinanceFeeComponentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FinanceFeeComponents.
     */
    cursor?: FinanceFeeComponentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeComponents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeComponents.
     */
    skip?: number
    distinct?: FinanceFeeComponentScalarFieldEnum | FinanceFeeComponentScalarFieldEnum[]
  }

  /**
   * FinanceFeeComponent create
   */
  export type FinanceFeeComponentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * The data needed to create a FinanceFeeComponent.
     */
    data: XOR<FinanceFeeComponentCreateInput, FinanceFeeComponentUncheckedCreateInput>
  }

  /**
   * FinanceFeeComponent createMany
   */
  export type FinanceFeeComponentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FinanceFeeComponents.
     */
    data: FinanceFeeComponentCreateManyInput | FinanceFeeComponentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FinanceFeeComponent createManyAndReturn
   */
  export type FinanceFeeComponentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * The data used to create many FinanceFeeComponents.
     */
    data: FinanceFeeComponentCreateManyInput | FinanceFeeComponentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FinanceFeeComponent update
   */
  export type FinanceFeeComponentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * The data needed to update a FinanceFeeComponent.
     */
    data: XOR<FinanceFeeComponentUpdateInput, FinanceFeeComponentUncheckedUpdateInput>
    /**
     * Choose, which FinanceFeeComponent to update.
     */
    where: FinanceFeeComponentWhereUniqueInput
  }

  /**
   * FinanceFeeComponent updateMany
   */
  export type FinanceFeeComponentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FinanceFeeComponents.
     */
    data: XOR<FinanceFeeComponentUpdateManyMutationInput, FinanceFeeComponentUncheckedUpdateManyInput>
    /**
     * Filter which FinanceFeeComponents to update
     */
    where?: FinanceFeeComponentWhereInput
    /**
     * Limit how many FinanceFeeComponents to update.
     */
    limit?: number
  }

  /**
   * FinanceFeeComponent updateManyAndReturn
   */
  export type FinanceFeeComponentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * The data used to update FinanceFeeComponents.
     */
    data: XOR<FinanceFeeComponentUpdateManyMutationInput, FinanceFeeComponentUncheckedUpdateManyInput>
    /**
     * Filter which FinanceFeeComponents to update
     */
    where?: FinanceFeeComponentWhereInput
    /**
     * Limit how many FinanceFeeComponents to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FinanceFeeComponent upsert
   */
  export type FinanceFeeComponentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * The filter to search for the FinanceFeeComponent to update in case it exists.
     */
    where: FinanceFeeComponentWhereUniqueInput
    /**
     * In case the FinanceFeeComponent found by the `where` argument doesn't exist, create a new FinanceFeeComponent with this data.
     */
    create: XOR<FinanceFeeComponentCreateInput, FinanceFeeComponentUncheckedCreateInput>
    /**
     * In case the FinanceFeeComponent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FinanceFeeComponentUpdateInput, FinanceFeeComponentUncheckedUpdateInput>
  }

  /**
   * FinanceFeeComponent delete
   */
  export type FinanceFeeComponentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
    /**
     * Filter which FinanceFeeComponent to delete.
     */
    where: FinanceFeeComponentWhereUniqueInput
  }

  /**
   * FinanceFeeComponent deleteMany
   */
  export type FinanceFeeComponentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FinanceFeeComponents to delete
     */
    where?: FinanceFeeComponentWhereInput
    /**
     * Limit how many FinanceFeeComponents to delete.
     */
    limit?: number
  }

  /**
   * FinanceFeeComponent without action
   */
  export type FinanceFeeComponentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeComponent
     */
    select?: FinanceFeeComponentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeComponent
     */
    omit?: FinanceFeeComponentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeComponentInclude<ExtArgs> | null
  }


  /**
   * Model FinanceFeeApproval
   */

  export type AggregateFinanceFeeApproval = {
    _count: FinanceFeeApprovalCountAggregateOutputType | null
    _min: FinanceFeeApprovalMinAggregateOutputType | null
    _max: FinanceFeeApprovalMaxAggregateOutputType | null
  }

  export type FinanceFeeApprovalMinAggregateOutputType = {
    id: string | null
    feeStructureId: string | null
    action: string | null
    status: $Enums.FinanceApprovalStatus | null
    notes: string | null
    actorId: string | null
    actorName: string | null
    actorRole: string | null
    createdAt: Date | null
  }

  export type FinanceFeeApprovalMaxAggregateOutputType = {
    id: string | null
    feeStructureId: string | null
    action: string | null
    status: $Enums.FinanceApprovalStatus | null
    notes: string | null
    actorId: string | null
    actorName: string | null
    actorRole: string | null
    createdAt: Date | null
  }

  export type FinanceFeeApprovalCountAggregateOutputType = {
    id: number
    feeStructureId: number
    action: number
    status: number
    notes: number
    actorId: number
    actorName: number
    actorRole: number
    createdAt: number
    _all: number
  }


  export type FinanceFeeApprovalMinAggregateInputType = {
    id?: true
    feeStructureId?: true
    action?: true
    status?: true
    notes?: true
    actorId?: true
    actorName?: true
    actorRole?: true
    createdAt?: true
  }

  export type FinanceFeeApprovalMaxAggregateInputType = {
    id?: true
    feeStructureId?: true
    action?: true
    status?: true
    notes?: true
    actorId?: true
    actorName?: true
    actorRole?: true
    createdAt?: true
  }

  export type FinanceFeeApprovalCountAggregateInputType = {
    id?: true
    feeStructureId?: true
    action?: true
    status?: true
    notes?: true
    actorId?: true
    actorName?: true
    actorRole?: true
    createdAt?: true
    _all?: true
  }

  export type FinanceFeeApprovalAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FinanceFeeApproval to aggregate.
     */
    where?: FinanceFeeApprovalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeApprovals to fetch.
     */
    orderBy?: FinanceFeeApprovalOrderByWithRelationInput | FinanceFeeApprovalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FinanceFeeApprovalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeApprovals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeApprovals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FinanceFeeApprovals
    **/
    _count?: true | FinanceFeeApprovalCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FinanceFeeApprovalMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FinanceFeeApprovalMaxAggregateInputType
  }

  export type GetFinanceFeeApprovalAggregateType<T extends FinanceFeeApprovalAggregateArgs> = {
        [P in keyof T & keyof AggregateFinanceFeeApproval]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFinanceFeeApproval[P]>
      : GetScalarType<T[P], AggregateFinanceFeeApproval[P]>
  }




  export type FinanceFeeApprovalGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FinanceFeeApprovalWhereInput
    orderBy?: FinanceFeeApprovalOrderByWithAggregationInput | FinanceFeeApprovalOrderByWithAggregationInput[]
    by: FinanceFeeApprovalScalarFieldEnum[] | FinanceFeeApprovalScalarFieldEnum
    having?: FinanceFeeApprovalScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FinanceFeeApprovalCountAggregateInputType | true
    _min?: FinanceFeeApprovalMinAggregateInputType
    _max?: FinanceFeeApprovalMaxAggregateInputType
  }

  export type FinanceFeeApprovalGroupByOutputType = {
    id: string
    feeStructureId: string
    action: string
    status: $Enums.FinanceApprovalStatus
    notes: string | null
    actorId: string | null
    actorName: string | null
    actorRole: string | null
    createdAt: Date
    _count: FinanceFeeApprovalCountAggregateOutputType | null
    _min: FinanceFeeApprovalMinAggregateOutputType | null
    _max: FinanceFeeApprovalMaxAggregateOutputType | null
  }

  type GetFinanceFeeApprovalGroupByPayload<T extends FinanceFeeApprovalGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FinanceFeeApprovalGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FinanceFeeApprovalGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FinanceFeeApprovalGroupByOutputType[P]>
            : GetScalarType<T[P], FinanceFeeApprovalGroupByOutputType[P]>
        }
      >
    >


  export type FinanceFeeApprovalSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    feeStructureId?: boolean
    action?: boolean
    status?: boolean
    notes?: boolean
    actorId?: boolean
    actorName?: boolean
    actorRole?: boolean
    createdAt?: boolean
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeApproval"]>

  export type FinanceFeeApprovalSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    feeStructureId?: boolean
    action?: boolean
    status?: boolean
    notes?: boolean
    actorId?: boolean
    actorName?: boolean
    actorRole?: boolean
    createdAt?: boolean
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeApproval"]>

  export type FinanceFeeApprovalSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    feeStructureId?: boolean
    action?: boolean
    status?: boolean
    notes?: boolean
    actorId?: boolean
    actorName?: boolean
    actorRole?: boolean
    createdAt?: boolean
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["financeFeeApproval"]>

  export type FinanceFeeApprovalSelectScalar = {
    id?: boolean
    feeStructureId?: boolean
    action?: boolean
    status?: boolean
    notes?: boolean
    actorId?: boolean
    actorName?: boolean
    actorRole?: boolean
    createdAt?: boolean
  }

  export type FinanceFeeApprovalOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "feeStructureId" | "action" | "status" | "notes" | "actorId" | "actorName" | "actorRole" | "createdAt", ExtArgs["result"]["financeFeeApproval"]>
  export type FinanceFeeApprovalInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }
  export type FinanceFeeApprovalIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }
  export type FinanceFeeApprovalIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    feeStructure?: boolean | FinanceFeeStructureDefaultArgs<ExtArgs>
  }

  export type $FinanceFeeApprovalPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FinanceFeeApproval"
    objects: {
      feeStructure: Prisma.$FinanceFeeStructurePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      feeStructureId: string
      action: string
      status: $Enums.FinanceApprovalStatus
      notes: string | null
      actorId: string | null
      actorName: string | null
      actorRole: string | null
      createdAt: Date
    }, ExtArgs["result"]["financeFeeApproval"]>
    composites: {}
  }

  type FinanceFeeApprovalGetPayload<S extends boolean | null | undefined | FinanceFeeApprovalDefaultArgs> = $Result.GetResult<Prisma.$FinanceFeeApprovalPayload, S>

  type FinanceFeeApprovalCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FinanceFeeApprovalFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FinanceFeeApprovalCountAggregateInputType | true
    }

  export interface FinanceFeeApprovalDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FinanceFeeApproval'], meta: { name: 'FinanceFeeApproval' } }
    /**
     * Find zero or one FinanceFeeApproval that matches the filter.
     * @param {FinanceFeeApprovalFindUniqueArgs} args - Arguments to find a FinanceFeeApproval
     * @example
     * // Get one FinanceFeeApproval
     * const financeFeeApproval = await prisma.financeFeeApproval.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FinanceFeeApprovalFindUniqueArgs>(args: SelectSubset<T, FinanceFeeApprovalFindUniqueArgs<ExtArgs>>): Prisma__FinanceFeeApprovalClient<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FinanceFeeApproval that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FinanceFeeApprovalFindUniqueOrThrowArgs} args - Arguments to find a FinanceFeeApproval
     * @example
     * // Get one FinanceFeeApproval
     * const financeFeeApproval = await prisma.financeFeeApproval.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FinanceFeeApprovalFindUniqueOrThrowArgs>(args: SelectSubset<T, FinanceFeeApprovalFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FinanceFeeApprovalClient<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FinanceFeeApproval that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeApprovalFindFirstArgs} args - Arguments to find a FinanceFeeApproval
     * @example
     * // Get one FinanceFeeApproval
     * const financeFeeApproval = await prisma.financeFeeApproval.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FinanceFeeApprovalFindFirstArgs>(args?: SelectSubset<T, FinanceFeeApprovalFindFirstArgs<ExtArgs>>): Prisma__FinanceFeeApprovalClient<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FinanceFeeApproval that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeApprovalFindFirstOrThrowArgs} args - Arguments to find a FinanceFeeApproval
     * @example
     * // Get one FinanceFeeApproval
     * const financeFeeApproval = await prisma.financeFeeApproval.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FinanceFeeApprovalFindFirstOrThrowArgs>(args?: SelectSubset<T, FinanceFeeApprovalFindFirstOrThrowArgs<ExtArgs>>): Prisma__FinanceFeeApprovalClient<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FinanceFeeApprovals that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeApprovalFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FinanceFeeApprovals
     * const financeFeeApprovals = await prisma.financeFeeApproval.findMany()
     * 
     * // Get first 10 FinanceFeeApprovals
     * const financeFeeApprovals = await prisma.financeFeeApproval.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const financeFeeApprovalWithIdOnly = await prisma.financeFeeApproval.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FinanceFeeApprovalFindManyArgs>(args?: SelectSubset<T, FinanceFeeApprovalFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FinanceFeeApproval.
     * @param {FinanceFeeApprovalCreateArgs} args - Arguments to create a FinanceFeeApproval.
     * @example
     * // Create one FinanceFeeApproval
     * const FinanceFeeApproval = await prisma.financeFeeApproval.create({
     *   data: {
     *     // ... data to create a FinanceFeeApproval
     *   }
     * })
     * 
     */
    create<T extends FinanceFeeApprovalCreateArgs>(args: SelectSubset<T, FinanceFeeApprovalCreateArgs<ExtArgs>>): Prisma__FinanceFeeApprovalClient<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FinanceFeeApprovals.
     * @param {FinanceFeeApprovalCreateManyArgs} args - Arguments to create many FinanceFeeApprovals.
     * @example
     * // Create many FinanceFeeApprovals
     * const financeFeeApproval = await prisma.financeFeeApproval.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FinanceFeeApprovalCreateManyArgs>(args?: SelectSubset<T, FinanceFeeApprovalCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FinanceFeeApprovals and returns the data saved in the database.
     * @param {FinanceFeeApprovalCreateManyAndReturnArgs} args - Arguments to create many FinanceFeeApprovals.
     * @example
     * // Create many FinanceFeeApprovals
     * const financeFeeApproval = await prisma.financeFeeApproval.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FinanceFeeApprovals and only return the `id`
     * const financeFeeApprovalWithIdOnly = await prisma.financeFeeApproval.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FinanceFeeApprovalCreateManyAndReturnArgs>(args?: SelectSubset<T, FinanceFeeApprovalCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FinanceFeeApproval.
     * @param {FinanceFeeApprovalDeleteArgs} args - Arguments to delete one FinanceFeeApproval.
     * @example
     * // Delete one FinanceFeeApproval
     * const FinanceFeeApproval = await prisma.financeFeeApproval.delete({
     *   where: {
     *     // ... filter to delete one FinanceFeeApproval
     *   }
     * })
     * 
     */
    delete<T extends FinanceFeeApprovalDeleteArgs>(args: SelectSubset<T, FinanceFeeApprovalDeleteArgs<ExtArgs>>): Prisma__FinanceFeeApprovalClient<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FinanceFeeApproval.
     * @param {FinanceFeeApprovalUpdateArgs} args - Arguments to update one FinanceFeeApproval.
     * @example
     * // Update one FinanceFeeApproval
     * const financeFeeApproval = await prisma.financeFeeApproval.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FinanceFeeApprovalUpdateArgs>(args: SelectSubset<T, FinanceFeeApprovalUpdateArgs<ExtArgs>>): Prisma__FinanceFeeApprovalClient<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FinanceFeeApprovals.
     * @param {FinanceFeeApprovalDeleteManyArgs} args - Arguments to filter FinanceFeeApprovals to delete.
     * @example
     * // Delete a few FinanceFeeApprovals
     * const { count } = await prisma.financeFeeApproval.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FinanceFeeApprovalDeleteManyArgs>(args?: SelectSubset<T, FinanceFeeApprovalDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FinanceFeeApprovals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeApprovalUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FinanceFeeApprovals
     * const financeFeeApproval = await prisma.financeFeeApproval.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FinanceFeeApprovalUpdateManyArgs>(args: SelectSubset<T, FinanceFeeApprovalUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FinanceFeeApprovals and returns the data updated in the database.
     * @param {FinanceFeeApprovalUpdateManyAndReturnArgs} args - Arguments to update many FinanceFeeApprovals.
     * @example
     * // Update many FinanceFeeApprovals
     * const financeFeeApproval = await prisma.financeFeeApproval.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FinanceFeeApprovals and only return the `id`
     * const financeFeeApprovalWithIdOnly = await prisma.financeFeeApproval.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FinanceFeeApprovalUpdateManyAndReturnArgs>(args: SelectSubset<T, FinanceFeeApprovalUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FinanceFeeApproval.
     * @param {FinanceFeeApprovalUpsertArgs} args - Arguments to update or create a FinanceFeeApproval.
     * @example
     * // Update or create a FinanceFeeApproval
     * const financeFeeApproval = await prisma.financeFeeApproval.upsert({
     *   create: {
     *     // ... data to create a FinanceFeeApproval
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FinanceFeeApproval we want to update
     *   }
     * })
     */
    upsert<T extends FinanceFeeApprovalUpsertArgs>(args: SelectSubset<T, FinanceFeeApprovalUpsertArgs<ExtArgs>>): Prisma__FinanceFeeApprovalClient<$Result.GetResult<Prisma.$FinanceFeeApprovalPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FinanceFeeApprovals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeApprovalCountArgs} args - Arguments to filter FinanceFeeApprovals to count.
     * @example
     * // Count the number of FinanceFeeApprovals
     * const count = await prisma.financeFeeApproval.count({
     *   where: {
     *     // ... the filter for the FinanceFeeApprovals we want to count
     *   }
     * })
    **/
    count<T extends FinanceFeeApprovalCountArgs>(
      args?: Subset<T, FinanceFeeApprovalCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FinanceFeeApprovalCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FinanceFeeApproval.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeApprovalAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FinanceFeeApprovalAggregateArgs>(args: Subset<T, FinanceFeeApprovalAggregateArgs>): Prisma.PrismaPromise<GetFinanceFeeApprovalAggregateType<T>>

    /**
     * Group by FinanceFeeApproval.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FinanceFeeApprovalGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FinanceFeeApprovalGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FinanceFeeApprovalGroupByArgs['orderBy'] }
        : { orderBy?: FinanceFeeApprovalGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FinanceFeeApprovalGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFinanceFeeApprovalGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FinanceFeeApproval model
   */
  readonly fields: FinanceFeeApprovalFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FinanceFeeApproval.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FinanceFeeApprovalClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    feeStructure<T extends FinanceFeeStructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FinanceFeeStructureDefaultArgs<ExtArgs>>): Prisma__FinanceFeeStructureClient<$Result.GetResult<Prisma.$FinanceFeeStructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FinanceFeeApproval model
   */
  interface FinanceFeeApprovalFieldRefs {
    readonly id: FieldRef<"FinanceFeeApproval", 'String'>
    readonly feeStructureId: FieldRef<"FinanceFeeApproval", 'String'>
    readonly action: FieldRef<"FinanceFeeApproval", 'String'>
    readonly status: FieldRef<"FinanceFeeApproval", 'FinanceApprovalStatus'>
    readonly notes: FieldRef<"FinanceFeeApproval", 'String'>
    readonly actorId: FieldRef<"FinanceFeeApproval", 'String'>
    readonly actorName: FieldRef<"FinanceFeeApproval", 'String'>
    readonly actorRole: FieldRef<"FinanceFeeApproval", 'String'>
    readonly createdAt: FieldRef<"FinanceFeeApproval", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FinanceFeeApproval findUnique
   */
  export type FinanceFeeApprovalFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeApproval to fetch.
     */
    where: FinanceFeeApprovalWhereUniqueInput
  }

  /**
   * FinanceFeeApproval findUniqueOrThrow
   */
  export type FinanceFeeApprovalFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeApproval to fetch.
     */
    where: FinanceFeeApprovalWhereUniqueInput
  }

  /**
   * FinanceFeeApproval findFirst
   */
  export type FinanceFeeApprovalFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeApproval to fetch.
     */
    where?: FinanceFeeApprovalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeApprovals to fetch.
     */
    orderBy?: FinanceFeeApprovalOrderByWithRelationInput | FinanceFeeApprovalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FinanceFeeApprovals.
     */
    cursor?: FinanceFeeApprovalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeApprovals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeApprovals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FinanceFeeApprovals.
     */
    distinct?: FinanceFeeApprovalScalarFieldEnum | FinanceFeeApprovalScalarFieldEnum[]
  }

  /**
   * FinanceFeeApproval findFirstOrThrow
   */
  export type FinanceFeeApprovalFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeApproval to fetch.
     */
    where?: FinanceFeeApprovalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeApprovals to fetch.
     */
    orderBy?: FinanceFeeApprovalOrderByWithRelationInput | FinanceFeeApprovalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FinanceFeeApprovals.
     */
    cursor?: FinanceFeeApprovalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeApprovals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeApprovals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FinanceFeeApprovals.
     */
    distinct?: FinanceFeeApprovalScalarFieldEnum | FinanceFeeApprovalScalarFieldEnum[]
  }

  /**
   * FinanceFeeApproval findMany
   */
  export type FinanceFeeApprovalFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * Filter, which FinanceFeeApprovals to fetch.
     */
    where?: FinanceFeeApprovalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FinanceFeeApprovals to fetch.
     */
    orderBy?: FinanceFeeApprovalOrderByWithRelationInput | FinanceFeeApprovalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FinanceFeeApprovals.
     */
    cursor?: FinanceFeeApprovalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FinanceFeeApprovals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FinanceFeeApprovals.
     */
    skip?: number
    distinct?: FinanceFeeApprovalScalarFieldEnum | FinanceFeeApprovalScalarFieldEnum[]
  }

  /**
   * FinanceFeeApproval create
   */
  export type FinanceFeeApprovalCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * The data needed to create a FinanceFeeApproval.
     */
    data: XOR<FinanceFeeApprovalCreateInput, FinanceFeeApprovalUncheckedCreateInput>
  }

  /**
   * FinanceFeeApproval createMany
   */
  export type FinanceFeeApprovalCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FinanceFeeApprovals.
     */
    data: FinanceFeeApprovalCreateManyInput | FinanceFeeApprovalCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FinanceFeeApproval createManyAndReturn
   */
  export type FinanceFeeApprovalCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * The data used to create many FinanceFeeApprovals.
     */
    data: FinanceFeeApprovalCreateManyInput | FinanceFeeApprovalCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FinanceFeeApproval update
   */
  export type FinanceFeeApprovalUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * The data needed to update a FinanceFeeApproval.
     */
    data: XOR<FinanceFeeApprovalUpdateInput, FinanceFeeApprovalUncheckedUpdateInput>
    /**
     * Choose, which FinanceFeeApproval to update.
     */
    where: FinanceFeeApprovalWhereUniqueInput
  }

  /**
   * FinanceFeeApproval updateMany
   */
  export type FinanceFeeApprovalUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FinanceFeeApprovals.
     */
    data: XOR<FinanceFeeApprovalUpdateManyMutationInput, FinanceFeeApprovalUncheckedUpdateManyInput>
    /**
     * Filter which FinanceFeeApprovals to update
     */
    where?: FinanceFeeApprovalWhereInput
    /**
     * Limit how many FinanceFeeApprovals to update.
     */
    limit?: number
  }

  /**
   * FinanceFeeApproval updateManyAndReturn
   */
  export type FinanceFeeApprovalUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * The data used to update FinanceFeeApprovals.
     */
    data: XOR<FinanceFeeApprovalUpdateManyMutationInput, FinanceFeeApprovalUncheckedUpdateManyInput>
    /**
     * Filter which FinanceFeeApprovals to update
     */
    where?: FinanceFeeApprovalWhereInput
    /**
     * Limit how many FinanceFeeApprovals to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FinanceFeeApproval upsert
   */
  export type FinanceFeeApprovalUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * The filter to search for the FinanceFeeApproval to update in case it exists.
     */
    where: FinanceFeeApprovalWhereUniqueInput
    /**
     * In case the FinanceFeeApproval found by the `where` argument doesn't exist, create a new FinanceFeeApproval with this data.
     */
    create: XOR<FinanceFeeApprovalCreateInput, FinanceFeeApprovalUncheckedCreateInput>
    /**
     * In case the FinanceFeeApproval was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FinanceFeeApprovalUpdateInput, FinanceFeeApprovalUncheckedUpdateInput>
  }

  /**
   * FinanceFeeApproval delete
   */
  export type FinanceFeeApprovalDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
    /**
     * Filter which FinanceFeeApproval to delete.
     */
    where: FinanceFeeApprovalWhereUniqueInput
  }

  /**
   * FinanceFeeApproval deleteMany
   */
  export type FinanceFeeApprovalDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FinanceFeeApprovals to delete
     */
    where?: FinanceFeeApprovalWhereInput
    /**
     * Limit how many FinanceFeeApprovals to delete.
     */
    limit?: number
  }

  /**
   * FinanceFeeApproval without action
   */
  export type FinanceFeeApprovalDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FinanceFeeApproval
     */
    select?: FinanceFeeApprovalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FinanceFeeApproval
     */
    omit?: FinanceFeeApprovalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FinanceFeeApprovalInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    password: 'password',
    role: 'role',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const ClassScalarFieldEnum: {
    id: 'id',
    name: 'name',
    section: 'section',
    order: 'order',
    createdAt: 'createdAt'
  };

  export type ClassScalarFieldEnum = (typeof ClassScalarFieldEnum)[keyof typeof ClassScalarFieldEnum]


  export const StudentScalarFieldEnum: {
    id: 'id',
    name: 'name',
    classId: 'classId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type StudentScalarFieldEnum = (typeof StudentScalarFieldEnum)[keyof typeof StudentScalarFieldEnum]


  export const TermLockScalarFieldEnum: {
    id: 'id',
    classId: 'classId',
    session: 'session',
    term: 'term',
    status: 'status',
    lockedBy: 'lockedBy',
    lockedAt: 'lockedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TermLockScalarFieldEnum = (typeof TermLockScalarFieldEnum)[keyof typeof TermLockScalarFieldEnum]


  export const ResultScalarFieldEnum: {
    id: 'id',
    studentId: 'studentId',
    session: 'session',
    term: 'term',
    subject: 'subject',
    score: 'score',
    date: 'date',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ResultScalarFieldEnum = (typeof ResultScalarFieldEnum)[keyof typeof ResultScalarFieldEnum]


  export const ReportMetaScalarFieldEnum: {
    id: 'id',
    studentId: 'studentId',
    session: 'session',
    term: 'term',
    nextTermBegins: 'nextTermBegins',
    teacherComment: 'teacherComment',
    headTeacherComment: 'headTeacherComment',
    present: 'present',
    absent: 'absent',
    total: 'total',
    updatedAt: 'updatedAt'
  };

  export type ReportMetaScalarFieldEnum = (typeof ReportMetaScalarFieldEnum)[keyof typeof ReportMetaScalarFieldEnum]


  export const AuditLogScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    action: 'action',
    entity: 'entity',
    entityId: 'entityId',
    before: 'before',
    after: 'after',
    createdAt: 'createdAt'
  };

  export type AuditLogScalarFieldEnum = (typeof AuditLogScalarFieldEnum)[keyof typeof AuditLogScalarFieldEnum]


  export const FinanceStudentProfileScalarFieldEnum: {
    id: 'id',
    studentId: 'studentId',
    studentType: 'studentType',
    canStudentView: 'canStudentView',
    canParentView: 'canParentView',
    notes: 'notes',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FinanceStudentProfileScalarFieldEnum = (typeof FinanceStudentProfileScalarFieldEnum)[keyof typeof FinanceStudentProfileScalarFieldEnum]


  export const FinanceFeeStructureScalarFieldEnum: {
    id: 'id',
    classId: 'classId',
    session: 'session',
    term: 'term',
    studentType: 'studentType',
    title: 'title',
    description: 'description',
    status: 'status',
    submittedAt: 'submittedAt',
    submittedById: 'submittedById',
    submittedByName: 'submittedByName',
    approvedAt: 'approvedAt',
    approvedById: 'approvedById',
    approvedByName: 'approvedByName',
    rejectedAt: 'rejectedAt',
    rejectedById: 'rejectedById',
    rejectedByName: 'rejectedByName',
    rejectionReason: 'rejectionReason',
    createdById: 'createdById',
    createdByName: 'createdByName',
    updatedById: 'updatedById',
    updatedByName: 'updatedByName',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FinanceFeeStructureScalarFieldEnum = (typeof FinanceFeeStructureScalarFieldEnum)[keyof typeof FinanceFeeStructureScalarFieldEnum]


  export const FinanceFeeComponentScalarFieldEnum: {
    id: 'id',
    feeStructureId: 'feeStructureId',
    code: 'code',
    name: 'name',
    description: 'description',
    amount: 'amount',
    isOptional: 'isOptional',
    visibleToStudent: 'visibleToStudent',
    visibleToParent: 'visibleToParent',
    sortOrder: 'sortOrder',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FinanceFeeComponentScalarFieldEnum = (typeof FinanceFeeComponentScalarFieldEnum)[keyof typeof FinanceFeeComponentScalarFieldEnum]


  export const FinanceFeeApprovalScalarFieldEnum: {
    id: 'id',
    feeStructureId: 'feeStructureId',
    action: 'action',
    status: 'status',
    notes: 'notes',
    actorId: 'actorId',
    actorName: 'actorName',
    actorRole: 'actorRole',
    createdAt: 'createdAt'
  };

  export type FinanceFeeApprovalScalarFieldEnum = (typeof FinanceFeeApprovalScalarFieldEnum)[keyof typeof FinanceFeeApprovalScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Role'
   */
  export type EnumRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Role'>
    


  /**
   * Reference to a field of type 'Role[]'
   */
  export type ListEnumRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Role[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'TermStatus'
   */
  export type EnumTermStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TermStatus'>
    


  /**
   * Reference to a field of type 'TermStatus[]'
   */
  export type ListEnumTermStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TermStatus[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'FinanceApprovalStatus'
   */
  export type EnumFinanceApprovalStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FinanceApprovalStatus'>
    


  /**
   * Reference to a field of type 'FinanceApprovalStatus[]'
   */
  export type ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FinanceApprovalStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    role?: EnumRoleFilter<"User"> | $Enums.Role
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    audits?: AuditLogListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    audits?: AuditLogOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    role?: EnumRoleFilter<"User"> | $Enums.Role
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    audits?: AuditLogListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    password?: StringWithAggregatesFilter<"User"> | string
    role?: EnumRoleWithAggregatesFilter<"User"> | $Enums.Role
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type ClassWhereInput = {
    AND?: ClassWhereInput | ClassWhereInput[]
    OR?: ClassWhereInput[]
    NOT?: ClassWhereInput | ClassWhereInput[]
    id?: StringFilter<"Class"> | string
    name?: StringFilter<"Class"> | string
    section?: StringFilter<"Class"> | string
    order?: IntFilter<"Class"> | number
    createdAt?: DateTimeFilter<"Class"> | Date | string
    students?: StudentListRelationFilter
    termLocks?: TermLockListRelationFilter
    feeStructures?: FinanceFeeStructureListRelationFilter
  }

  export type ClassOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    section?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    students?: StudentOrderByRelationAggregateInput
    termLocks?: TermLockOrderByRelationAggregateInput
    feeStructures?: FinanceFeeStructureOrderByRelationAggregateInput
  }

  export type ClassWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ClassWhereInput | ClassWhereInput[]
    OR?: ClassWhereInput[]
    NOT?: ClassWhereInput | ClassWhereInput[]
    name?: StringFilter<"Class"> | string
    section?: StringFilter<"Class"> | string
    order?: IntFilter<"Class"> | number
    createdAt?: DateTimeFilter<"Class"> | Date | string
    students?: StudentListRelationFilter
    termLocks?: TermLockListRelationFilter
    feeStructures?: FinanceFeeStructureListRelationFilter
  }, "id">

  export type ClassOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    section?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    _count?: ClassCountOrderByAggregateInput
    _avg?: ClassAvgOrderByAggregateInput
    _max?: ClassMaxOrderByAggregateInput
    _min?: ClassMinOrderByAggregateInput
    _sum?: ClassSumOrderByAggregateInput
  }

  export type ClassScalarWhereWithAggregatesInput = {
    AND?: ClassScalarWhereWithAggregatesInput | ClassScalarWhereWithAggregatesInput[]
    OR?: ClassScalarWhereWithAggregatesInput[]
    NOT?: ClassScalarWhereWithAggregatesInput | ClassScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Class"> | string
    name?: StringWithAggregatesFilter<"Class"> | string
    section?: StringWithAggregatesFilter<"Class"> | string
    order?: IntWithAggregatesFilter<"Class"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Class"> | Date | string
  }

  export type StudentWhereInput = {
    AND?: StudentWhereInput | StudentWhereInput[]
    OR?: StudentWhereInput[]
    NOT?: StudentWhereInput | StudentWhereInput[]
    id?: StringFilter<"Student"> | string
    name?: StringFilter<"Student"> | string
    classId?: StringFilter<"Student"> | string
    createdAt?: DateTimeFilter<"Student"> | Date | string
    updatedAt?: DateTimeFilter<"Student"> | Date | string
    class?: XOR<ClassScalarRelationFilter, ClassWhereInput>
    results?: ResultListRelationFilter
    reports?: ReportMetaListRelationFilter
    financeProfile?: XOR<FinanceStudentProfileNullableScalarRelationFilter, FinanceStudentProfileWhereInput> | null
  }

  export type StudentOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    classId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    class?: ClassOrderByWithRelationInput
    results?: ResultOrderByRelationAggregateInput
    reports?: ReportMetaOrderByRelationAggregateInput
    financeProfile?: FinanceStudentProfileOrderByWithRelationInput
  }

  export type StudentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: StudentWhereInput | StudentWhereInput[]
    OR?: StudentWhereInput[]
    NOT?: StudentWhereInput | StudentWhereInput[]
    name?: StringFilter<"Student"> | string
    classId?: StringFilter<"Student"> | string
    createdAt?: DateTimeFilter<"Student"> | Date | string
    updatedAt?: DateTimeFilter<"Student"> | Date | string
    class?: XOR<ClassScalarRelationFilter, ClassWhereInput>
    results?: ResultListRelationFilter
    reports?: ReportMetaListRelationFilter
    financeProfile?: XOR<FinanceStudentProfileNullableScalarRelationFilter, FinanceStudentProfileWhereInput> | null
  }, "id">

  export type StudentOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    classId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: StudentCountOrderByAggregateInput
    _max?: StudentMaxOrderByAggregateInput
    _min?: StudentMinOrderByAggregateInput
  }

  export type StudentScalarWhereWithAggregatesInput = {
    AND?: StudentScalarWhereWithAggregatesInput | StudentScalarWhereWithAggregatesInput[]
    OR?: StudentScalarWhereWithAggregatesInput[]
    NOT?: StudentScalarWhereWithAggregatesInput | StudentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Student"> | string
    name?: StringWithAggregatesFilter<"Student"> | string
    classId?: StringWithAggregatesFilter<"Student"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Student"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Student"> | Date | string
  }

  export type TermLockWhereInput = {
    AND?: TermLockWhereInput | TermLockWhereInput[]
    OR?: TermLockWhereInput[]
    NOT?: TermLockWhereInput | TermLockWhereInput[]
    id?: StringFilter<"TermLock"> | string
    classId?: StringFilter<"TermLock"> | string
    session?: StringFilter<"TermLock"> | string
    term?: StringFilter<"TermLock"> | string
    status?: EnumTermStatusFilter<"TermLock"> | $Enums.TermStatus
    lockedBy?: StringNullableFilter<"TermLock"> | string | null
    lockedAt?: DateTimeNullableFilter<"TermLock"> | Date | string | null
    createdAt?: DateTimeFilter<"TermLock"> | Date | string
    updatedAt?: DateTimeFilter<"TermLock"> | Date | string
    class?: XOR<ClassScalarRelationFilter, ClassWhereInput>
  }

  export type TermLockOrderByWithRelationInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    status?: SortOrder
    lockedBy?: SortOrderInput | SortOrder
    lockedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    class?: ClassOrderByWithRelationInput
  }

  export type TermLockWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    classId_session_term?: TermLockClassIdSessionTermCompoundUniqueInput
    AND?: TermLockWhereInput | TermLockWhereInput[]
    OR?: TermLockWhereInput[]
    NOT?: TermLockWhereInput | TermLockWhereInput[]
    classId?: StringFilter<"TermLock"> | string
    session?: StringFilter<"TermLock"> | string
    term?: StringFilter<"TermLock"> | string
    status?: EnumTermStatusFilter<"TermLock"> | $Enums.TermStatus
    lockedBy?: StringNullableFilter<"TermLock"> | string | null
    lockedAt?: DateTimeNullableFilter<"TermLock"> | Date | string | null
    createdAt?: DateTimeFilter<"TermLock"> | Date | string
    updatedAt?: DateTimeFilter<"TermLock"> | Date | string
    class?: XOR<ClassScalarRelationFilter, ClassWhereInput>
  }, "id" | "classId_session_term">

  export type TermLockOrderByWithAggregationInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    status?: SortOrder
    lockedBy?: SortOrderInput | SortOrder
    lockedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TermLockCountOrderByAggregateInput
    _max?: TermLockMaxOrderByAggregateInput
    _min?: TermLockMinOrderByAggregateInput
  }

  export type TermLockScalarWhereWithAggregatesInput = {
    AND?: TermLockScalarWhereWithAggregatesInput | TermLockScalarWhereWithAggregatesInput[]
    OR?: TermLockScalarWhereWithAggregatesInput[]
    NOT?: TermLockScalarWhereWithAggregatesInput | TermLockScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TermLock"> | string
    classId?: StringWithAggregatesFilter<"TermLock"> | string
    session?: StringWithAggregatesFilter<"TermLock"> | string
    term?: StringWithAggregatesFilter<"TermLock"> | string
    status?: EnumTermStatusWithAggregatesFilter<"TermLock"> | $Enums.TermStatus
    lockedBy?: StringNullableWithAggregatesFilter<"TermLock"> | string | null
    lockedAt?: DateTimeNullableWithAggregatesFilter<"TermLock"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"TermLock"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TermLock"> | Date | string
  }

  export type ResultWhereInput = {
    AND?: ResultWhereInput | ResultWhereInput[]
    OR?: ResultWhereInput[]
    NOT?: ResultWhereInput | ResultWhereInput[]
    id?: StringFilter<"Result"> | string
    studentId?: StringFilter<"Result"> | string
    session?: StringFilter<"Result"> | string
    term?: StringFilter<"Result"> | string
    subject?: StringFilter<"Result"> | string
    score?: IntFilter<"Result"> | number
    date?: StringNullableFilter<"Result"> | string | null
    createdAt?: DateTimeFilter<"Result"> | Date | string
    updatedAt?: DateTimeFilter<"Result"> | Date | string
    student?: XOR<StudentScalarRelationFilter, StudentWhereInput>
  }

  export type ResultOrderByWithRelationInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    subject?: SortOrder
    score?: SortOrder
    date?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    student?: StudentOrderByWithRelationInput
  }

  export type ResultWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    studentId_session_term_subject?: ResultStudentIdSessionTermSubjectCompoundUniqueInput
    AND?: ResultWhereInput | ResultWhereInput[]
    OR?: ResultWhereInput[]
    NOT?: ResultWhereInput | ResultWhereInput[]
    studentId?: StringFilter<"Result"> | string
    session?: StringFilter<"Result"> | string
    term?: StringFilter<"Result"> | string
    subject?: StringFilter<"Result"> | string
    score?: IntFilter<"Result"> | number
    date?: StringNullableFilter<"Result"> | string | null
    createdAt?: DateTimeFilter<"Result"> | Date | string
    updatedAt?: DateTimeFilter<"Result"> | Date | string
    student?: XOR<StudentScalarRelationFilter, StudentWhereInput>
  }, "id" | "studentId_session_term_subject">

  export type ResultOrderByWithAggregationInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    subject?: SortOrder
    score?: SortOrder
    date?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ResultCountOrderByAggregateInput
    _avg?: ResultAvgOrderByAggregateInput
    _max?: ResultMaxOrderByAggregateInput
    _min?: ResultMinOrderByAggregateInput
    _sum?: ResultSumOrderByAggregateInput
  }

  export type ResultScalarWhereWithAggregatesInput = {
    AND?: ResultScalarWhereWithAggregatesInput | ResultScalarWhereWithAggregatesInput[]
    OR?: ResultScalarWhereWithAggregatesInput[]
    NOT?: ResultScalarWhereWithAggregatesInput | ResultScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Result"> | string
    studentId?: StringWithAggregatesFilter<"Result"> | string
    session?: StringWithAggregatesFilter<"Result"> | string
    term?: StringWithAggregatesFilter<"Result"> | string
    subject?: StringWithAggregatesFilter<"Result"> | string
    score?: IntWithAggregatesFilter<"Result"> | number
    date?: StringNullableWithAggregatesFilter<"Result"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Result"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Result"> | Date | string
  }

  export type ReportMetaWhereInput = {
    AND?: ReportMetaWhereInput | ReportMetaWhereInput[]
    OR?: ReportMetaWhereInput[]
    NOT?: ReportMetaWhereInput | ReportMetaWhereInput[]
    id?: StringFilter<"ReportMeta"> | string
    studentId?: StringFilter<"ReportMeta"> | string
    session?: StringFilter<"ReportMeta"> | string
    term?: StringFilter<"ReportMeta"> | string
    nextTermBegins?: StringNullableFilter<"ReportMeta"> | string | null
    teacherComment?: StringNullableFilter<"ReportMeta"> | string | null
    headTeacherComment?: StringNullableFilter<"ReportMeta"> | string | null
    present?: IntFilter<"ReportMeta"> | number
    absent?: IntFilter<"ReportMeta"> | number
    total?: IntFilter<"ReportMeta"> | number
    updatedAt?: DateTimeFilter<"ReportMeta"> | Date | string
    student?: XOR<StudentScalarRelationFilter, StudentWhereInput>
  }

  export type ReportMetaOrderByWithRelationInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    nextTermBegins?: SortOrderInput | SortOrder
    teacherComment?: SortOrderInput | SortOrder
    headTeacherComment?: SortOrderInput | SortOrder
    present?: SortOrder
    absent?: SortOrder
    total?: SortOrder
    updatedAt?: SortOrder
    student?: StudentOrderByWithRelationInput
  }

  export type ReportMetaWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    studentId_session_term?: ReportMetaStudentIdSessionTermCompoundUniqueInput
    AND?: ReportMetaWhereInput | ReportMetaWhereInput[]
    OR?: ReportMetaWhereInput[]
    NOT?: ReportMetaWhereInput | ReportMetaWhereInput[]
    studentId?: StringFilter<"ReportMeta"> | string
    session?: StringFilter<"ReportMeta"> | string
    term?: StringFilter<"ReportMeta"> | string
    nextTermBegins?: StringNullableFilter<"ReportMeta"> | string | null
    teacherComment?: StringNullableFilter<"ReportMeta"> | string | null
    headTeacherComment?: StringNullableFilter<"ReportMeta"> | string | null
    present?: IntFilter<"ReportMeta"> | number
    absent?: IntFilter<"ReportMeta"> | number
    total?: IntFilter<"ReportMeta"> | number
    updatedAt?: DateTimeFilter<"ReportMeta"> | Date | string
    student?: XOR<StudentScalarRelationFilter, StudentWhereInput>
  }, "id" | "studentId_session_term">

  export type ReportMetaOrderByWithAggregationInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    nextTermBegins?: SortOrderInput | SortOrder
    teacherComment?: SortOrderInput | SortOrder
    headTeacherComment?: SortOrderInput | SortOrder
    present?: SortOrder
    absent?: SortOrder
    total?: SortOrder
    updatedAt?: SortOrder
    _count?: ReportMetaCountOrderByAggregateInput
    _avg?: ReportMetaAvgOrderByAggregateInput
    _max?: ReportMetaMaxOrderByAggregateInput
    _min?: ReportMetaMinOrderByAggregateInput
    _sum?: ReportMetaSumOrderByAggregateInput
  }

  export type ReportMetaScalarWhereWithAggregatesInput = {
    AND?: ReportMetaScalarWhereWithAggregatesInput | ReportMetaScalarWhereWithAggregatesInput[]
    OR?: ReportMetaScalarWhereWithAggregatesInput[]
    NOT?: ReportMetaScalarWhereWithAggregatesInput | ReportMetaScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ReportMeta"> | string
    studentId?: StringWithAggregatesFilter<"ReportMeta"> | string
    session?: StringWithAggregatesFilter<"ReportMeta"> | string
    term?: StringWithAggregatesFilter<"ReportMeta"> | string
    nextTermBegins?: StringNullableWithAggregatesFilter<"ReportMeta"> | string | null
    teacherComment?: StringNullableWithAggregatesFilter<"ReportMeta"> | string | null
    headTeacherComment?: StringNullableWithAggregatesFilter<"ReportMeta"> | string | null
    present?: IntWithAggregatesFilter<"ReportMeta"> | number
    absent?: IntWithAggregatesFilter<"ReportMeta"> | number
    total?: IntWithAggregatesFilter<"ReportMeta"> | number
    updatedAt?: DateTimeWithAggregatesFilter<"ReportMeta"> | Date | string
  }

  export type AuditLogWhereInput = {
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    id?: StringFilter<"AuditLog"> | string
    userId?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    entity?: StringFilter<"AuditLog"> | string
    entityId?: StringNullableFilter<"AuditLog"> | string | null
    before?: JsonNullableFilter<"AuditLog">
    after?: JsonNullableFilter<"AuditLog">
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type AuditLogOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrderInput | SortOrder
    before?: SortOrderInput | SortOrder
    after?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type AuditLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    userId?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    entity?: StringFilter<"AuditLog"> | string
    entityId?: StringNullableFilter<"AuditLog"> | string | null
    before?: JsonNullableFilter<"AuditLog">
    after?: JsonNullableFilter<"AuditLog">
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type AuditLogOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrderInput | SortOrder
    before?: SortOrderInput | SortOrder
    after?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AuditLogCountOrderByAggregateInput
    _max?: AuditLogMaxOrderByAggregateInput
    _min?: AuditLogMinOrderByAggregateInput
  }

  export type AuditLogScalarWhereWithAggregatesInput = {
    AND?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    OR?: AuditLogScalarWhereWithAggregatesInput[]
    NOT?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AuditLog"> | string
    userId?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    action?: StringWithAggregatesFilter<"AuditLog"> | string
    entity?: StringWithAggregatesFilter<"AuditLog"> | string
    entityId?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    before?: JsonNullableWithAggregatesFilter<"AuditLog">
    after?: JsonNullableWithAggregatesFilter<"AuditLog">
    createdAt?: DateTimeWithAggregatesFilter<"AuditLog"> | Date | string
  }

  export type FinanceStudentProfileWhereInput = {
    AND?: FinanceStudentProfileWhereInput | FinanceStudentProfileWhereInput[]
    OR?: FinanceStudentProfileWhereInput[]
    NOT?: FinanceStudentProfileWhereInput | FinanceStudentProfileWhereInput[]
    id?: StringFilter<"FinanceStudentProfile"> | string
    studentId?: StringFilter<"FinanceStudentProfile"> | string
    studentType?: StringFilter<"FinanceStudentProfile"> | string
    canStudentView?: BoolFilter<"FinanceStudentProfile"> | boolean
    canParentView?: BoolFilter<"FinanceStudentProfile"> | boolean
    notes?: StringNullableFilter<"FinanceStudentProfile"> | string | null
    createdAt?: DateTimeFilter<"FinanceStudentProfile"> | Date | string
    updatedAt?: DateTimeFilter<"FinanceStudentProfile"> | Date | string
    student?: XOR<StudentScalarRelationFilter, StudentWhereInput>
  }

  export type FinanceStudentProfileOrderByWithRelationInput = {
    id?: SortOrder
    studentId?: SortOrder
    studentType?: SortOrder
    canStudentView?: SortOrder
    canParentView?: SortOrder
    notes?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    student?: StudentOrderByWithRelationInput
  }

  export type FinanceStudentProfileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    studentId?: string
    AND?: FinanceStudentProfileWhereInput | FinanceStudentProfileWhereInput[]
    OR?: FinanceStudentProfileWhereInput[]
    NOT?: FinanceStudentProfileWhereInput | FinanceStudentProfileWhereInput[]
    studentType?: StringFilter<"FinanceStudentProfile"> | string
    canStudentView?: BoolFilter<"FinanceStudentProfile"> | boolean
    canParentView?: BoolFilter<"FinanceStudentProfile"> | boolean
    notes?: StringNullableFilter<"FinanceStudentProfile"> | string | null
    createdAt?: DateTimeFilter<"FinanceStudentProfile"> | Date | string
    updatedAt?: DateTimeFilter<"FinanceStudentProfile"> | Date | string
    student?: XOR<StudentScalarRelationFilter, StudentWhereInput>
  }, "id" | "studentId">

  export type FinanceStudentProfileOrderByWithAggregationInput = {
    id?: SortOrder
    studentId?: SortOrder
    studentType?: SortOrder
    canStudentView?: SortOrder
    canParentView?: SortOrder
    notes?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FinanceStudentProfileCountOrderByAggregateInput
    _max?: FinanceStudentProfileMaxOrderByAggregateInput
    _min?: FinanceStudentProfileMinOrderByAggregateInput
  }

  export type FinanceStudentProfileScalarWhereWithAggregatesInput = {
    AND?: FinanceStudentProfileScalarWhereWithAggregatesInput | FinanceStudentProfileScalarWhereWithAggregatesInput[]
    OR?: FinanceStudentProfileScalarWhereWithAggregatesInput[]
    NOT?: FinanceStudentProfileScalarWhereWithAggregatesInput | FinanceStudentProfileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FinanceStudentProfile"> | string
    studentId?: StringWithAggregatesFilter<"FinanceStudentProfile"> | string
    studentType?: StringWithAggregatesFilter<"FinanceStudentProfile"> | string
    canStudentView?: BoolWithAggregatesFilter<"FinanceStudentProfile"> | boolean
    canParentView?: BoolWithAggregatesFilter<"FinanceStudentProfile"> | boolean
    notes?: StringNullableWithAggregatesFilter<"FinanceStudentProfile"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"FinanceStudentProfile"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"FinanceStudentProfile"> | Date | string
  }

  export type FinanceFeeStructureWhereInput = {
    AND?: FinanceFeeStructureWhereInput | FinanceFeeStructureWhereInput[]
    OR?: FinanceFeeStructureWhereInput[]
    NOT?: FinanceFeeStructureWhereInput | FinanceFeeStructureWhereInput[]
    id?: StringFilter<"FinanceFeeStructure"> | string
    classId?: StringFilter<"FinanceFeeStructure"> | string
    session?: StringFilter<"FinanceFeeStructure"> | string
    term?: StringFilter<"FinanceFeeStructure"> | string
    studentType?: StringFilter<"FinanceFeeStructure"> | string
    title?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    description?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    status?: EnumFinanceApprovalStatusFilter<"FinanceFeeStructure"> | $Enums.FinanceApprovalStatus
    submittedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    submittedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    submittedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    approvedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    approvedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    approvedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    rejectedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectionReason?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    updatedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    updatedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdAt?: DateTimeFilter<"FinanceFeeStructure"> | Date | string
    updatedAt?: DateTimeFilter<"FinanceFeeStructure"> | Date | string
    class?: XOR<ClassScalarRelationFilter, ClassWhereInput>
    components?: FinanceFeeComponentListRelationFilter
    approvals?: FinanceFeeApprovalListRelationFilter
  }

  export type FinanceFeeStructureOrderByWithRelationInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    studentType?: SortOrder
    title?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    status?: SortOrder
    submittedAt?: SortOrderInput | SortOrder
    submittedById?: SortOrderInput | SortOrder
    submittedByName?: SortOrderInput | SortOrder
    approvedAt?: SortOrderInput | SortOrder
    approvedById?: SortOrderInput | SortOrder
    approvedByName?: SortOrderInput | SortOrder
    rejectedAt?: SortOrderInput | SortOrder
    rejectedById?: SortOrderInput | SortOrder
    rejectedByName?: SortOrderInput | SortOrder
    rejectionReason?: SortOrderInput | SortOrder
    createdById?: SortOrderInput | SortOrder
    createdByName?: SortOrderInput | SortOrder
    updatedById?: SortOrderInput | SortOrder
    updatedByName?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    class?: ClassOrderByWithRelationInput
    components?: FinanceFeeComponentOrderByRelationAggregateInput
    approvals?: FinanceFeeApprovalOrderByRelationAggregateInput
  }

  export type FinanceFeeStructureWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FinanceFeeStructureWhereInput | FinanceFeeStructureWhereInput[]
    OR?: FinanceFeeStructureWhereInput[]
    NOT?: FinanceFeeStructureWhereInput | FinanceFeeStructureWhereInput[]
    classId?: StringFilter<"FinanceFeeStructure"> | string
    session?: StringFilter<"FinanceFeeStructure"> | string
    term?: StringFilter<"FinanceFeeStructure"> | string
    studentType?: StringFilter<"FinanceFeeStructure"> | string
    title?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    description?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    status?: EnumFinanceApprovalStatusFilter<"FinanceFeeStructure"> | $Enums.FinanceApprovalStatus
    submittedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    submittedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    submittedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    approvedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    approvedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    approvedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    rejectedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectionReason?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    updatedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    updatedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdAt?: DateTimeFilter<"FinanceFeeStructure"> | Date | string
    updatedAt?: DateTimeFilter<"FinanceFeeStructure"> | Date | string
    class?: XOR<ClassScalarRelationFilter, ClassWhereInput>
    components?: FinanceFeeComponentListRelationFilter
    approvals?: FinanceFeeApprovalListRelationFilter
  }, "id">

  export type FinanceFeeStructureOrderByWithAggregationInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    studentType?: SortOrder
    title?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    status?: SortOrder
    submittedAt?: SortOrderInput | SortOrder
    submittedById?: SortOrderInput | SortOrder
    submittedByName?: SortOrderInput | SortOrder
    approvedAt?: SortOrderInput | SortOrder
    approvedById?: SortOrderInput | SortOrder
    approvedByName?: SortOrderInput | SortOrder
    rejectedAt?: SortOrderInput | SortOrder
    rejectedById?: SortOrderInput | SortOrder
    rejectedByName?: SortOrderInput | SortOrder
    rejectionReason?: SortOrderInput | SortOrder
    createdById?: SortOrderInput | SortOrder
    createdByName?: SortOrderInput | SortOrder
    updatedById?: SortOrderInput | SortOrder
    updatedByName?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FinanceFeeStructureCountOrderByAggregateInput
    _max?: FinanceFeeStructureMaxOrderByAggregateInput
    _min?: FinanceFeeStructureMinOrderByAggregateInput
  }

  export type FinanceFeeStructureScalarWhereWithAggregatesInput = {
    AND?: FinanceFeeStructureScalarWhereWithAggregatesInput | FinanceFeeStructureScalarWhereWithAggregatesInput[]
    OR?: FinanceFeeStructureScalarWhereWithAggregatesInput[]
    NOT?: FinanceFeeStructureScalarWhereWithAggregatesInput | FinanceFeeStructureScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FinanceFeeStructure"> | string
    classId?: StringWithAggregatesFilter<"FinanceFeeStructure"> | string
    session?: StringWithAggregatesFilter<"FinanceFeeStructure"> | string
    term?: StringWithAggregatesFilter<"FinanceFeeStructure"> | string
    studentType?: StringWithAggregatesFilter<"FinanceFeeStructure"> | string
    title?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    description?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    status?: EnumFinanceApprovalStatusWithAggregatesFilter<"FinanceFeeStructure"> | $Enums.FinanceApprovalStatus
    submittedAt?: DateTimeNullableWithAggregatesFilter<"FinanceFeeStructure"> | Date | string | null
    submittedById?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    submittedByName?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    approvedAt?: DateTimeNullableWithAggregatesFilter<"FinanceFeeStructure"> | Date | string | null
    approvedById?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    approvedByName?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    rejectedAt?: DateTimeNullableWithAggregatesFilter<"FinanceFeeStructure"> | Date | string | null
    rejectedById?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    rejectedByName?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    rejectionReason?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    createdById?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    createdByName?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    updatedById?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    updatedByName?: StringNullableWithAggregatesFilter<"FinanceFeeStructure"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"FinanceFeeStructure"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"FinanceFeeStructure"> | Date | string
  }

  export type FinanceFeeComponentWhereInput = {
    AND?: FinanceFeeComponentWhereInput | FinanceFeeComponentWhereInput[]
    OR?: FinanceFeeComponentWhereInput[]
    NOT?: FinanceFeeComponentWhereInput | FinanceFeeComponentWhereInput[]
    id?: StringFilter<"FinanceFeeComponent"> | string
    feeStructureId?: StringFilter<"FinanceFeeComponent"> | string
    code?: StringFilter<"FinanceFeeComponent"> | string
    name?: StringFilter<"FinanceFeeComponent"> | string
    description?: StringNullableFilter<"FinanceFeeComponent"> | string | null
    amount?: IntFilter<"FinanceFeeComponent"> | number
    isOptional?: BoolFilter<"FinanceFeeComponent"> | boolean
    visibleToStudent?: BoolFilter<"FinanceFeeComponent"> | boolean
    visibleToParent?: BoolFilter<"FinanceFeeComponent"> | boolean
    sortOrder?: IntFilter<"FinanceFeeComponent"> | number
    createdAt?: DateTimeFilter<"FinanceFeeComponent"> | Date | string
    updatedAt?: DateTimeFilter<"FinanceFeeComponent"> | Date | string
    feeStructure?: XOR<FinanceFeeStructureScalarRelationFilter, FinanceFeeStructureWhereInput>
  }

  export type FinanceFeeComponentOrderByWithRelationInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    amount?: SortOrder
    isOptional?: SortOrder
    visibleToStudent?: SortOrder
    visibleToParent?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    feeStructure?: FinanceFeeStructureOrderByWithRelationInput
  }

  export type FinanceFeeComponentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    feeStructureId_code?: FinanceFeeComponentFeeStructureIdCodeCompoundUniqueInput
    AND?: FinanceFeeComponentWhereInput | FinanceFeeComponentWhereInput[]
    OR?: FinanceFeeComponentWhereInput[]
    NOT?: FinanceFeeComponentWhereInput | FinanceFeeComponentWhereInput[]
    feeStructureId?: StringFilter<"FinanceFeeComponent"> | string
    code?: StringFilter<"FinanceFeeComponent"> | string
    name?: StringFilter<"FinanceFeeComponent"> | string
    description?: StringNullableFilter<"FinanceFeeComponent"> | string | null
    amount?: IntFilter<"FinanceFeeComponent"> | number
    isOptional?: BoolFilter<"FinanceFeeComponent"> | boolean
    visibleToStudent?: BoolFilter<"FinanceFeeComponent"> | boolean
    visibleToParent?: BoolFilter<"FinanceFeeComponent"> | boolean
    sortOrder?: IntFilter<"FinanceFeeComponent"> | number
    createdAt?: DateTimeFilter<"FinanceFeeComponent"> | Date | string
    updatedAt?: DateTimeFilter<"FinanceFeeComponent"> | Date | string
    feeStructure?: XOR<FinanceFeeStructureScalarRelationFilter, FinanceFeeStructureWhereInput>
  }, "id" | "feeStructureId_code">

  export type FinanceFeeComponentOrderByWithAggregationInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    amount?: SortOrder
    isOptional?: SortOrder
    visibleToStudent?: SortOrder
    visibleToParent?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FinanceFeeComponentCountOrderByAggregateInput
    _avg?: FinanceFeeComponentAvgOrderByAggregateInput
    _max?: FinanceFeeComponentMaxOrderByAggregateInput
    _min?: FinanceFeeComponentMinOrderByAggregateInput
    _sum?: FinanceFeeComponentSumOrderByAggregateInput
  }

  export type FinanceFeeComponentScalarWhereWithAggregatesInput = {
    AND?: FinanceFeeComponentScalarWhereWithAggregatesInput | FinanceFeeComponentScalarWhereWithAggregatesInput[]
    OR?: FinanceFeeComponentScalarWhereWithAggregatesInput[]
    NOT?: FinanceFeeComponentScalarWhereWithAggregatesInput | FinanceFeeComponentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FinanceFeeComponent"> | string
    feeStructureId?: StringWithAggregatesFilter<"FinanceFeeComponent"> | string
    code?: StringWithAggregatesFilter<"FinanceFeeComponent"> | string
    name?: StringWithAggregatesFilter<"FinanceFeeComponent"> | string
    description?: StringNullableWithAggregatesFilter<"FinanceFeeComponent"> | string | null
    amount?: IntWithAggregatesFilter<"FinanceFeeComponent"> | number
    isOptional?: BoolWithAggregatesFilter<"FinanceFeeComponent"> | boolean
    visibleToStudent?: BoolWithAggregatesFilter<"FinanceFeeComponent"> | boolean
    visibleToParent?: BoolWithAggregatesFilter<"FinanceFeeComponent"> | boolean
    sortOrder?: IntWithAggregatesFilter<"FinanceFeeComponent"> | number
    createdAt?: DateTimeWithAggregatesFilter<"FinanceFeeComponent"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"FinanceFeeComponent"> | Date | string
  }

  export type FinanceFeeApprovalWhereInput = {
    AND?: FinanceFeeApprovalWhereInput | FinanceFeeApprovalWhereInput[]
    OR?: FinanceFeeApprovalWhereInput[]
    NOT?: FinanceFeeApprovalWhereInput | FinanceFeeApprovalWhereInput[]
    id?: StringFilter<"FinanceFeeApproval"> | string
    feeStructureId?: StringFilter<"FinanceFeeApproval"> | string
    action?: StringFilter<"FinanceFeeApproval"> | string
    status?: EnumFinanceApprovalStatusFilter<"FinanceFeeApproval"> | $Enums.FinanceApprovalStatus
    notes?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorId?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorName?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorRole?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    createdAt?: DateTimeFilter<"FinanceFeeApproval"> | Date | string
    feeStructure?: XOR<FinanceFeeStructureScalarRelationFilter, FinanceFeeStructureWhereInput>
  }

  export type FinanceFeeApprovalOrderByWithRelationInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    action?: SortOrder
    status?: SortOrder
    notes?: SortOrderInput | SortOrder
    actorId?: SortOrderInput | SortOrder
    actorName?: SortOrderInput | SortOrder
    actorRole?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    feeStructure?: FinanceFeeStructureOrderByWithRelationInput
  }

  export type FinanceFeeApprovalWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FinanceFeeApprovalWhereInput | FinanceFeeApprovalWhereInput[]
    OR?: FinanceFeeApprovalWhereInput[]
    NOT?: FinanceFeeApprovalWhereInput | FinanceFeeApprovalWhereInput[]
    feeStructureId?: StringFilter<"FinanceFeeApproval"> | string
    action?: StringFilter<"FinanceFeeApproval"> | string
    status?: EnumFinanceApprovalStatusFilter<"FinanceFeeApproval"> | $Enums.FinanceApprovalStatus
    notes?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorId?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorName?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorRole?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    createdAt?: DateTimeFilter<"FinanceFeeApproval"> | Date | string
    feeStructure?: XOR<FinanceFeeStructureScalarRelationFilter, FinanceFeeStructureWhereInput>
  }, "id">

  export type FinanceFeeApprovalOrderByWithAggregationInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    action?: SortOrder
    status?: SortOrder
    notes?: SortOrderInput | SortOrder
    actorId?: SortOrderInput | SortOrder
    actorName?: SortOrderInput | SortOrder
    actorRole?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: FinanceFeeApprovalCountOrderByAggregateInput
    _max?: FinanceFeeApprovalMaxOrderByAggregateInput
    _min?: FinanceFeeApprovalMinOrderByAggregateInput
  }

  export type FinanceFeeApprovalScalarWhereWithAggregatesInput = {
    AND?: FinanceFeeApprovalScalarWhereWithAggregatesInput | FinanceFeeApprovalScalarWhereWithAggregatesInput[]
    OR?: FinanceFeeApprovalScalarWhereWithAggregatesInput[]
    NOT?: FinanceFeeApprovalScalarWhereWithAggregatesInput | FinanceFeeApprovalScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FinanceFeeApproval"> | string
    feeStructureId?: StringWithAggregatesFilter<"FinanceFeeApproval"> | string
    action?: StringWithAggregatesFilter<"FinanceFeeApproval"> | string
    status?: EnumFinanceApprovalStatusWithAggregatesFilter<"FinanceFeeApproval"> | $Enums.FinanceApprovalStatus
    notes?: StringNullableWithAggregatesFilter<"FinanceFeeApproval"> | string | null
    actorId?: StringNullableWithAggregatesFilter<"FinanceFeeApproval"> | string | null
    actorName?: StringNullableWithAggregatesFilter<"FinanceFeeApproval"> | string | null
    actorRole?: StringNullableWithAggregatesFilter<"FinanceFeeApproval"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"FinanceFeeApproval"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    name: string
    email: string
    password: string
    role?: $Enums.Role
    createdAt?: Date | string
    updatedAt?: Date | string
    audits?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    name: string
    email: string
    password: string
    role?: $Enums.Role
    createdAt?: Date | string
    updatedAt?: Date | string
    audits?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    audits?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    audits?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    name: string
    email: string
    password: string
    role?: $Enums.Role
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ClassCreateInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
    students?: StudentCreateNestedManyWithoutClassInput
    termLocks?: TermLockCreateNestedManyWithoutClassInput
    feeStructures?: FinanceFeeStructureCreateNestedManyWithoutClassInput
  }

  export type ClassUncheckedCreateInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
    students?: StudentUncheckedCreateNestedManyWithoutClassInput
    termLocks?: TermLockUncheckedCreateNestedManyWithoutClassInput
    feeStructures?: FinanceFeeStructureUncheckedCreateNestedManyWithoutClassInput
  }

  export type ClassUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    students?: StudentUpdateManyWithoutClassNestedInput
    termLocks?: TermLockUpdateManyWithoutClassNestedInput
    feeStructures?: FinanceFeeStructureUpdateManyWithoutClassNestedInput
  }

  export type ClassUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    students?: StudentUncheckedUpdateManyWithoutClassNestedInput
    termLocks?: TermLockUncheckedUpdateManyWithoutClassNestedInput
    feeStructures?: FinanceFeeStructureUncheckedUpdateManyWithoutClassNestedInput
  }

  export type ClassCreateManyInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
  }

  export type ClassUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ClassUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentCreateInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    class: ClassCreateNestedOneWithoutStudentsInput
    results?: ResultCreateNestedManyWithoutStudentInput
    reports?: ReportMetaCreateNestedManyWithoutStudentInput
    financeProfile?: FinanceStudentProfileCreateNestedOneWithoutStudentInput
  }

  export type StudentUncheckedCreateInput = {
    id?: string
    name: string
    classId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    results?: ResultUncheckedCreateNestedManyWithoutStudentInput
    reports?: ReportMetaUncheckedCreateNestedManyWithoutStudentInput
    financeProfile?: FinanceStudentProfileUncheckedCreateNestedOneWithoutStudentInput
  }

  export type StudentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    class?: ClassUpdateOneRequiredWithoutStudentsNestedInput
    results?: ResultUpdateManyWithoutStudentNestedInput
    reports?: ReportMetaUpdateManyWithoutStudentNestedInput
    financeProfile?: FinanceStudentProfileUpdateOneWithoutStudentNestedInput
  }

  export type StudentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    results?: ResultUncheckedUpdateManyWithoutStudentNestedInput
    reports?: ReportMetaUncheckedUpdateManyWithoutStudentNestedInput
    financeProfile?: FinanceStudentProfileUncheckedUpdateOneWithoutStudentNestedInput
  }

  export type StudentCreateManyInput = {
    id?: string
    name: string
    classId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TermLockCreateInput = {
    id?: string
    session: string
    term: string
    status?: $Enums.TermStatus
    lockedBy?: string | null
    lockedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    class: ClassCreateNestedOneWithoutTermLocksInput
  }

  export type TermLockUncheckedCreateInput = {
    id?: string
    classId: string
    session: string
    term: string
    status?: $Enums.TermStatus
    lockedBy?: string | null
    lockedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TermLockUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    status?: EnumTermStatusFieldUpdateOperationsInput | $Enums.TermStatus
    lockedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lockedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    class?: ClassUpdateOneRequiredWithoutTermLocksNestedInput
  }

  export type TermLockUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    status?: EnumTermStatusFieldUpdateOperationsInput | $Enums.TermStatus
    lockedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lockedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TermLockCreateManyInput = {
    id?: string
    classId: string
    session: string
    term: string
    status?: $Enums.TermStatus
    lockedBy?: string | null
    lockedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TermLockUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    status?: EnumTermStatusFieldUpdateOperationsInput | $Enums.TermStatus
    lockedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lockedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TermLockUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    status?: EnumTermStatusFieldUpdateOperationsInput | $Enums.TermStatus
    lockedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lockedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResultCreateInput = {
    id?: string
    session: string
    term: string
    subject: string
    score: number
    date?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    student: StudentCreateNestedOneWithoutResultsInput
  }

  export type ResultUncheckedCreateInput = {
    id?: string
    studentId: string
    session: string
    term: string
    subject: string
    score: number
    date?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ResultUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    subject?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    date?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    student?: StudentUpdateOneRequiredWithoutResultsNestedInput
  }

  export type ResultUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    subject?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    date?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResultCreateManyInput = {
    id?: string
    studentId: string
    session: string
    term: string
    subject: string
    score: number
    date?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ResultUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    subject?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    date?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResultUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    subject?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    date?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportMetaCreateInput = {
    id?: string
    session: string
    term: string
    nextTermBegins?: string | null
    teacherComment?: string | null
    headTeacherComment?: string | null
    present?: number
    absent?: number
    total?: number
    updatedAt?: Date | string
    student: StudentCreateNestedOneWithoutReportsInput
  }

  export type ReportMetaUncheckedCreateInput = {
    id?: string
    studentId: string
    session: string
    term: string
    nextTermBegins?: string | null
    teacherComment?: string | null
    headTeacherComment?: string | null
    present?: number
    absent?: number
    total?: number
    updatedAt?: Date | string
  }

  export type ReportMetaUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    nextTermBegins?: NullableStringFieldUpdateOperationsInput | string | null
    teacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    headTeacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    present?: IntFieldUpdateOperationsInput | number
    absent?: IntFieldUpdateOperationsInput | number
    total?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    student?: StudentUpdateOneRequiredWithoutReportsNestedInput
  }

  export type ReportMetaUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    nextTermBegins?: NullableStringFieldUpdateOperationsInput | string | null
    teacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    headTeacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    present?: IntFieldUpdateOperationsInput | number
    absent?: IntFieldUpdateOperationsInput | number
    total?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportMetaCreateManyInput = {
    id?: string
    studentId: string
    session: string
    term: string
    nextTermBegins?: string | null
    teacherComment?: string | null
    headTeacherComment?: string | null
    present?: number
    absent?: number
    total?: number
    updatedAt?: Date | string
  }

  export type ReportMetaUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    nextTermBegins?: NullableStringFieldUpdateOperationsInput | string | null
    teacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    headTeacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    present?: IntFieldUpdateOperationsInput | number
    absent?: IntFieldUpdateOperationsInput | number
    total?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportMetaUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    nextTermBegins?: NullableStringFieldUpdateOperationsInput | string | null
    teacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    headTeacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    present?: IntFieldUpdateOperationsInput | number
    absent?: IntFieldUpdateOperationsInput | number
    total?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateInput = {
    id?: string
    action: string
    entity: string
    entityId?: string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    user?: UserCreateNestedOneWithoutAuditsInput
  }

  export type AuditLogUncheckedCreateInput = {
    id?: string
    userId?: string | null
    action: string
    entity: string
    entityId?: string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuditLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneWithoutAuditsNestedInput
  }

  export type AuditLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateManyInput = {
    id?: string
    userId?: string | null
    action: string
    entity: string
    entityId?: string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuditLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceStudentProfileCreateInput = {
    id?: string
    studentType?: string
    canStudentView?: boolean
    canParentView?: boolean
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    student: StudentCreateNestedOneWithoutFinanceProfileInput
  }

  export type FinanceStudentProfileUncheckedCreateInput = {
    id?: string
    studentId: string
    studentType?: string
    canStudentView?: boolean
    canParentView?: boolean
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceStudentProfileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    canStudentView?: BoolFieldUpdateOperationsInput | boolean
    canParentView?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    student?: StudentUpdateOneRequiredWithoutFinanceProfileNestedInput
  }

  export type FinanceStudentProfileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    canStudentView?: BoolFieldUpdateOperationsInput | boolean
    canParentView?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceStudentProfileCreateManyInput = {
    id?: string
    studentId: string
    studentType?: string
    canStudentView?: boolean
    canParentView?: boolean
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceStudentProfileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    canStudentView?: BoolFieldUpdateOperationsInput | boolean
    canParentView?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceStudentProfileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    canStudentView?: BoolFieldUpdateOperationsInput | boolean
    canParentView?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeStructureCreateInput = {
    id?: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    class: ClassCreateNestedOneWithoutFeeStructuresInput
    components?: FinanceFeeComponentCreateNestedManyWithoutFeeStructureInput
    approvals?: FinanceFeeApprovalCreateNestedManyWithoutFeeStructureInput
  }

  export type FinanceFeeStructureUncheckedCreateInput = {
    id?: string
    classId: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    components?: FinanceFeeComponentUncheckedCreateNestedManyWithoutFeeStructureInput
    approvals?: FinanceFeeApprovalUncheckedCreateNestedManyWithoutFeeStructureInput
  }

  export type FinanceFeeStructureUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    class?: ClassUpdateOneRequiredWithoutFeeStructuresNestedInput
    components?: FinanceFeeComponentUpdateManyWithoutFeeStructureNestedInput
    approvals?: FinanceFeeApprovalUpdateManyWithoutFeeStructureNestedInput
  }

  export type FinanceFeeStructureUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    components?: FinanceFeeComponentUncheckedUpdateManyWithoutFeeStructureNestedInput
    approvals?: FinanceFeeApprovalUncheckedUpdateManyWithoutFeeStructureNestedInput
  }

  export type FinanceFeeStructureCreateManyInput = {
    id?: string
    classId: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceFeeStructureUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeStructureUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeComponentCreateInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    amount: number
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    feeStructure: FinanceFeeStructureCreateNestedOneWithoutComponentsInput
  }

  export type FinanceFeeComponentUncheckedCreateInput = {
    id?: string
    feeStructureId: string
    code: string
    name: string
    description?: string | null
    amount: number
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceFeeComponentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    isOptional?: BoolFieldUpdateOperationsInput | boolean
    visibleToStudent?: BoolFieldUpdateOperationsInput | boolean
    visibleToParent?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    feeStructure?: FinanceFeeStructureUpdateOneRequiredWithoutComponentsNestedInput
  }

  export type FinanceFeeComponentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    feeStructureId?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    isOptional?: BoolFieldUpdateOperationsInput | boolean
    visibleToStudent?: BoolFieldUpdateOperationsInput | boolean
    visibleToParent?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeComponentCreateManyInput = {
    id?: string
    feeStructureId: string
    code: string
    name: string
    description?: string | null
    amount: number
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceFeeComponentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    isOptional?: BoolFieldUpdateOperationsInput | boolean
    visibleToStudent?: BoolFieldUpdateOperationsInput | boolean
    visibleToParent?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeComponentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    feeStructureId?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    isOptional?: BoolFieldUpdateOperationsInput | boolean
    visibleToStudent?: BoolFieldUpdateOperationsInput | boolean
    visibleToParent?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeApprovalCreateInput = {
    id?: string
    action: string
    status: $Enums.FinanceApprovalStatus
    notes?: string | null
    actorId?: string | null
    actorName?: string | null
    actorRole?: string | null
    createdAt?: Date | string
    feeStructure: FinanceFeeStructureCreateNestedOneWithoutApprovalsInput
  }

  export type FinanceFeeApprovalUncheckedCreateInput = {
    id?: string
    feeStructureId: string
    action: string
    status: $Enums.FinanceApprovalStatus
    notes?: string | null
    actorId?: string | null
    actorName?: string | null
    actorRole?: string | null
    createdAt?: Date | string
  }

  export type FinanceFeeApprovalUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    actorRole?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    feeStructure?: FinanceFeeStructureUpdateOneRequiredWithoutApprovalsNestedInput
  }

  export type FinanceFeeApprovalUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    feeStructureId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    actorRole?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeApprovalCreateManyInput = {
    id?: string
    feeStructureId: string
    action: string
    status: $Enums.FinanceApprovalStatus
    notes?: string | null
    actorId?: string | null
    actorName?: string | null
    actorRole?: string | null
    createdAt?: Date | string
  }

  export type FinanceFeeApprovalUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    actorRole?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeApprovalUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    feeStructureId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    actorRole?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type EnumRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleFilter<$PrismaModel> | $Enums.Role
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type AuditLogListRelationFilter = {
    every?: AuditLogWhereInput
    some?: AuditLogWhereInput
    none?: AuditLogWhereInput
  }

  export type AuditLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleWithAggregatesFilter<$PrismaModel> | $Enums.Role
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoleFilter<$PrismaModel>
    _max?: NestedEnumRoleFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StudentListRelationFilter = {
    every?: StudentWhereInput
    some?: StudentWhereInput
    none?: StudentWhereInput
  }

  export type TermLockListRelationFilter = {
    every?: TermLockWhereInput
    some?: TermLockWhereInput
    none?: TermLockWhereInput
  }

  export type FinanceFeeStructureListRelationFilter = {
    every?: FinanceFeeStructureWhereInput
    some?: FinanceFeeStructureWhereInput
    none?: FinanceFeeStructureWhereInput
  }

  export type StudentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TermLockOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FinanceFeeStructureOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ClassCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    section?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
  }

  export type ClassAvgOrderByAggregateInput = {
    order?: SortOrder
  }

  export type ClassMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    section?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
  }

  export type ClassMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    section?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
  }

  export type ClassSumOrderByAggregateInput = {
    order?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type ClassScalarRelationFilter = {
    is?: ClassWhereInput
    isNot?: ClassWhereInput
  }

  export type ResultListRelationFilter = {
    every?: ResultWhereInput
    some?: ResultWhereInput
    none?: ResultWhereInput
  }

  export type ReportMetaListRelationFilter = {
    every?: ReportMetaWhereInput
    some?: ReportMetaWhereInput
    none?: ReportMetaWhereInput
  }

  export type FinanceStudentProfileNullableScalarRelationFilter = {
    is?: FinanceStudentProfileWhereInput | null
    isNot?: FinanceStudentProfileWhereInput | null
  }

  export type ResultOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ReportMetaOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type StudentCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    classId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StudentMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    classId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StudentMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    classId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumTermStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TermStatus | EnumTermStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TermStatus[] | ListEnumTermStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TermStatus[] | ListEnumTermStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTermStatusFilter<$PrismaModel> | $Enums.TermStatus
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type TermLockClassIdSessionTermCompoundUniqueInput = {
    classId: string
    session: string
    term: string
  }

  export type TermLockCountOrderByAggregateInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    status?: SortOrder
    lockedBy?: SortOrder
    lockedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TermLockMaxOrderByAggregateInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    status?: SortOrder
    lockedBy?: SortOrder
    lockedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TermLockMinOrderByAggregateInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    status?: SortOrder
    lockedBy?: SortOrder
    lockedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumTermStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TermStatus | EnumTermStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TermStatus[] | ListEnumTermStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TermStatus[] | ListEnumTermStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTermStatusWithAggregatesFilter<$PrismaModel> | $Enums.TermStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTermStatusFilter<$PrismaModel>
    _max?: NestedEnumTermStatusFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type StudentScalarRelationFilter = {
    is?: StudentWhereInput
    isNot?: StudentWhereInput
  }

  export type ResultStudentIdSessionTermSubjectCompoundUniqueInput = {
    studentId: string
    session: string
    term: string
    subject: string
  }

  export type ResultCountOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    subject?: SortOrder
    score?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ResultAvgOrderByAggregateInput = {
    score?: SortOrder
  }

  export type ResultMaxOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    subject?: SortOrder
    score?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ResultMinOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    subject?: SortOrder
    score?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ResultSumOrderByAggregateInput = {
    score?: SortOrder
  }

  export type ReportMetaStudentIdSessionTermCompoundUniqueInput = {
    studentId: string
    session: string
    term: string
  }

  export type ReportMetaCountOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    nextTermBegins?: SortOrder
    teacherComment?: SortOrder
    headTeacherComment?: SortOrder
    present?: SortOrder
    absent?: SortOrder
    total?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportMetaAvgOrderByAggregateInput = {
    present?: SortOrder
    absent?: SortOrder
    total?: SortOrder
  }

  export type ReportMetaMaxOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    nextTermBegins?: SortOrder
    teacherComment?: SortOrder
    headTeacherComment?: SortOrder
    present?: SortOrder
    absent?: SortOrder
    total?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportMetaMinOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    nextTermBegins?: SortOrder
    teacherComment?: SortOrder
    headTeacherComment?: SortOrder
    present?: SortOrder
    absent?: SortOrder
    total?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportMetaSumOrderByAggregateInput = {
    present?: SortOrder
    absent?: SortOrder
    total?: SortOrder
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type AuditLogCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    before?: SortOrder
    after?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    createdAt?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type FinanceStudentProfileCountOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    studentType?: SortOrder
    canStudentView?: SortOrder
    canParentView?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FinanceStudentProfileMaxOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    studentType?: SortOrder
    canStudentView?: SortOrder
    canParentView?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FinanceStudentProfileMinOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    studentType?: SortOrder
    canStudentView?: SortOrder
    canParentView?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumFinanceApprovalStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.FinanceApprovalStatus | EnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FinanceApprovalStatus[] | ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FinanceApprovalStatus[] | ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFinanceApprovalStatusFilter<$PrismaModel> | $Enums.FinanceApprovalStatus
  }

  export type FinanceFeeComponentListRelationFilter = {
    every?: FinanceFeeComponentWhereInput
    some?: FinanceFeeComponentWhereInput
    none?: FinanceFeeComponentWhereInput
  }

  export type FinanceFeeApprovalListRelationFilter = {
    every?: FinanceFeeApprovalWhereInput
    some?: FinanceFeeApprovalWhereInput
    none?: FinanceFeeApprovalWhereInput
  }

  export type FinanceFeeComponentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FinanceFeeApprovalOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FinanceFeeStructureCountOrderByAggregateInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    studentType?: SortOrder
    title?: SortOrder
    description?: SortOrder
    status?: SortOrder
    submittedAt?: SortOrder
    submittedById?: SortOrder
    submittedByName?: SortOrder
    approvedAt?: SortOrder
    approvedById?: SortOrder
    approvedByName?: SortOrder
    rejectedAt?: SortOrder
    rejectedById?: SortOrder
    rejectedByName?: SortOrder
    rejectionReason?: SortOrder
    createdById?: SortOrder
    createdByName?: SortOrder
    updatedById?: SortOrder
    updatedByName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FinanceFeeStructureMaxOrderByAggregateInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    studentType?: SortOrder
    title?: SortOrder
    description?: SortOrder
    status?: SortOrder
    submittedAt?: SortOrder
    submittedById?: SortOrder
    submittedByName?: SortOrder
    approvedAt?: SortOrder
    approvedById?: SortOrder
    approvedByName?: SortOrder
    rejectedAt?: SortOrder
    rejectedById?: SortOrder
    rejectedByName?: SortOrder
    rejectionReason?: SortOrder
    createdById?: SortOrder
    createdByName?: SortOrder
    updatedById?: SortOrder
    updatedByName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FinanceFeeStructureMinOrderByAggregateInput = {
    id?: SortOrder
    classId?: SortOrder
    session?: SortOrder
    term?: SortOrder
    studentType?: SortOrder
    title?: SortOrder
    description?: SortOrder
    status?: SortOrder
    submittedAt?: SortOrder
    submittedById?: SortOrder
    submittedByName?: SortOrder
    approvedAt?: SortOrder
    approvedById?: SortOrder
    approvedByName?: SortOrder
    rejectedAt?: SortOrder
    rejectedById?: SortOrder
    rejectedByName?: SortOrder
    rejectionReason?: SortOrder
    createdById?: SortOrder
    createdByName?: SortOrder
    updatedById?: SortOrder
    updatedByName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumFinanceApprovalStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FinanceApprovalStatus | EnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FinanceApprovalStatus[] | ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FinanceApprovalStatus[] | ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFinanceApprovalStatusWithAggregatesFilter<$PrismaModel> | $Enums.FinanceApprovalStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFinanceApprovalStatusFilter<$PrismaModel>
    _max?: NestedEnumFinanceApprovalStatusFilter<$PrismaModel>
  }

  export type FinanceFeeStructureScalarRelationFilter = {
    is?: FinanceFeeStructureWhereInput
    isNot?: FinanceFeeStructureWhereInput
  }

  export type FinanceFeeComponentFeeStructureIdCodeCompoundUniqueInput = {
    feeStructureId: string
    code: string
  }

  export type FinanceFeeComponentCountOrderByAggregateInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    amount?: SortOrder
    isOptional?: SortOrder
    visibleToStudent?: SortOrder
    visibleToParent?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FinanceFeeComponentAvgOrderByAggregateInput = {
    amount?: SortOrder
    sortOrder?: SortOrder
  }

  export type FinanceFeeComponentMaxOrderByAggregateInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    amount?: SortOrder
    isOptional?: SortOrder
    visibleToStudent?: SortOrder
    visibleToParent?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FinanceFeeComponentMinOrderByAggregateInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    amount?: SortOrder
    isOptional?: SortOrder
    visibleToStudent?: SortOrder
    visibleToParent?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FinanceFeeComponentSumOrderByAggregateInput = {
    amount?: SortOrder
    sortOrder?: SortOrder
  }

  export type FinanceFeeApprovalCountOrderByAggregateInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    action?: SortOrder
    status?: SortOrder
    notes?: SortOrder
    actorId?: SortOrder
    actorName?: SortOrder
    actorRole?: SortOrder
    createdAt?: SortOrder
  }

  export type FinanceFeeApprovalMaxOrderByAggregateInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    action?: SortOrder
    status?: SortOrder
    notes?: SortOrder
    actorId?: SortOrder
    actorName?: SortOrder
    actorRole?: SortOrder
    createdAt?: SortOrder
  }

  export type FinanceFeeApprovalMinOrderByAggregateInput = {
    id?: SortOrder
    feeStructureId?: SortOrder
    action?: SortOrder
    status?: SortOrder
    notes?: SortOrder
    actorId?: SortOrder
    actorName?: SortOrder
    actorRole?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type AuditLogUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumRoleFieldUpdateOperationsInput = {
    set?: $Enums.Role
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type AuditLogUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutUserInput | AuditLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutUserInput | AuditLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutUserInput | AuditLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type AuditLogUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutUserInput | AuditLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutUserInput | AuditLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutUserInput | AuditLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type StudentCreateNestedManyWithoutClassInput = {
    create?: XOR<StudentCreateWithoutClassInput, StudentUncheckedCreateWithoutClassInput> | StudentCreateWithoutClassInput[] | StudentUncheckedCreateWithoutClassInput[]
    connectOrCreate?: StudentCreateOrConnectWithoutClassInput | StudentCreateOrConnectWithoutClassInput[]
    createMany?: StudentCreateManyClassInputEnvelope
    connect?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
  }

  export type TermLockCreateNestedManyWithoutClassInput = {
    create?: XOR<TermLockCreateWithoutClassInput, TermLockUncheckedCreateWithoutClassInput> | TermLockCreateWithoutClassInput[] | TermLockUncheckedCreateWithoutClassInput[]
    connectOrCreate?: TermLockCreateOrConnectWithoutClassInput | TermLockCreateOrConnectWithoutClassInput[]
    createMany?: TermLockCreateManyClassInputEnvelope
    connect?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
  }

  export type FinanceFeeStructureCreateNestedManyWithoutClassInput = {
    create?: XOR<FinanceFeeStructureCreateWithoutClassInput, FinanceFeeStructureUncheckedCreateWithoutClassInput> | FinanceFeeStructureCreateWithoutClassInput[] | FinanceFeeStructureUncheckedCreateWithoutClassInput[]
    connectOrCreate?: FinanceFeeStructureCreateOrConnectWithoutClassInput | FinanceFeeStructureCreateOrConnectWithoutClassInput[]
    createMany?: FinanceFeeStructureCreateManyClassInputEnvelope
    connect?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
  }

  export type StudentUncheckedCreateNestedManyWithoutClassInput = {
    create?: XOR<StudentCreateWithoutClassInput, StudentUncheckedCreateWithoutClassInput> | StudentCreateWithoutClassInput[] | StudentUncheckedCreateWithoutClassInput[]
    connectOrCreate?: StudentCreateOrConnectWithoutClassInput | StudentCreateOrConnectWithoutClassInput[]
    createMany?: StudentCreateManyClassInputEnvelope
    connect?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
  }

  export type TermLockUncheckedCreateNestedManyWithoutClassInput = {
    create?: XOR<TermLockCreateWithoutClassInput, TermLockUncheckedCreateWithoutClassInput> | TermLockCreateWithoutClassInput[] | TermLockUncheckedCreateWithoutClassInput[]
    connectOrCreate?: TermLockCreateOrConnectWithoutClassInput | TermLockCreateOrConnectWithoutClassInput[]
    createMany?: TermLockCreateManyClassInputEnvelope
    connect?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
  }

  export type FinanceFeeStructureUncheckedCreateNestedManyWithoutClassInput = {
    create?: XOR<FinanceFeeStructureCreateWithoutClassInput, FinanceFeeStructureUncheckedCreateWithoutClassInput> | FinanceFeeStructureCreateWithoutClassInput[] | FinanceFeeStructureUncheckedCreateWithoutClassInput[]
    connectOrCreate?: FinanceFeeStructureCreateOrConnectWithoutClassInput | FinanceFeeStructureCreateOrConnectWithoutClassInput[]
    createMany?: FinanceFeeStructureCreateManyClassInputEnvelope
    connect?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type StudentUpdateManyWithoutClassNestedInput = {
    create?: XOR<StudentCreateWithoutClassInput, StudentUncheckedCreateWithoutClassInput> | StudentCreateWithoutClassInput[] | StudentUncheckedCreateWithoutClassInput[]
    connectOrCreate?: StudentCreateOrConnectWithoutClassInput | StudentCreateOrConnectWithoutClassInput[]
    upsert?: StudentUpsertWithWhereUniqueWithoutClassInput | StudentUpsertWithWhereUniqueWithoutClassInput[]
    createMany?: StudentCreateManyClassInputEnvelope
    set?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
    disconnect?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
    delete?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
    connect?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
    update?: StudentUpdateWithWhereUniqueWithoutClassInput | StudentUpdateWithWhereUniqueWithoutClassInput[]
    updateMany?: StudentUpdateManyWithWhereWithoutClassInput | StudentUpdateManyWithWhereWithoutClassInput[]
    deleteMany?: StudentScalarWhereInput | StudentScalarWhereInput[]
  }

  export type TermLockUpdateManyWithoutClassNestedInput = {
    create?: XOR<TermLockCreateWithoutClassInput, TermLockUncheckedCreateWithoutClassInput> | TermLockCreateWithoutClassInput[] | TermLockUncheckedCreateWithoutClassInput[]
    connectOrCreate?: TermLockCreateOrConnectWithoutClassInput | TermLockCreateOrConnectWithoutClassInput[]
    upsert?: TermLockUpsertWithWhereUniqueWithoutClassInput | TermLockUpsertWithWhereUniqueWithoutClassInput[]
    createMany?: TermLockCreateManyClassInputEnvelope
    set?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
    disconnect?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
    delete?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
    connect?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
    update?: TermLockUpdateWithWhereUniqueWithoutClassInput | TermLockUpdateWithWhereUniqueWithoutClassInput[]
    updateMany?: TermLockUpdateManyWithWhereWithoutClassInput | TermLockUpdateManyWithWhereWithoutClassInput[]
    deleteMany?: TermLockScalarWhereInput | TermLockScalarWhereInput[]
  }

  export type FinanceFeeStructureUpdateManyWithoutClassNestedInput = {
    create?: XOR<FinanceFeeStructureCreateWithoutClassInput, FinanceFeeStructureUncheckedCreateWithoutClassInput> | FinanceFeeStructureCreateWithoutClassInput[] | FinanceFeeStructureUncheckedCreateWithoutClassInput[]
    connectOrCreate?: FinanceFeeStructureCreateOrConnectWithoutClassInput | FinanceFeeStructureCreateOrConnectWithoutClassInput[]
    upsert?: FinanceFeeStructureUpsertWithWhereUniqueWithoutClassInput | FinanceFeeStructureUpsertWithWhereUniqueWithoutClassInput[]
    createMany?: FinanceFeeStructureCreateManyClassInputEnvelope
    set?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
    disconnect?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
    delete?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
    connect?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
    update?: FinanceFeeStructureUpdateWithWhereUniqueWithoutClassInput | FinanceFeeStructureUpdateWithWhereUniqueWithoutClassInput[]
    updateMany?: FinanceFeeStructureUpdateManyWithWhereWithoutClassInput | FinanceFeeStructureUpdateManyWithWhereWithoutClassInput[]
    deleteMany?: FinanceFeeStructureScalarWhereInput | FinanceFeeStructureScalarWhereInput[]
  }

  export type StudentUncheckedUpdateManyWithoutClassNestedInput = {
    create?: XOR<StudentCreateWithoutClassInput, StudentUncheckedCreateWithoutClassInput> | StudentCreateWithoutClassInput[] | StudentUncheckedCreateWithoutClassInput[]
    connectOrCreate?: StudentCreateOrConnectWithoutClassInput | StudentCreateOrConnectWithoutClassInput[]
    upsert?: StudentUpsertWithWhereUniqueWithoutClassInput | StudentUpsertWithWhereUniqueWithoutClassInput[]
    createMany?: StudentCreateManyClassInputEnvelope
    set?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
    disconnect?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
    delete?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
    connect?: StudentWhereUniqueInput | StudentWhereUniqueInput[]
    update?: StudentUpdateWithWhereUniqueWithoutClassInput | StudentUpdateWithWhereUniqueWithoutClassInput[]
    updateMany?: StudentUpdateManyWithWhereWithoutClassInput | StudentUpdateManyWithWhereWithoutClassInput[]
    deleteMany?: StudentScalarWhereInput | StudentScalarWhereInput[]
  }

  export type TermLockUncheckedUpdateManyWithoutClassNestedInput = {
    create?: XOR<TermLockCreateWithoutClassInput, TermLockUncheckedCreateWithoutClassInput> | TermLockCreateWithoutClassInput[] | TermLockUncheckedCreateWithoutClassInput[]
    connectOrCreate?: TermLockCreateOrConnectWithoutClassInput | TermLockCreateOrConnectWithoutClassInput[]
    upsert?: TermLockUpsertWithWhereUniqueWithoutClassInput | TermLockUpsertWithWhereUniqueWithoutClassInput[]
    createMany?: TermLockCreateManyClassInputEnvelope
    set?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
    disconnect?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
    delete?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
    connect?: TermLockWhereUniqueInput | TermLockWhereUniqueInput[]
    update?: TermLockUpdateWithWhereUniqueWithoutClassInput | TermLockUpdateWithWhereUniqueWithoutClassInput[]
    updateMany?: TermLockUpdateManyWithWhereWithoutClassInput | TermLockUpdateManyWithWhereWithoutClassInput[]
    deleteMany?: TermLockScalarWhereInput | TermLockScalarWhereInput[]
  }

  export type FinanceFeeStructureUncheckedUpdateManyWithoutClassNestedInput = {
    create?: XOR<FinanceFeeStructureCreateWithoutClassInput, FinanceFeeStructureUncheckedCreateWithoutClassInput> | FinanceFeeStructureCreateWithoutClassInput[] | FinanceFeeStructureUncheckedCreateWithoutClassInput[]
    connectOrCreate?: FinanceFeeStructureCreateOrConnectWithoutClassInput | FinanceFeeStructureCreateOrConnectWithoutClassInput[]
    upsert?: FinanceFeeStructureUpsertWithWhereUniqueWithoutClassInput | FinanceFeeStructureUpsertWithWhereUniqueWithoutClassInput[]
    createMany?: FinanceFeeStructureCreateManyClassInputEnvelope
    set?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
    disconnect?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
    delete?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
    connect?: FinanceFeeStructureWhereUniqueInput | FinanceFeeStructureWhereUniqueInput[]
    update?: FinanceFeeStructureUpdateWithWhereUniqueWithoutClassInput | FinanceFeeStructureUpdateWithWhereUniqueWithoutClassInput[]
    updateMany?: FinanceFeeStructureUpdateManyWithWhereWithoutClassInput | FinanceFeeStructureUpdateManyWithWhereWithoutClassInput[]
    deleteMany?: FinanceFeeStructureScalarWhereInput | FinanceFeeStructureScalarWhereInput[]
  }

  export type ClassCreateNestedOneWithoutStudentsInput = {
    create?: XOR<ClassCreateWithoutStudentsInput, ClassUncheckedCreateWithoutStudentsInput>
    connectOrCreate?: ClassCreateOrConnectWithoutStudentsInput
    connect?: ClassWhereUniqueInput
  }

  export type ResultCreateNestedManyWithoutStudentInput = {
    create?: XOR<ResultCreateWithoutStudentInput, ResultUncheckedCreateWithoutStudentInput> | ResultCreateWithoutStudentInput[] | ResultUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ResultCreateOrConnectWithoutStudentInput | ResultCreateOrConnectWithoutStudentInput[]
    createMany?: ResultCreateManyStudentInputEnvelope
    connect?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
  }

  export type ReportMetaCreateNestedManyWithoutStudentInput = {
    create?: XOR<ReportMetaCreateWithoutStudentInput, ReportMetaUncheckedCreateWithoutStudentInput> | ReportMetaCreateWithoutStudentInput[] | ReportMetaUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ReportMetaCreateOrConnectWithoutStudentInput | ReportMetaCreateOrConnectWithoutStudentInput[]
    createMany?: ReportMetaCreateManyStudentInputEnvelope
    connect?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
  }

  export type FinanceStudentProfileCreateNestedOneWithoutStudentInput = {
    create?: XOR<FinanceStudentProfileCreateWithoutStudentInput, FinanceStudentProfileUncheckedCreateWithoutStudentInput>
    connectOrCreate?: FinanceStudentProfileCreateOrConnectWithoutStudentInput
    connect?: FinanceStudentProfileWhereUniqueInput
  }

  export type ResultUncheckedCreateNestedManyWithoutStudentInput = {
    create?: XOR<ResultCreateWithoutStudentInput, ResultUncheckedCreateWithoutStudentInput> | ResultCreateWithoutStudentInput[] | ResultUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ResultCreateOrConnectWithoutStudentInput | ResultCreateOrConnectWithoutStudentInput[]
    createMany?: ResultCreateManyStudentInputEnvelope
    connect?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
  }

  export type ReportMetaUncheckedCreateNestedManyWithoutStudentInput = {
    create?: XOR<ReportMetaCreateWithoutStudentInput, ReportMetaUncheckedCreateWithoutStudentInput> | ReportMetaCreateWithoutStudentInput[] | ReportMetaUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ReportMetaCreateOrConnectWithoutStudentInput | ReportMetaCreateOrConnectWithoutStudentInput[]
    createMany?: ReportMetaCreateManyStudentInputEnvelope
    connect?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
  }

  export type FinanceStudentProfileUncheckedCreateNestedOneWithoutStudentInput = {
    create?: XOR<FinanceStudentProfileCreateWithoutStudentInput, FinanceStudentProfileUncheckedCreateWithoutStudentInput>
    connectOrCreate?: FinanceStudentProfileCreateOrConnectWithoutStudentInput
    connect?: FinanceStudentProfileWhereUniqueInput
  }

  export type ClassUpdateOneRequiredWithoutStudentsNestedInput = {
    create?: XOR<ClassCreateWithoutStudentsInput, ClassUncheckedCreateWithoutStudentsInput>
    connectOrCreate?: ClassCreateOrConnectWithoutStudentsInput
    upsert?: ClassUpsertWithoutStudentsInput
    connect?: ClassWhereUniqueInput
    update?: XOR<XOR<ClassUpdateToOneWithWhereWithoutStudentsInput, ClassUpdateWithoutStudentsInput>, ClassUncheckedUpdateWithoutStudentsInput>
  }

  export type ResultUpdateManyWithoutStudentNestedInput = {
    create?: XOR<ResultCreateWithoutStudentInput, ResultUncheckedCreateWithoutStudentInput> | ResultCreateWithoutStudentInput[] | ResultUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ResultCreateOrConnectWithoutStudentInput | ResultCreateOrConnectWithoutStudentInput[]
    upsert?: ResultUpsertWithWhereUniqueWithoutStudentInput | ResultUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: ResultCreateManyStudentInputEnvelope
    set?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
    disconnect?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
    delete?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
    connect?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
    update?: ResultUpdateWithWhereUniqueWithoutStudentInput | ResultUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: ResultUpdateManyWithWhereWithoutStudentInput | ResultUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: ResultScalarWhereInput | ResultScalarWhereInput[]
  }

  export type ReportMetaUpdateManyWithoutStudentNestedInput = {
    create?: XOR<ReportMetaCreateWithoutStudentInput, ReportMetaUncheckedCreateWithoutStudentInput> | ReportMetaCreateWithoutStudentInput[] | ReportMetaUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ReportMetaCreateOrConnectWithoutStudentInput | ReportMetaCreateOrConnectWithoutStudentInput[]
    upsert?: ReportMetaUpsertWithWhereUniqueWithoutStudentInput | ReportMetaUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: ReportMetaCreateManyStudentInputEnvelope
    set?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
    disconnect?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
    delete?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
    connect?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
    update?: ReportMetaUpdateWithWhereUniqueWithoutStudentInput | ReportMetaUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: ReportMetaUpdateManyWithWhereWithoutStudentInput | ReportMetaUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: ReportMetaScalarWhereInput | ReportMetaScalarWhereInput[]
  }

  export type FinanceStudentProfileUpdateOneWithoutStudentNestedInput = {
    create?: XOR<FinanceStudentProfileCreateWithoutStudentInput, FinanceStudentProfileUncheckedCreateWithoutStudentInput>
    connectOrCreate?: FinanceStudentProfileCreateOrConnectWithoutStudentInput
    upsert?: FinanceStudentProfileUpsertWithoutStudentInput
    disconnect?: FinanceStudentProfileWhereInput | boolean
    delete?: FinanceStudentProfileWhereInput | boolean
    connect?: FinanceStudentProfileWhereUniqueInput
    update?: XOR<XOR<FinanceStudentProfileUpdateToOneWithWhereWithoutStudentInput, FinanceStudentProfileUpdateWithoutStudentInput>, FinanceStudentProfileUncheckedUpdateWithoutStudentInput>
  }

  export type ResultUncheckedUpdateManyWithoutStudentNestedInput = {
    create?: XOR<ResultCreateWithoutStudentInput, ResultUncheckedCreateWithoutStudentInput> | ResultCreateWithoutStudentInput[] | ResultUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ResultCreateOrConnectWithoutStudentInput | ResultCreateOrConnectWithoutStudentInput[]
    upsert?: ResultUpsertWithWhereUniqueWithoutStudentInput | ResultUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: ResultCreateManyStudentInputEnvelope
    set?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
    disconnect?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
    delete?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
    connect?: ResultWhereUniqueInput | ResultWhereUniqueInput[]
    update?: ResultUpdateWithWhereUniqueWithoutStudentInput | ResultUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: ResultUpdateManyWithWhereWithoutStudentInput | ResultUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: ResultScalarWhereInput | ResultScalarWhereInput[]
  }

  export type ReportMetaUncheckedUpdateManyWithoutStudentNestedInput = {
    create?: XOR<ReportMetaCreateWithoutStudentInput, ReportMetaUncheckedCreateWithoutStudentInput> | ReportMetaCreateWithoutStudentInput[] | ReportMetaUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ReportMetaCreateOrConnectWithoutStudentInput | ReportMetaCreateOrConnectWithoutStudentInput[]
    upsert?: ReportMetaUpsertWithWhereUniqueWithoutStudentInput | ReportMetaUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: ReportMetaCreateManyStudentInputEnvelope
    set?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
    disconnect?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
    delete?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
    connect?: ReportMetaWhereUniqueInput | ReportMetaWhereUniqueInput[]
    update?: ReportMetaUpdateWithWhereUniqueWithoutStudentInput | ReportMetaUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: ReportMetaUpdateManyWithWhereWithoutStudentInput | ReportMetaUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: ReportMetaScalarWhereInput | ReportMetaScalarWhereInput[]
  }

  export type FinanceStudentProfileUncheckedUpdateOneWithoutStudentNestedInput = {
    create?: XOR<FinanceStudentProfileCreateWithoutStudentInput, FinanceStudentProfileUncheckedCreateWithoutStudentInput>
    connectOrCreate?: FinanceStudentProfileCreateOrConnectWithoutStudentInput
    upsert?: FinanceStudentProfileUpsertWithoutStudentInput
    disconnect?: FinanceStudentProfileWhereInput | boolean
    delete?: FinanceStudentProfileWhereInput | boolean
    connect?: FinanceStudentProfileWhereUniqueInput
    update?: XOR<XOR<FinanceStudentProfileUpdateToOneWithWhereWithoutStudentInput, FinanceStudentProfileUpdateWithoutStudentInput>, FinanceStudentProfileUncheckedUpdateWithoutStudentInput>
  }

  export type ClassCreateNestedOneWithoutTermLocksInput = {
    create?: XOR<ClassCreateWithoutTermLocksInput, ClassUncheckedCreateWithoutTermLocksInput>
    connectOrCreate?: ClassCreateOrConnectWithoutTermLocksInput
    connect?: ClassWhereUniqueInput
  }

  export type EnumTermStatusFieldUpdateOperationsInput = {
    set?: $Enums.TermStatus
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type ClassUpdateOneRequiredWithoutTermLocksNestedInput = {
    create?: XOR<ClassCreateWithoutTermLocksInput, ClassUncheckedCreateWithoutTermLocksInput>
    connectOrCreate?: ClassCreateOrConnectWithoutTermLocksInput
    upsert?: ClassUpsertWithoutTermLocksInput
    connect?: ClassWhereUniqueInput
    update?: XOR<XOR<ClassUpdateToOneWithWhereWithoutTermLocksInput, ClassUpdateWithoutTermLocksInput>, ClassUncheckedUpdateWithoutTermLocksInput>
  }

  export type StudentCreateNestedOneWithoutResultsInput = {
    create?: XOR<StudentCreateWithoutResultsInput, StudentUncheckedCreateWithoutResultsInput>
    connectOrCreate?: StudentCreateOrConnectWithoutResultsInput
    connect?: StudentWhereUniqueInput
  }

  export type StudentUpdateOneRequiredWithoutResultsNestedInput = {
    create?: XOR<StudentCreateWithoutResultsInput, StudentUncheckedCreateWithoutResultsInput>
    connectOrCreate?: StudentCreateOrConnectWithoutResultsInput
    upsert?: StudentUpsertWithoutResultsInput
    connect?: StudentWhereUniqueInput
    update?: XOR<XOR<StudentUpdateToOneWithWhereWithoutResultsInput, StudentUpdateWithoutResultsInput>, StudentUncheckedUpdateWithoutResultsInput>
  }

  export type StudentCreateNestedOneWithoutReportsInput = {
    create?: XOR<StudentCreateWithoutReportsInput, StudentUncheckedCreateWithoutReportsInput>
    connectOrCreate?: StudentCreateOrConnectWithoutReportsInput
    connect?: StudentWhereUniqueInput
  }

  export type StudentUpdateOneRequiredWithoutReportsNestedInput = {
    create?: XOR<StudentCreateWithoutReportsInput, StudentUncheckedCreateWithoutReportsInput>
    connectOrCreate?: StudentCreateOrConnectWithoutReportsInput
    upsert?: StudentUpsertWithoutReportsInput
    connect?: StudentWhereUniqueInput
    update?: XOR<XOR<StudentUpdateToOneWithWhereWithoutReportsInput, StudentUpdateWithoutReportsInput>, StudentUncheckedUpdateWithoutReportsInput>
  }

  export type UserCreateNestedOneWithoutAuditsInput = {
    create?: XOR<UserCreateWithoutAuditsInput, UserUncheckedCreateWithoutAuditsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneWithoutAuditsNestedInput = {
    create?: XOR<UserCreateWithoutAuditsInput, UserUncheckedCreateWithoutAuditsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditsInput
    upsert?: UserUpsertWithoutAuditsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAuditsInput, UserUpdateWithoutAuditsInput>, UserUncheckedUpdateWithoutAuditsInput>
  }

  export type StudentCreateNestedOneWithoutFinanceProfileInput = {
    create?: XOR<StudentCreateWithoutFinanceProfileInput, StudentUncheckedCreateWithoutFinanceProfileInput>
    connectOrCreate?: StudentCreateOrConnectWithoutFinanceProfileInput
    connect?: StudentWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type StudentUpdateOneRequiredWithoutFinanceProfileNestedInput = {
    create?: XOR<StudentCreateWithoutFinanceProfileInput, StudentUncheckedCreateWithoutFinanceProfileInput>
    connectOrCreate?: StudentCreateOrConnectWithoutFinanceProfileInput
    upsert?: StudentUpsertWithoutFinanceProfileInput
    connect?: StudentWhereUniqueInput
    update?: XOR<XOR<StudentUpdateToOneWithWhereWithoutFinanceProfileInput, StudentUpdateWithoutFinanceProfileInput>, StudentUncheckedUpdateWithoutFinanceProfileInput>
  }

  export type ClassCreateNestedOneWithoutFeeStructuresInput = {
    create?: XOR<ClassCreateWithoutFeeStructuresInput, ClassUncheckedCreateWithoutFeeStructuresInput>
    connectOrCreate?: ClassCreateOrConnectWithoutFeeStructuresInput
    connect?: ClassWhereUniqueInput
  }

  export type FinanceFeeComponentCreateNestedManyWithoutFeeStructureInput = {
    create?: XOR<FinanceFeeComponentCreateWithoutFeeStructureInput, FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput> | FinanceFeeComponentCreateWithoutFeeStructureInput[] | FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput[]
    connectOrCreate?: FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput | FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput[]
    createMany?: FinanceFeeComponentCreateManyFeeStructureInputEnvelope
    connect?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
  }

  export type FinanceFeeApprovalCreateNestedManyWithoutFeeStructureInput = {
    create?: XOR<FinanceFeeApprovalCreateWithoutFeeStructureInput, FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput> | FinanceFeeApprovalCreateWithoutFeeStructureInput[] | FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput[]
    connectOrCreate?: FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput | FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput[]
    createMany?: FinanceFeeApprovalCreateManyFeeStructureInputEnvelope
    connect?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
  }

  export type FinanceFeeComponentUncheckedCreateNestedManyWithoutFeeStructureInput = {
    create?: XOR<FinanceFeeComponentCreateWithoutFeeStructureInput, FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput> | FinanceFeeComponentCreateWithoutFeeStructureInput[] | FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput[]
    connectOrCreate?: FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput | FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput[]
    createMany?: FinanceFeeComponentCreateManyFeeStructureInputEnvelope
    connect?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
  }

  export type FinanceFeeApprovalUncheckedCreateNestedManyWithoutFeeStructureInput = {
    create?: XOR<FinanceFeeApprovalCreateWithoutFeeStructureInput, FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput> | FinanceFeeApprovalCreateWithoutFeeStructureInput[] | FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput[]
    connectOrCreate?: FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput | FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput[]
    createMany?: FinanceFeeApprovalCreateManyFeeStructureInputEnvelope
    connect?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
  }

  export type EnumFinanceApprovalStatusFieldUpdateOperationsInput = {
    set?: $Enums.FinanceApprovalStatus
  }

  export type ClassUpdateOneRequiredWithoutFeeStructuresNestedInput = {
    create?: XOR<ClassCreateWithoutFeeStructuresInput, ClassUncheckedCreateWithoutFeeStructuresInput>
    connectOrCreate?: ClassCreateOrConnectWithoutFeeStructuresInput
    upsert?: ClassUpsertWithoutFeeStructuresInput
    connect?: ClassWhereUniqueInput
    update?: XOR<XOR<ClassUpdateToOneWithWhereWithoutFeeStructuresInput, ClassUpdateWithoutFeeStructuresInput>, ClassUncheckedUpdateWithoutFeeStructuresInput>
  }

  export type FinanceFeeComponentUpdateManyWithoutFeeStructureNestedInput = {
    create?: XOR<FinanceFeeComponentCreateWithoutFeeStructureInput, FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput> | FinanceFeeComponentCreateWithoutFeeStructureInput[] | FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput[]
    connectOrCreate?: FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput | FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput[]
    upsert?: FinanceFeeComponentUpsertWithWhereUniqueWithoutFeeStructureInput | FinanceFeeComponentUpsertWithWhereUniqueWithoutFeeStructureInput[]
    createMany?: FinanceFeeComponentCreateManyFeeStructureInputEnvelope
    set?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
    disconnect?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
    delete?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
    connect?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
    update?: FinanceFeeComponentUpdateWithWhereUniqueWithoutFeeStructureInput | FinanceFeeComponentUpdateWithWhereUniqueWithoutFeeStructureInput[]
    updateMany?: FinanceFeeComponentUpdateManyWithWhereWithoutFeeStructureInput | FinanceFeeComponentUpdateManyWithWhereWithoutFeeStructureInput[]
    deleteMany?: FinanceFeeComponentScalarWhereInput | FinanceFeeComponentScalarWhereInput[]
  }

  export type FinanceFeeApprovalUpdateManyWithoutFeeStructureNestedInput = {
    create?: XOR<FinanceFeeApprovalCreateWithoutFeeStructureInput, FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput> | FinanceFeeApprovalCreateWithoutFeeStructureInput[] | FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput[]
    connectOrCreate?: FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput | FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput[]
    upsert?: FinanceFeeApprovalUpsertWithWhereUniqueWithoutFeeStructureInput | FinanceFeeApprovalUpsertWithWhereUniqueWithoutFeeStructureInput[]
    createMany?: FinanceFeeApprovalCreateManyFeeStructureInputEnvelope
    set?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
    disconnect?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
    delete?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
    connect?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
    update?: FinanceFeeApprovalUpdateWithWhereUniqueWithoutFeeStructureInput | FinanceFeeApprovalUpdateWithWhereUniqueWithoutFeeStructureInput[]
    updateMany?: FinanceFeeApprovalUpdateManyWithWhereWithoutFeeStructureInput | FinanceFeeApprovalUpdateManyWithWhereWithoutFeeStructureInput[]
    deleteMany?: FinanceFeeApprovalScalarWhereInput | FinanceFeeApprovalScalarWhereInput[]
  }

  export type FinanceFeeComponentUncheckedUpdateManyWithoutFeeStructureNestedInput = {
    create?: XOR<FinanceFeeComponentCreateWithoutFeeStructureInput, FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput> | FinanceFeeComponentCreateWithoutFeeStructureInput[] | FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput[]
    connectOrCreate?: FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput | FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput[]
    upsert?: FinanceFeeComponentUpsertWithWhereUniqueWithoutFeeStructureInput | FinanceFeeComponentUpsertWithWhereUniqueWithoutFeeStructureInput[]
    createMany?: FinanceFeeComponentCreateManyFeeStructureInputEnvelope
    set?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
    disconnect?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
    delete?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
    connect?: FinanceFeeComponentWhereUniqueInput | FinanceFeeComponentWhereUniqueInput[]
    update?: FinanceFeeComponentUpdateWithWhereUniqueWithoutFeeStructureInput | FinanceFeeComponentUpdateWithWhereUniqueWithoutFeeStructureInput[]
    updateMany?: FinanceFeeComponentUpdateManyWithWhereWithoutFeeStructureInput | FinanceFeeComponentUpdateManyWithWhereWithoutFeeStructureInput[]
    deleteMany?: FinanceFeeComponentScalarWhereInput | FinanceFeeComponentScalarWhereInput[]
  }

  export type FinanceFeeApprovalUncheckedUpdateManyWithoutFeeStructureNestedInput = {
    create?: XOR<FinanceFeeApprovalCreateWithoutFeeStructureInput, FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput> | FinanceFeeApprovalCreateWithoutFeeStructureInput[] | FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput[]
    connectOrCreate?: FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput | FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput[]
    upsert?: FinanceFeeApprovalUpsertWithWhereUniqueWithoutFeeStructureInput | FinanceFeeApprovalUpsertWithWhereUniqueWithoutFeeStructureInput[]
    createMany?: FinanceFeeApprovalCreateManyFeeStructureInputEnvelope
    set?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
    disconnect?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
    delete?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
    connect?: FinanceFeeApprovalWhereUniqueInput | FinanceFeeApprovalWhereUniqueInput[]
    update?: FinanceFeeApprovalUpdateWithWhereUniqueWithoutFeeStructureInput | FinanceFeeApprovalUpdateWithWhereUniqueWithoutFeeStructureInput[]
    updateMany?: FinanceFeeApprovalUpdateManyWithWhereWithoutFeeStructureInput | FinanceFeeApprovalUpdateManyWithWhereWithoutFeeStructureInput[]
    deleteMany?: FinanceFeeApprovalScalarWhereInput | FinanceFeeApprovalScalarWhereInput[]
  }

  export type FinanceFeeStructureCreateNestedOneWithoutComponentsInput = {
    create?: XOR<FinanceFeeStructureCreateWithoutComponentsInput, FinanceFeeStructureUncheckedCreateWithoutComponentsInput>
    connectOrCreate?: FinanceFeeStructureCreateOrConnectWithoutComponentsInput
    connect?: FinanceFeeStructureWhereUniqueInput
  }

  export type FinanceFeeStructureUpdateOneRequiredWithoutComponentsNestedInput = {
    create?: XOR<FinanceFeeStructureCreateWithoutComponentsInput, FinanceFeeStructureUncheckedCreateWithoutComponentsInput>
    connectOrCreate?: FinanceFeeStructureCreateOrConnectWithoutComponentsInput
    upsert?: FinanceFeeStructureUpsertWithoutComponentsInput
    connect?: FinanceFeeStructureWhereUniqueInput
    update?: XOR<XOR<FinanceFeeStructureUpdateToOneWithWhereWithoutComponentsInput, FinanceFeeStructureUpdateWithoutComponentsInput>, FinanceFeeStructureUncheckedUpdateWithoutComponentsInput>
  }

  export type FinanceFeeStructureCreateNestedOneWithoutApprovalsInput = {
    create?: XOR<FinanceFeeStructureCreateWithoutApprovalsInput, FinanceFeeStructureUncheckedCreateWithoutApprovalsInput>
    connectOrCreate?: FinanceFeeStructureCreateOrConnectWithoutApprovalsInput
    connect?: FinanceFeeStructureWhereUniqueInput
  }

  export type FinanceFeeStructureUpdateOneRequiredWithoutApprovalsNestedInput = {
    create?: XOR<FinanceFeeStructureCreateWithoutApprovalsInput, FinanceFeeStructureUncheckedCreateWithoutApprovalsInput>
    connectOrCreate?: FinanceFeeStructureCreateOrConnectWithoutApprovalsInput
    upsert?: FinanceFeeStructureUpsertWithoutApprovalsInput
    connect?: FinanceFeeStructureWhereUniqueInput
    update?: XOR<XOR<FinanceFeeStructureUpdateToOneWithWhereWithoutApprovalsInput, FinanceFeeStructureUpdateWithoutApprovalsInput>, FinanceFeeStructureUncheckedUpdateWithoutApprovalsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleFilter<$PrismaModel> | $Enums.Role
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedEnumRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleWithAggregatesFilter<$PrismaModel> | $Enums.Role
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoleFilter<$PrismaModel>
    _max?: NestedEnumRoleFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumTermStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TermStatus | EnumTermStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TermStatus[] | ListEnumTermStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TermStatus[] | ListEnumTermStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTermStatusFilter<$PrismaModel> | $Enums.TermStatus
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumTermStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TermStatus | EnumTermStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TermStatus[] | ListEnumTermStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TermStatus[] | ListEnumTermStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTermStatusWithAggregatesFilter<$PrismaModel> | $Enums.TermStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTermStatusFilter<$PrismaModel>
    _max?: NestedEnumTermStatusFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumFinanceApprovalStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.FinanceApprovalStatus | EnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FinanceApprovalStatus[] | ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FinanceApprovalStatus[] | ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFinanceApprovalStatusFilter<$PrismaModel> | $Enums.FinanceApprovalStatus
  }

  export type NestedEnumFinanceApprovalStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FinanceApprovalStatus | EnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FinanceApprovalStatus[] | ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FinanceApprovalStatus[] | ListEnumFinanceApprovalStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFinanceApprovalStatusWithAggregatesFilter<$PrismaModel> | $Enums.FinanceApprovalStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFinanceApprovalStatusFilter<$PrismaModel>
    _max?: NestedEnumFinanceApprovalStatusFilter<$PrismaModel>
  }

  export type AuditLogCreateWithoutUserInput = {
    id?: string
    action: string
    entity: string
    entityId?: string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuditLogUncheckedCreateWithoutUserInput = {
    id?: string
    action: string
    entity: string
    entityId?: string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuditLogCreateOrConnectWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    create: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput>
  }

  export type AuditLogCreateManyUserInputEnvelope = {
    data: AuditLogCreateManyUserInput | AuditLogCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AuditLogUpsertWithWhereUniqueWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    update: XOR<AuditLogUpdateWithoutUserInput, AuditLogUncheckedUpdateWithoutUserInput>
    create: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput>
  }

  export type AuditLogUpdateWithWhereUniqueWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    data: XOR<AuditLogUpdateWithoutUserInput, AuditLogUncheckedUpdateWithoutUserInput>
  }

  export type AuditLogUpdateManyWithWhereWithoutUserInput = {
    where: AuditLogScalarWhereInput
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyWithoutUserInput>
  }

  export type AuditLogScalarWhereInput = {
    AND?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    OR?: AuditLogScalarWhereInput[]
    NOT?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    id?: StringFilter<"AuditLog"> | string
    userId?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    entity?: StringFilter<"AuditLog"> | string
    entityId?: StringNullableFilter<"AuditLog"> | string | null
    before?: JsonNullableFilter<"AuditLog">
    after?: JsonNullableFilter<"AuditLog">
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
  }

  export type StudentCreateWithoutClassInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    results?: ResultCreateNestedManyWithoutStudentInput
    reports?: ReportMetaCreateNestedManyWithoutStudentInput
    financeProfile?: FinanceStudentProfileCreateNestedOneWithoutStudentInput
  }

  export type StudentUncheckedCreateWithoutClassInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    results?: ResultUncheckedCreateNestedManyWithoutStudentInput
    reports?: ReportMetaUncheckedCreateNestedManyWithoutStudentInput
    financeProfile?: FinanceStudentProfileUncheckedCreateNestedOneWithoutStudentInput
  }

  export type StudentCreateOrConnectWithoutClassInput = {
    where: StudentWhereUniqueInput
    create: XOR<StudentCreateWithoutClassInput, StudentUncheckedCreateWithoutClassInput>
  }

  export type StudentCreateManyClassInputEnvelope = {
    data: StudentCreateManyClassInput | StudentCreateManyClassInput[]
    skipDuplicates?: boolean
  }

  export type TermLockCreateWithoutClassInput = {
    id?: string
    session: string
    term: string
    status?: $Enums.TermStatus
    lockedBy?: string | null
    lockedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TermLockUncheckedCreateWithoutClassInput = {
    id?: string
    session: string
    term: string
    status?: $Enums.TermStatus
    lockedBy?: string | null
    lockedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TermLockCreateOrConnectWithoutClassInput = {
    where: TermLockWhereUniqueInput
    create: XOR<TermLockCreateWithoutClassInput, TermLockUncheckedCreateWithoutClassInput>
  }

  export type TermLockCreateManyClassInputEnvelope = {
    data: TermLockCreateManyClassInput | TermLockCreateManyClassInput[]
    skipDuplicates?: boolean
  }

  export type FinanceFeeStructureCreateWithoutClassInput = {
    id?: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    components?: FinanceFeeComponentCreateNestedManyWithoutFeeStructureInput
    approvals?: FinanceFeeApprovalCreateNestedManyWithoutFeeStructureInput
  }

  export type FinanceFeeStructureUncheckedCreateWithoutClassInput = {
    id?: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    components?: FinanceFeeComponentUncheckedCreateNestedManyWithoutFeeStructureInput
    approvals?: FinanceFeeApprovalUncheckedCreateNestedManyWithoutFeeStructureInput
  }

  export type FinanceFeeStructureCreateOrConnectWithoutClassInput = {
    where: FinanceFeeStructureWhereUniqueInput
    create: XOR<FinanceFeeStructureCreateWithoutClassInput, FinanceFeeStructureUncheckedCreateWithoutClassInput>
  }

  export type FinanceFeeStructureCreateManyClassInputEnvelope = {
    data: FinanceFeeStructureCreateManyClassInput | FinanceFeeStructureCreateManyClassInput[]
    skipDuplicates?: boolean
  }

  export type StudentUpsertWithWhereUniqueWithoutClassInput = {
    where: StudentWhereUniqueInput
    update: XOR<StudentUpdateWithoutClassInput, StudentUncheckedUpdateWithoutClassInput>
    create: XOR<StudentCreateWithoutClassInput, StudentUncheckedCreateWithoutClassInput>
  }

  export type StudentUpdateWithWhereUniqueWithoutClassInput = {
    where: StudentWhereUniqueInput
    data: XOR<StudentUpdateWithoutClassInput, StudentUncheckedUpdateWithoutClassInput>
  }

  export type StudentUpdateManyWithWhereWithoutClassInput = {
    where: StudentScalarWhereInput
    data: XOR<StudentUpdateManyMutationInput, StudentUncheckedUpdateManyWithoutClassInput>
  }

  export type StudentScalarWhereInput = {
    AND?: StudentScalarWhereInput | StudentScalarWhereInput[]
    OR?: StudentScalarWhereInput[]
    NOT?: StudentScalarWhereInput | StudentScalarWhereInput[]
    id?: StringFilter<"Student"> | string
    name?: StringFilter<"Student"> | string
    classId?: StringFilter<"Student"> | string
    createdAt?: DateTimeFilter<"Student"> | Date | string
    updatedAt?: DateTimeFilter<"Student"> | Date | string
  }

  export type TermLockUpsertWithWhereUniqueWithoutClassInput = {
    where: TermLockWhereUniqueInput
    update: XOR<TermLockUpdateWithoutClassInput, TermLockUncheckedUpdateWithoutClassInput>
    create: XOR<TermLockCreateWithoutClassInput, TermLockUncheckedCreateWithoutClassInput>
  }

  export type TermLockUpdateWithWhereUniqueWithoutClassInput = {
    where: TermLockWhereUniqueInput
    data: XOR<TermLockUpdateWithoutClassInput, TermLockUncheckedUpdateWithoutClassInput>
  }

  export type TermLockUpdateManyWithWhereWithoutClassInput = {
    where: TermLockScalarWhereInput
    data: XOR<TermLockUpdateManyMutationInput, TermLockUncheckedUpdateManyWithoutClassInput>
  }

  export type TermLockScalarWhereInput = {
    AND?: TermLockScalarWhereInput | TermLockScalarWhereInput[]
    OR?: TermLockScalarWhereInput[]
    NOT?: TermLockScalarWhereInput | TermLockScalarWhereInput[]
    id?: StringFilter<"TermLock"> | string
    classId?: StringFilter<"TermLock"> | string
    session?: StringFilter<"TermLock"> | string
    term?: StringFilter<"TermLock"> | string
    status?: EnumTermStatusFilter<"TermLock"> | $Enums.TermStatus
    lockedBy?: StringNullableFilter<"TermLock"> | string | null
    lockedAt?: DateTimeNullableFilter<"TermLock"> | Date | string | null
    createdAt?: DateTimeFilter<"TermLock"> | Date | string
    updatedAt?: DateTimeFilter<"TermLock"> | Date | string
  }

  export type FinanceFeeStructureUpsertWithWhereUniqueWithoutClassInput = {
    where: FinanceFeeStructureWhereUniqueInput
    update: XOR<FinanceFeeStructureUpdateWithoutClassInput, FinanceFeeStructureUncheckedUpdateWithoutClassInput>
    create: XOR<FinanceFeeStructureCreateWithoutClassInput, FinanceFeeStructureUncheckedCreateWithoutClassInput>
  }

  export type FinanceFeeStructureUpdateWithWhereUniqueWithoutClassInput = {
    where: FinanceFeeStructureWhereUniqueInput
    data: XOR<FinanceFeeStructureUpdateWithoutClassInput, FinanceFeeStructureUncheckedUpdateWithoutClassInput>
  }

  export type FinanceFeeStructureUpdateManyWithWhereWithoutClassInput = {
    where: FinanceFeeStructureScalarWhereInput
    data: XOR<FinanceFeeStructureUpdateManyMutationInput, FinanceFeeStructureUncheckedUpdateManyWithoutClassInput>
  }

  export type FinanceFeeStructureScalarWhereInput = {
    AND?: FinanceFeeStructureScalarWhereInput | FinanceFeeStructureScalarWhereInput[]
    OR?: FinanceFeeStructureScalarWhereInput[]
    NOT?: FinanceFeeStructureScalarWhereInput | FinanceFeeStructureScalarWhereInput[]
    id?: StringFilter<"FinanceFeeStructure"> | string
    classId?: StringFilter<"FinanceFeeStructure"> | string
    session?: StringFilter<"FinanceFeeStructure"> | string
    term?: StringFilter<"FinanceFeeStructure"> | string
    studentType?: StringFilter<"FinanceFeeStructure"> | string
    title?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    description?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    status?: EnumFinanceApprovalStatusFilter<"FinanceFeeStructure"> | $Enums.FinanceApprovalStatus
    submittedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    submittedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    submittedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    approvedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    approvedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    approvedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectedAt?: DateTimeNullableFilter<"FinanceFeeStructure"> | Date | string | null
    rejectedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    rejectionReason?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    updatedById?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    updatedByName?: StringNullableFilter<"FinanceFeeStructure"> | string | null
    createdAt?: DateTimeFilter<"FinanceFeeStructure"> | Date | string
    updatedAt?: DateTimeFilter<"FinanceFeeStructure"> | Date | string
  }

  export type ClassCreateWithoutStudentsInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
    termLocks?: TermLockCreateNestedManyWithoutClassInput
    feeStructures?: FinanceFeeStructureCreateNestedManyWithoutClassInput
  }

  export type ClassUncheckedCreateWithoutStudentsInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
    termLocks?: TermLockUncheckedCreateNestedManyWithoutClassInput
    feeStructures?: FinanceFeeStructureUncheckedCreateNestedManyWithoutClassInput
  }

  export type ClassCreateOrConnectWithoutStudentsInput = {
    where: ClassWhereUniqueInput
    create: XOR<ClassCreateWithoutStudentsInput, ClassUncheckedCreateWithoutStudentsInput>
  }

  export type ResultCreateWithoutStudentInput = {
    id?: string
    session: string
    term: string
    subject: string
    score: number
    date?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ResultUncheckedCreateWithoutStudentInput = {
    id?: string
    session: string
    term: string
    subject: string
    score: number
    date?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ResultCreateOrConnectWithoutStudentInput = {
    where: ResultWhereUniqueInput
    create: XOR<ResultCreateWithoutStudentInput, ResultUncheckedCreateWithoutStudentInput>
  }

  export type ResultCreateManyStudentInputEnvelope = {
    data: ResultCreateManyStudentInput | ResultCreateManyStudentInput[]
    skipDuplicates?: boolean
  }

  export type ReportMetaCreateWithoutStudentInput = {
    id?: string
    session: string
    term: string
    nextTermBegins?: string | null
    teacherComment?: string | null
    headTeacherComment?: string | null
    present?: number
    absent?: number
    total?: number
    updatedAt?: Date | string
  }

  export type ReportMetaUncheckedCreateWithoutStudentInput = {
    id?: string
    session: string
    term: string
    nextTermBegins?: string | null
    teacherComment?: string | null
    headTeacherComment?: string | null
    present?: number
    absent?: number
    total?: number
    updatedAt?: Date | string
  }

  export type ReportMetaCreateOrConnectWithoutStudentInput = {
    where: ReportMetaWhereUniqueInput
    create: XOR<ReportMetaCreateWithoutStudentInput, ReportMetaUncheckedCreateWithoutStudentInput>
  }

  export type ReportMetaCreateManyStudentInputEnvelope = {
    data: ReportMetaCreateManyStudentInput | ReportMetaCreateManyStudentInput[]
    skipDuplicates?: boolean
  }

  export type FinanceStudentProfileCreateWithoutStudentInput = {
    id?: string
    studentType?: string
    canStudentView?: boolean
    canParentView?: boolean
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceStudentProfileUncheckedCreateWithoutStudentInput = {
    id?: string
    studentType?: string
    canStudentView?: boolean
    canParentView?: boolean
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceStudentProfileCreateOrConnectWithoutStudentInput = {
    where: FinanceStudentProfileWhereUniqueInput
    create: XOR<FinanceStudentProfileCreateWithoutStudentInput, FinanceStudentProfileUncheckedCreateWithoutStudentInput>
  }

  export type ClassUpsertWithoutStudentsInput = {
    update: XOR<ClassUpdateWithoutStudentsInput, ClassUncheckedUpdateWithoutStudentsInput>
    create: XOR<ClassCreateWithoutStudentsInput, ClassUncheckedCreateWithoutStudentsInput>
    where?: ClassWhereInput
  }

  export type ClassUpdateToOneWithWhereWithoutStudentsInput = {
    where?: ClassWhereInput
    data: XOR<ClassUpdateWithoutStudentsInput, ClassUncheckedUpdateWithoutStudentsInput>
  }

  export type ClassUpdateWithoutStudentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    termLocks?: TermLockUpdateManyWithoutClassNestedInput
    feeStructures?: FinanceFeeStructureUpdateManyWithoutClassNestedInput
  }

  export type ClassUncheckedUpdateWithoutStudentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    termLocks?: TermLockUncheckedUpdateManyWithoutClassNestedInput
    feeStructures?: FinanceFeeStructureUncheckedUpdateManyWithoutClassNestedInput
  }

  export type ResultUpsertWithWhereUniqueWithoutStudentInput = {
    where: ResultWhereUniqueInput
    update: XOR<ResultUpdateWithoutStudentInput, ResultUncheckedUpdateWithoutStudentInput>
    create: XOR<ResultCreateWithoutStudentInput, ResultUncheckedCreateWithoutStudentInput>
  }

  export type ResultUpdateWithWhereUniqueWithoutStudentInput = {
    where: ResultWhereUniqueInput
    data: XOR<ResultUpdateWithoutStudentInput, ResultUncheckedUpdateWithoutStudentInput>
  }

  export type ResultUpdateManyWithWhereWithoutStudentInput = {
    where: ResultScalarWhereInput
    data: XOR<ResultUpdateManyMutationInput, ResultUncheckedUpdateManyWithoutStudentInput>
  }

  export type ResultScalarWhereInput = {
    AND?: ResultScalarWhereInput | ResultScalarWhereInput[]
    OR?: ResultScalarWhereInput[]
    NOT?: ResultScalarWhereInput | ResultScalarWhereInput[]
    id?: StringFilter<"Result"> | string
    studentId?: StringFilter<"Result"> | string
    session?: StringFilter<"Result"> | string
    term?: StringFilter<"Result"> | string
    subject?: StringFilter<"Result"> | string
    score?: IntFilter<"Result"> | number
    date?: StringNullableFilter<"Result"> | string | null
    createdAt?: DateTimeFilter<"Result"> | Date | string
    updatedAt?: DateTimeFilter<"Result"> | Date | string
  }

  export type ReportMetaUpsertWithWhereUniqueWithoutStudentInput = {
    where: ReportMetaWhereUniqueInput
    update: XOR<ReportMetaUpdateWithoutStudentInput, ReportMetaUncheckedUpdateWithoutStudentInput>
    create: XOR<ReportMetaCreateWithoutStudentInput, ReportMetaUncheckedCreateWithoutStudentInput>
  }

  export type ReportMetaUpdateWithWhereUniqueWithoutStudentInput = {
    where: ReportMetaWhereUniqueInput
    data: XOR<ReportMetaUpdateWithoutStudentInput, ReportMetaUncheckedUpdateWithoutStudentInput>
  }

  export type ReportMetaUpdateManyWithWhereWithoutStudentInput = {
    where: ReportMetaScalarWhereInput
    data: XOR<ReportMetaUpdateManyMutationInput, ReportMetaUncheckedUpdateManyWithoutStudentInput>
  }

  export type ReportMetaScalarWhereInput = {
    AND?: ReportMetaScalarWhereInput | ReportMetaScalarWhereInput[]
    OR?: ReportMetaScalarWhereInput[]
    NOT?: ReportMetaScalarWhereInput | ReportMetaScalarWhereInput[]
    id?: StringFilter<"ReportMeta"> | string
    studentId?: StringFilter<"ReportMeta"> | string
    session?: StringFilter<"ReportMeta"> | string
    term?: StringFilter<"ReportMeta"> | string
    nextTermBegins?: StringNullableFilter<"ReportMeta"> | string | null
    teacherComment?: StringNullableFilter<"ReportMeta"> | string | null
    headTeacherComment?: StringNullableFilter<"ReportMeta"> | string | null
    present?: IntFilter<"ReportMeta"> | number
    absent?: IntFilter<"ReportMeta"> | number
    total?: IntFilter<"ReportMeta"> | number
    updatedAt?: DateTimeFilter<"ReportMeta"> | Date | string
  }

  export type FinanceStudentProfileUpsertWithoutStudentInput = {
    update: XOR<FinanceStudentProfileUpdateWithoutStudentInput, FinanceStudentProfileUncheckedUpdateWithoutStudentInput>
    create: XOR<FinanceStudentProfileCreateWithoutStudentInput, FinanceStudentProfileUncheckedCreateWithoutStudentInput>
    where?: FinanceStudentProfileWhereInput
  }

  export type FinanceStudentProfileUpdateToOneWithWhereWithoutStudentInput = {
    where?: FinanceStudentProfileWhereInput
    data: XOR<FinanceStudentProfileUpdateWithoutStudentInput, FinanceStudentProfileUncheckedUpdateWithoutStudentInput>
  }

  export type FinanceStudentProfileUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    canStudentView?: BoolFieldUpdateOperationsInput | boolean
    canParentView?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceStudentProfileUncheckedUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    canStudentView?: BoolFieldUpdateOperationsInput | boolean
    canParentView?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ClassCreateWithoutTermLocksInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
    students?: StudentCreateNestedManyWithoutClassInput
    feeStructures?: FinanceFeeStructureCreateNestedManyWithoutClassInput
  }

  export type ClassUncheckedCreateWithoutTermLocksInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
    students?: StudentUncheckedCreateNestedManyWithoutClassInput
    feeStructures?: FinanceFeeStructureUncheckedCreateNestedManyWithoutClassInput
  }

  export type ClassCreateOrConnectWithoutTermLocksInput = {
    where: ClassWhereUniqueInput
    create: XOR<ClassCreateWithoutTermLocksInput, ClassUncheckedCreateWithoutTermLocksInput>
  }

  export type ClassUpsertWithoutTermLocksInput = {
    update: XOR<ClassUpdateWithoutTermLocksInput, ClassUncheckedUpdateWithoutTermLocksInput>
    create: XOR<ClassCreateWithoutTermLocksInput, ClassUncheckedCreateWithoutTermLocksInput>
    where?: ClassWhereInput
  }

  export type ClassUpdateToOneWithWhereWithoutTermLocksInput = {
    where?: ClassWhereInput
    data: XOR<ClassUpdateWithoutTermLocksInput, ClassUncheckedUpdateWithoutTermLocksInput>
  }

  export type ClassUpdateWithoutTermLocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    students?: StudentUpdateManyWithoutClassNestedInput
    feeStructures?: FinanceFeeStructureUpdateManyWithoutClassNestedInput
  }

  export type ClassUncheckedUpdateWithoutTermLocksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    students?: StudentUncheckedUpdateManyWithoutClassNestedInput
    feeStructures?: FinanceFeeStructureUncheckedUpdateManyWithoutClassNestedInput
  }

  export type StudentCreateWithoutResultsInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    class: ClassCreateNestedOneWithoutStudentsInput
    reports?: ReportMetaCreateNestedManyWithoutStudentInput
    financeProfile?: FinanceStudentProfileCreateNestedOneWithoutStudentInput
  }

  export type StudentUncheckedCreateWithoutResultsInput = {
    id?: string
    name: string
    classId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportMetaUncheckedCreateNestedManyWithoutStudentInput
    financeProfile?: FinanceStudentProfileUncheckedCreateNestedOneWithoutStudentInput
  }

  export type StudentCreateOrConnectWithoutResultsInput = {
    where: StudentWhereUniqueInput
    create: XOR<StudentCreateWithoutResultsInput, StudentUncheckedCreateWithoutResultsInput>
  }

  export type StudentUpsertWithoutResultsInput = {
    update: XOR<StudentUpdateWithoutResultsInput, StudentUncheckedUpdateWithoutResultsInput>
    create: XOR<StudentCreateWithoutResultsInput, StudentUncheckedCreateWithoutResultsInput>
    where?: StudentWhereInput
  }

  export type StudentUpdateToOneWithWhereWithoutResultsInput = {
    where?: StudentWhereInput
    data: XOR<StudentUpdateWithoutResultsInput, StudentUncheckedUpdateWithoutResultsInput>
  }

  export type StudentUpdateWithoutResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    class?: ClassUpdateOneRequiredWithoutStudentsNestedInput
    reports?: ReportMetaUpdateManyWithoutStudentNestedInput
    financeProfile?: FinanceStudentProfileUpdateOneWithoutStudentNestedInput
  }

  export type StudentUncheckedUpdateWithoutResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportMetaUncheckedUpdateManyWithoutStudentNestedInput
    financeProfile?: FinanceStudentProfileUncheckedUpdateOneWithoutStudentNestedInput
  }

  export type StudentCreateWithoutReportsInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    class: ClassCreateNestedOneWithoutStudentsInput
    results?: ResultCreateNestedManyWithoutStudentInput
    financeProfile?: FinanceStudentProfileCreateNestedOneWithoutStudentInput
  }

  export type StudentUncheckedCreateWithoutReportsInput = {
    id?: string
    name: string
    classId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    results?: ResultUncheckedCreateNestedManyWithoutStudentInput
    financeProfile?: FinanceStudentProfileUncheckedCreateNestedOneWithoutStudentInput
  }

  export type StudentCreateOrConnectWithoutReportsInput = {
    where: StudentWhereUniqueInput
    create: XOR<StudentCreateWithoutReportsInput, StudentUncheckedCreateWithoutReportsInput>
  }

  export type StudentUpsertWithoutReportsInput = {
    update: XOR<StudentUpdateWithoutReportsInput, StudentUncheckedUpdateWithoutReportsInput>
    create: XOR<StudentCreateWithoutReportsInput, StudentUncheckedCreateWithoutReportsInput>
    where?: StudentWhereInput
  }

  export type StudentUpdateToOneWithWhereWithoutReportsInput = {
    where?: StudentWhereInput
    data: XOR<StudentUpdateWithoutReportsInput, StudentUncheckedUpdateWithoutReportsInput>
  }

  export type StudentUpdateWithoutReportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    class?: ClassUpdateOneRequiredWithoutStudentsNestedInput
    results?: ResultUpdateManyWithoutStudentNestedInput
    financeProfile?: FinanceStudentProfileUpdateOneWithoutStudentNestedInput
  }

  export type StudentUncheckedUpdateWithoutReportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    results?: ResultUncheckedUpdateManyWithoutStudentNestedInput
    financeProfile?: FinanceStudentProfileUncheckedUpdateOneWithoutStudentNestedInput
  }

  export type UserCreateWithoutAuditsInput = {
    id?: string
    name: string
    email: string
    password: string
    role?: $Enums.Role
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUncheckedCreateWithoutAuditsInput = {
    id?: string
    name: string
    email: string
    password: string
    role?: $Enums.Role
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserCreateOrConnectWithoutAuditsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAuditsInput, UserUncheckedCreateWithoutAuditsInput>
  }

  export type UserUpsertWithoutAuditsInput = {
    update: XOR<UserUpdateWithoutAuditsInput, UserUncheckedUpdateWithoutAuditsInput>
    create: XOR<UserCreateWithoutAuditsInput, UserUncheckedCreateWithoutAuditsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAuditsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAuditsInput, UserUncheckedUpdateWithoutAuditsInput>
  }

  export type UserUpdateWithoutAuditsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateWithoutAuditsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentCreateWithoutFinanceProfileInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    class: ClassCreateNestedOneWithoutStudentsInput
    results?: ResultCreateNestedManyWithoutStudentInput
    reports?: ReportMetaCreateNestedManyWithoutStudentInput
  }

  export type StudentUncheckedCreateWithoutFinanceProfileInput = {
    id?: string
    name: string
    classId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    results?: ResultUncheckedCreateNestedManyWithoutStudentInput
    reports?: ReportMetaUncheckedCreateNestedManyWithoutStudentInput
  }

  export type StudentCreateOrConnectWithoutFinanceProfileInput = {
    where: StudentWhereUniqueInput
    create: XOR<StudentCreateWithoutFinanceProfileInput, StudentUncheckedCreateWithoutFinanceProfileInput>
  }

  export type StudentUpsertWithoutFinanceProfileInput = {
    update: XOR<StudentUpdateWithoutFinanceProfileInput, StudentUncheckedUpdateWithoutFinanceProfileInput>
    create: XOR<StudentCreateWithoutFinanceProfileInput, StudentUncheckedCreateWithoutFinanceProfileInput>
    where?: StudentWhereInput
  }

  export type StudentUpdateToOneWithWhereWithoutFinanceProfileInput = {
    where?: StudentWhereInput
    data: XOR<StudentUpdateWithoutFinanceProfileInput, StudentUncheckedUpdateWithoutFinanceProfileInput>
  }

  export type StudentUpdateWithoutFinanceProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    class?: ClassUpdateOneRequiredWithoutStudentsNestedInput
    results?: ResultUpdateManyWithoutStudentNestedInput
    reports?: ReportMetaUpdateManyWithoutStudentNestedInput
  }

  export type StudentUncheckedUpdateWithoutFinanceProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    results?: ResultUncheckedUpdateManyWithoutStudentNestedInput
    reports?: ReportMetaUncheckedUpdateManyWithoutStudentNestedInput
  }

  export type ClassCreateWithoutFeeStructuresInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
    students?: StudentCreateNestedManyWithoutClassInput
    termLocks?: TermLockCreateNestedManyWithoutClassInput
  }

  export type ClassUncheckedCreateWithoutFeeStructuresInput = {
    id?: string
    name: string
    section: string
    order?: number
    createdAt?: Date | string
    students?: StudentUncheckedCreateNestedManyWithoutClassInput
    termLocks?: TermLockUncheckedCreateNestedManyWithoutClassInput
  }

  export type ClassCreateOrConnectWithoutFeeStructuresInput = {
    where: ClassWhereUniqueInput
    create: XOR<ClassCreateWithoutFeeStructuresInput, ClassUncheckedCreateWithoutFeeStructuresInput>
  }

  export type FinanceFeeComponentCreateWithoutFeeStructureInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    amount: number
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    amount: number
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceFeeComponentCreateOrConnectWithoutFeeStructureInput = {
    where: FinanceFeeComponentWhereUniqueInput
    create: XOR<FinanceFeeComponentCreateWithoutFeeStructureInput, FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput>
  }

  export type FinanceFeeComponentCreateManyFeeStructureInputEnvelope = {
    data: FinanceFeeComponentCreateManyFeeStructureInput | FinanceFeeComponentCreateManyFeeStructureInput[]
    skipDuplicates?: boolean
  }

  export type FinanceFeeApprovalCreateWithoutFeeStructureInput = {
    id?: string
    action: string
    status: $Enums.FinanceApprovalStatus
    notes?: string | null
    actorId?: string | null
    actorName?: string | null
    actorRole?: string | null
    createdAt?: Date | string
  }

  export type FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput = {
    id?: string
    action: string
    status: $Enums.FinanceApprovalStatus
    notes?: string | null
    actorId?: string | null
    actorName?: string | null
    actorRole?: string | null
    createdAt?: Date | string
  }

  export type FinanceFeeApprovalCreateOrConnectWithoutFeeStructureInput = {
    where: FinanceFeeApprovalWhereUniqueInput
    create: XOR<FinanceFeeApprovalCreateWithoutFeeStructureInput, FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput>
  }

  export type FinanceFeeApprovalCreateManyFeeStructureInputEnvelope = {
    data: FinanceFeeApprovalCreateManyFeeStructureInput | FinanceFeeApprovalCreateManyFeeStructureInput[]
    skipDuplicates?: boolean
  }

  export type ClassUpsertWithoutFeeStructuresInput = {
    update: XOR<ClassUpdateWithoutFeeStructuresInput, ClassUncheckedUpdateWithoutFeeStructuresInput>
    create: XOR<ClassCreateWithoutFeeStructuresInput, ClassUncheckedCreateWithoutFeeStructuresInput>
    where?: ClassWhereInput
  }

  export type ClassUpdateToOneWithWhereWithoutFeeStructuresInput = {
    where?: ClassWhereInput
    data: XOR<ClassUpdateWithoutFeeStructuresInput, ClassUncheckedUpdateWithoutFeeStructuresInput>
  }

  export type ClassUpdateWithoutFeeStructuresInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    students?: StudentUpdateManyWithoutClassNestedInput
    termLocks?: TermLockUpdateManyWithoutClassNestedInput
  }

  export type ClassUncheckedUpdateWithoutFeeStructuresInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    section?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    students?: StudentUncheckedUpdateManyWithoutClassNestedInput
    termLocks?: TermLockUncheckedUpdateManyWithoutClassNestedInput
  }

  export type FinanceFeeComponentUpsertWithWhereUniqueWithoutFeeStructureInput = {
    where: FinanceFeeComponentWhereUniqueInput
    update: XOR<FinanceFeeComponentUpdateWithoutFeeStructureInput, FinanceFeeComponentUncheckedUpdateWithoutFeeStructureInput>
    create: XOR<FinanceFeeComponentCreateWithoutFeeStructureInput, FinanceFeeComponentUncheckedCreateWithoutFeeStructureInput>
  }

  export type FinanceFeeComponentUpdateWithWhereUniqueWithoutFeeStructureInput = {
    where: FinanceFeeComponentWhereUniqueInput
    data: XOR<FinanceFeeComponentUpdateWithoutFeeStructureInput, FinanceFeeComponentUncheckedUpdateWithoutFeeStructureInput>
  }

  export type FinanceFeeComponentUpdateManyWithWhereWithoutFeeStructureInput = {
    where: FinanceFeeComponentScalarWhereInput
    data: XOR<FinanceFeeComponentUpdateManyMutationInput, FinanceFeeComponentUncheckedUpdateManyWithoutFeeStructureInput>
  }

  export type FinanceFeeComponentScalarWhereInput = {
    AND?: FinanceFeeComponentScalarWhereInput | FinanceFeeComponentScalarWhereInput[]
    OR?: FinanceFeeComponentScalarWhereInput[]
    NOT?: FinanceFeeComponentScalarWhereInput | FinanceFeeComponentScalarWhereInput[]
    id?: StringFilter<"FinanceFeeComponent"> | string
    feeStructureId?: StringFilter<"FinanceFeeComponent"> | string
    code?: StringFilter<"FinanceFeeComponent"> | string
    name?: StringFilter<"FinanceFeeComponent"> | string
    description?: StringNullableFilter<"FinanceFeeComponent"> | string | null
    amount?: IntFilter<"FinanceFeeComponent"> | number
    isOptional?: BoolFilter<"FinanceFeeComponent"> | boolean
    visibleToStudent?: BoolFilter<"FinanceFeeComponent"> | boolean
    visibleToParent?: BoolFilter<"FinanceFeeComponent"> | boolean
    sortOrder?: IntFilter<"FinanceFeeComponent"> | number
    createdAt?: DateTimeFilter<"FinanceFeeComponent"> | Date | string
    updatedAt?: DateTimeFilter<"FinanceFeeComponent"> | Date | string
  }

  export type FinanceFeeApprovalUpsertWithWhereUniqueWithoutFeeStructureInput = {
    where: FinanceFeeApprovalWhereUniqueInput
    update: XOR<FinanceFeeApprovalUpdateWithoutFeeStructureInput, FinanceFeeApprovalUncheckedUpdateWithoutFeeStructureInput>
    create: XOR<FinanceFeeApprovalCreateWithoutFeeStructureInput, FinanceFeeApprovalUncheckedCreateWithoutFeeStructureInput>
  }

  export type FinanceFeeApprovalUpdateWithWhereUniqueWithoutFeeStructureInput = {
    where: FinanceFeeApprovalWhereUniqueInput
    data: XOR<FinanceFeeApprovalUpdateWithoutFeeStructureInput, FinanceFeeApprovalUncheckedUpdateWithoutFeeStructureInput>
  }

  export type FinanceFeeApprovalUpdateManyWithWhereWithoutFeeStructureInput = {
    where: FinanceFeeApprovalScalarWhereInput
    data: XOR<FinanceFeeApprovalUpdateManyMutationInput, FinanceFeeApprovalUncheckedUpdateManyWithoutFeeStructureInput>
  }

  export type FinanceFeeApprovalScalarWhereInput = {
    AND?: FinanceFeeApprovalScalarWhereInput | FinanceFeeApprovalScalarWhereInput[]
    OR?: FinanceFeeApprovalScalarWhereInput[]
    NOT?: FinanceFeeApprovalScalarWhereInput | FinanceFeeApprovalScalarWhereInput[]
    id?: StringFilter<"FinanceFeeApproval"> | string
    feeStructureId?: StringFilter<"FinanceFeeApproval"> | string
    action?: StringFilter<"FinanceFeeApproval"> | string
    status?: EnumFinanceApprovalStatusFilter<"FinanceFeeApproval"> | $Enums.FinanceApprovalStatus
    notes?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorId?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorName?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    actorRole?: StringNullableFilter<"FinanceFeeApproval"> | string | null
    createdAt?: DateTimeFilter<"FinanceFeeApproval"> | Date | string
  }

  export type FinanceFeeStructureCreateWithoutComponentsInput = {
    id?: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    class: ClassCreateNestedOneWithoutFeeStructuresInput
    approvals?: FinanceFeeApprovalCreateNestedManyWithoutFeeStructureInput
  }

  export type FinanceFeeStructureUncheckedCreateWithoutComponentsInput = {
    id?: string
    classId: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    approvals?: FinanceFeeApprovalUncheckedCreateNestedManyWithoutFeeStructureInput
  }

  export type FinanceFeeStructureCreateOrConnectWithoutComponentsInput = {
    where: FinanceFeeStructureWhereUniqueInput
    create: XOR<FinanceFeeStructureCreateWithoutComponentsInput, FinanceFeeStructureUncheckedCreateWithoutComponentsInput>
  }

  export type FinanceFeeStructureUpsertWithoutComponentsInput = {
    update: XOR<FinanceFeeStructureUpdateWithoutComponentsInput, FinanceFeeStructureUncheckedUpdateWithoutComponentsInput>
    create: XOR<FinanceFeeStructureCreateWithoutComponentsInput, FinanceFeeStructureUncheckedCreateWithoutComponentsInput>
    where?: FinanceFeeStructureWhereInput
  }

  export type FinanceFeeStructureUpdateToOneWithWhereWithoutComponentsInput = {
    where?: FinanceFeeStructureWhereInput
    data: XOR<FinanceFeeStructureUpdateWithoutComponentsInput, FinanceFeeStructureUncheckedUpdateWithoutComponentsInput>
  }

  export type FinanceFeeStructureUpdateWithoutComponentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    class?: ClassUpdateOneRequiredWithoutFeeStructuresNestedInput
    approvals?: FinanceFeeApprovalUpdateManyWithoutFeeStructureNestedInput
  }

  export type FinanceFeeStructureUncheckedUpdateWithoutComponentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    approvals?: FinanceFeeApprovalUncheckedUpdateManyWithoutFeeStructureNestedInput
  }

  export type FinanceFeeStructureCreateWithoutApprovalsInput = {
    id?: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    class: ClassCreateNestedOneWithoutFeeStructuresInput
    components?: FinanceFeeComponentCreateNestedManyWithoutFeeStructureInput
  }

  export type FinanceFeeStructureUncheckedCreateWithoutApprovalsInput = {
    id?: string
    classId: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    components?: FinanceFeeComponentUncheckedCreateNestedManyWithoutFeeStructureInput
  }

  export type FinanceFeeStructureCreateOrConnectWithoutApprovalsInput = {
    where: FinanceFeeStructureWhereUniqueInput
    create: XOR<FinanceFeeStructureCreateWithoutApprovalsInput, FinanceFeeStructureUncheckedCreateWithoutApprovalsInput>
  }

  export type FinanceFeeStructureUpsertWithoutApprovalsInput = {
    update: XOR<FinanceFeeStructureUpdateWithoutApprovalsInput, FinanceFeeStructureUncheckedUpdateWithoutApprovalsInput>
    create: XOR<FinanceFeeStructureCreateWithoutApprovalsInput, FinanceFeeStructureUncheckedCreateWithoutApprovalsInput>
    where?: FinanceFeeStructureWhereInput
  }

  export type FinanceFeeStructureUpdateToOneWithWhereWithoutApprovalsInput = {
    where?: FinanceFeeStructureWhereInput
    data: XOR<FinanceFeeStructureUpdateWithoutApprovalsInput, FinanceFeeStructureUncheckedUpdateWithoutApprovalsInput>
  }

  export type FinanceFeeStructureUpdateWithoutApprovalsInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    class?: ClassUpdateOneRequiredWithoutFeeStructuresNestedInput
    components?: FinanceFeeComponentUpdateManyWithoutFeeStructureNestedInput
  }

  export type FinanceFeeStructureUncheckedUpdateWithoutApprovalsInput = {
    id?: StringFieldUpdateOperationsInput | string
    classId?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    components?: FinanceFeeComponentUncheckedUpdateManyWithoutFeeStructureNestedInput
  }

  export type AuditLogCreateManyUserInput = {
    id?: string
    action: string
    entity: string
    entityId?: string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuditLogUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    before?: NullableJsonNullValueInput | InputJsonValue
    after?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentCreateManyClassInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TermLockCreateManyClassInput = {
    id?: string
    session: string
    term: string
    status?: $Enums.TermStatus
    lockedBy?: string | null
    lockedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceFeeStructureCreateManyClassInput = {
    id?: string
    session: string
    term: string
    studentType?: string
    title?: string | null
    description?: string | null
    status?: $Enums.FinanceApprovalStatus
    submittedAt?: Date | string | null
    submittedById?: string | null
    submittedByName?: string | null
    approvedAt?: Date | string | null
    approvedById?: string | null
    approvedByName?: string | null
    rejectedAt?: Date | string | null
    rejectedById?: string | null
    rejectedByName?: string | null
    rejectionReason?: string | null
    createdById?: string | null
    createdByName?: string | null
    updatedById?: string | null
    updatedByName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudentUpdateWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    results?: ResultUpdateManyWithoutStudentNestedInput
    reports?: ReportMetaUpdateManyWithoutStudentNestedInput
    financeProfile?: FinanceStudentProfileUpdateOneWithoutStudentNestedInput
  }

  export type StudentUncheckedUpdateWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    results?: ResultUncheckedUpdateManyWithoutStudentNestedInput
    reports?: ReportMetaUncheckedUpdateManyWithoutStudentNestedInput
    financeProfile?: FinanceStudentProfileUncheckedUpdateOneWithoutStudentNestedInput
  }

  export type StudentUncheckedUpdateManyWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TermLockUpdateWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    status?: EnumTermStatusFieldUpdateOperationsInput | $Enums.TermStatus
    lockedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lockedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TermLockUncheckedUpdateWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    status?: EnumTermStatusFieldUpdateOperationsInput | $Enums.TermStatus
    lockedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lockedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TermLockUncheckedUpdateManyWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    status?: EnumTermStatusFieldUpdateOperationsInput | $Enums.TermStatus
    lockedBy?: NullableStringFieldUpdateOperationsInput | string | null
    lockedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeStructureUpdateWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    components?: FinanceFeeComponentUpdateManyWithoutFeeStructureNestedInput
    approvals?: FinanceFeeApprovalUpdateManyWithoutFeeStructureNestedInput
  }

  export type FinanceFeeStructureUncheckedUpdateWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    components?: FinanceFeeComponentUncheckedUpdateManyWithoutFeeStructureNestedInput
    approvals?: FinanceFeeApprovalUncheckedUpdateManyWithoutFeeStructureNestedInput
  }

  export type FinanceFeeStructureUncheckedUpdateManyWithoutClassInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    studentType?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    submittedById?: NullableStringFieldUpdateOperationsInput | string | null
    submittedByName?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    approvedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectedById?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedByName?: NullableStringFieldUpdateOperationsInput | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: NullableStringFieldUpdateOperationsInput | string | null
    createdByName?: NullableStringFieldUpdateOperationsInput | string | null
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    updatedByName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResultCreateManyStudentInput = {
    id?: string
    session: string
    term: string
    subject: string
    score: number
    date?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportMetaCreateManyStudentInput = {
    id?: string
    session: string
    term: string
    nextTermBegins?: string | null
    teacherComment?: string | null
    headTeacherComment?: string | null
    present?: number
    absent?: number
    total?: number
    updatedAt?: Date | string
  }

  export type ResultUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    subject?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    date?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResultUncheckedUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    subject?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    date?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResultUncheckedUpdateManyWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    subject?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    date?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportMetaUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    nextTermBegins?: NullableStringFieldUpdateOperationsInput | string | null
    teacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    headTeacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    present?: IntFieldUpdateOperationsInput | number
    absent?: IntFieldUpdateOperationsInput | number
    total?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportMetaUncheckedUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    nextTermBegins?: NullableStringFieldUpdateOperationsInput | string | null
    teacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    headTeacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    present?: IntFieldUpdateOperationsInput | number
    absent?: IntFieldUpdateOperationsInput | number
    total?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportMetaUncheckedUpdateManyWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    session?: StringFieldUpdateOperationsInput | string
    term?: StringFieldUpdateOperationsInput | string
    nextTermBegins?: NullableStringFieldUpdateOperationsInput | string | null
    teacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    headTeacherComment?: NullableStringFieldUpdateOperationsInput | string | null
    present?: IntFieldUpdateOperationsInput | number
    absent?: IntFieldUpdateOperationsInput | number
    total?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeComponentCreateManyFeeStructureInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    amount: number
    isOptional?: boolean
    visibleToStudent?: boolean
    visibleToParent?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FinanceFeeApprovalCreateManyFeeStructureInput = {
    id?: string
    action: string
    status: $Enums.FinanceApprovalStatus
    notes?: string | null
    actorId?: string | null
    actorName?: string | null
    actorRole?: string | null
    createdAt?: Date | string
  }

  export type FinanceFeeComponentUpdateWithoutFeeStructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    isOptional?: BoolFieldUpdateOperationsInput | boolean
    visibleToStudent?: BoolFieldUpdateOperationsInput | boolean
    visibleToParent?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeComponentUncheckedUpdateWithoutFeeStructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    isOptional?: BoolFieldUpdateOperationsInput | boolean
    visibleToStudent?: BoolFieldUpdateOperationsInput | boolean
    visibleToParent?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeComponentUncheckedUpdateManyWithoutFeeStructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    isOptional?: BoolFieldUpdateOperationsInput | boolean
    visibleToStudent?: BoolFieldUpdateOperationsInput | boolean
    visibleToParent?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeApprovalUpdateWithoutFeeStructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    actorRole?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeApprovalUncheckedUpdateWithoutFeeStructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    actorRole?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FinanceFeeApprovalUncheckedUpdateManyWithoutFeeStructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    status?: EnumFinanceApprovalStatusFieldUpdateOperationsInput | $Enums.FinanceApprovalStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    actorRole?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}