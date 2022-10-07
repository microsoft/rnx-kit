#import "RNXAuthResult.h"

@implementation RNXAuthResult

+ (instancetype)resultWithAccessToken:(NSString *)accessToken
                       expirationTime:(NSInteger)expirationTime
{
    return [[RNXAuthResult alloc] initWithAccessToken:accessToken
                                       expirationTime:expirationTime
                                          redirectURI:NULL];
}

+ (instancetype)resultWithAccessToken:(NSString *)accessToken
                       expirationTime:(NSInteger)expirationTime
                          redirectURI:(NSString *)redirectURI
{
    return [[RNXAuthResult alloc] initWithAccessToken:accessToken
                                       expirationTime:expirationTime
                                          redirectURI:redirectURI];
}

- (instancetype)initWithAccessToken:(NSString *)accessToken
                     expirationTime:(NSInteger)expirationTime
                        redirectURI:(NSString *)redirectURI
{
    if (self = [super init]) {
        _accessToken = accessToken;
        _expirationTime = expirationTime;
        _redirectURI = redirectURI;
    }
    return self;
}

- (NSDictionary *)dictionary
{
    return @{
        @"accessToken": _accessToken,
        @"expirationTime": @(_expirationTime),
        @"redirectUri": _redirectURI == NULL ? [NSNull null] : _redirectURI,
    };
}

@end
