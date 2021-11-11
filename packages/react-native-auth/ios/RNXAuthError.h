#import <Foundation/Foundation.h>

#import <RNXAuth/RNXAuthErrorType.h>

NS_ASSUME_NONNULL_BEGIN

@interface RNXAuthError : NSObject

@property (nonatomic, readonly) RNXAuthErrorType type;
@property (nonatomic, readonly) NSString *correlationID;
@property (nonatomic, nullable, readonly) NSString *message;

+ (instancetype)errorWithType:(RNXAuthErrorType)type
                correlationID:(NSString *)correlationID
                      message:(nullable NSString *)message;

@end

@interface NSError (RNXAuthError)

+ (nullable instancetype)errorWithAuthError:(nullable RNXAuthError *)authError;

@end

NS_ASSUME_NONNULL_END
