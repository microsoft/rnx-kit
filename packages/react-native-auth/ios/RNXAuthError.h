// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts
// The codegen work is tracked in https://github.com/microsoft/rnx-kit/issues/1106

#import <Foundation/Foundation.h>

#import <RNXAuth/RNXAuthErrorType.h>

NS_ASSUME_NONNULL_BEGIN

@interface RNXAuthError : NSObject

@property (nonatomic, readonly) RNXAuthErrorType type;
@property (nonatomic, readonly) NSString *correlationID;
@property (nonatomic, readonly, nullable) NSString *message;

+ (instancetype)errorWithType:(RNXAuthErrorType)type
                correlationID:(NSString *)correlationID
                      message:(nullable NSString *)message;

@end

@interface NSError (RNXAuthError)

+ (nullable instancetype)errorWithAuthError:(nullable RNXAuthError *)authError;

@end

NS_ASSUME_NONNULL_END
