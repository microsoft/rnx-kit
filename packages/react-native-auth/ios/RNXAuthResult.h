// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts
// The codegen work is tracked in https://github.com/microsoft/rnx-kit/issues/1106

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface RNXAuthResult : NSObject

@property (nonatomic, readonly) NSString *accessToken;
@property (nonatomic, readonly) NSInteger expirationTime;
@property (nonatomic, readonly, nullable) NSString *redirectURI;

+ (instancetype)resultWithAccessToken:(NSString *)accessToken
                       expirationTime:(NSInteger)expirationTime;

+ (instancetype)resultWithAccessToken:(NSString *)accessToken
                       expirationTime:(NSInteger)expirationTime
                          redirectURI:(nullable NSString *)redirectURI;

- (NSDictionary *)dictionary;

@end

NS_ASSUME_NONNULL_END
