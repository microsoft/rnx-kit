#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface RNXAuthResult : NSObject

@property (nonatomic, readonly) NSString *accessToken;
@property (nonatomic, readonly) NSInteger expirationTime;
@property (nonatomic, readonly) NSString *redirectURI;

+ (instancetype)resultWithAccessToken:(NSString *)accessToken
                       expirationTime:(NSInteger)expirationTime
                          redirectURI:(NSString *)redirectURI;

- (NSDictionary *)dictionary;

@end

NS_ASSUME_NONNULL_END
