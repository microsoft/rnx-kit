#import "RNXAuthError.h"

@implementation RNXAuthError

+ (instancetype)errorWithType:(RNXAuthErrorType)type
                correlationID:(NSString *)correlationID
                      message:(NSString *)message
{
    return [[RNXAuthError alloc] initWithType:type correlationID:correlationID message:message];
}

- (instancetype)initWithType:(RNXAuthErrorType)type
               correlationID:(NSString *)correlationID
                     message:(NSString *)message
{
    if (self = [super init]) {
        _type = type;
        _correlationID = correlationID;
        _message = message;
    }
    return self;
}

@end

@implementation NSError (RNXAuthError)

+ (instancetype)errorWithAuthError:(RNXAuthError *)authError
{
    if (authError == nil) {
        return nil;
    }

    NSDictionary *userInfo = @{
        @"type": RNXStringFromAuthErrorType(authError.type),
        @"correlationId": authError.correlationID,
        @"message": authError.message == nil ? [NSNull null] : authError.message,
    };
    return [NSError errorWithDomain:@"RNX_AUTH" code:authError.type userInfo:userInfo];
}

@end
