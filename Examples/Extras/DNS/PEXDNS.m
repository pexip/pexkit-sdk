//
//  PEXDns.m
//
// The MIT License (MIT)
// 
// Copyright (c) 2016 Pexip
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sub license, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


#import "PEXDNS.h"
#include <dns_util.h>
#include <dns_sd.h>

@implementation NSURL (NSURL_WithUTF8String)

+ (id) URLWithUTF8EncodedString:(NSString* _Nonnull)URLString
{
    return [NSURL URLWithString:[URLString stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding]];
}

@end

@implementation PEXDns

static const NSString* kSRVResolverPriority = @"priority";
static const NSString* kSRVResolverWeight   = @"weight";
static const NSString* kSRVResolverPort     = @"port";
static const NSString* kSRVResolverTarget   = @"target";


+ (NSString* _Nonnull) serviceProtocolFromSettings
{
    BOOL useHTTPS = ![[[NSUserDefaults standardUserDefaults] objectForKey:@"com.pexip.https_disabled"] boolValue];
    if (useHTTPS) {
        return @"https";
    }
    return @"http";
}

+ (NSString* _Nonnull) serviceDefaultPortFromSettings
{
    BOOL useHTTPS = ![[[NSUserDefaults standardUserDefaults] objectForKey:@"com.pexip.https_disabled"] boolValue];
    if (useHTTPS) {
        return @"443";
    }
    return @"8080";
}

void DNSServiceQueryRecord_callback(DNSServiceRef sdRef,
              DNSServiceFlags flags,
              uint32_t interfaceIndex,
              DNSServiceErrorType errorCode,
              const char *fullname,
              uint16_t rrtype,
              uint16_t rrclass,
              uint16_t rdlen,
              const void *rdata,
              uint32_t ttl,
              void *context)
{
    // based on sample code from
    // http://developer.apple.com/library/mac/#samplecode/SRVResolver/Listings/SRVResolver_m.html#//apple_ref/doc/uid/DTS40009625-SRVResolver_m-DontLinkElementID_5
    NSMutableData* rrData;
    dns_resource_record_t* rr;
    uint8_t u8;
    uint16_t u16;
    uint32_t u32;

    if (rdata == NULL) return;

    rrData = [NSMutableData data];

    if (rrData == nil) return;

    u8 = 0;
    [rrData appendBytes:&u8 length:sizeof(u8)];
    u16 = htons(kDNSServiceType_SRV);
    [rrData appendBytes:&u16 length:sizeof(u16)];
    u16 = htons(kDNSServiceClass_IN);
    [rrData appendBytes:&u16 length:sizeof(u16)];
    u32 = htonl(666);
    [rrData appendBytes:&u32 length:sizeof(u32)];
    u16 = htons(rdlen);
    [rrData appendBytes:&u16 length:sizeof(u16)];
    [rrData appendBytes:rdata length:rdlen];

    rr = dns_parse_resource_record([rrData bytes], (uint32_t) [rrData length]);
    if (rr == NULL) return;

    NSString* target = [NSString stringWithCString:rr->data.SRV->target encoding:NSASCIIStringEncoding];
    if (target.length > 0) {
        NSDictionary* result = [NSDictionary dictionaryWithObjectsAndKeys:
                  [NSNumber numberWithUnsignedInt:rr->data.SRV->priority], kSRVResolverPriority,
                  [NSNumber numberWithUnsignedInt:rr->data.SRV->weight], kSRVResolverWeight,
                  [NSNumber numberWithUnsignedInt:rr->data.SRV->port], kSRVResolverPort,
                  target, kSRVResolverTarget,
                  nil
                  ];
        NSMutableArray* results = (__bridge NSMutableArray*) context;
        [results addObject:result];
    }

    dns_free_resource_record(rr);
}

/// If we don't find anything we simply return the given URI
+ (void) resolveURI:(NSString* _Nonnull)uri completionBlock:(void (^)( NSString* _Nonnull  serviceID))block
{
    dispatch_queue_t globalQueue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);
    dispatch_async(globalQueue, ^{
        NSString* srvName = [NSString stringWithFormat:@"%@.%@", @"_pexapp._tcp", uri];
        NSLog(@"PEXDNS looking up %@", srvName);
        const char* record = [srvName cStringUsingEncoding:NSUTF8StringEncoding];

        NSMutableArray* results = [NSMutableArray array];

        DNSServiceRef sdRef = NULL;
        DNSServiceErrorType err = DNSServiceQueryRecord(&sdRef, 0, 0, record, kDNSServiceType_SRV, kDNSServiceClass_IN, DNSServiceQueryRecord_callback, (__bridge void*)results);

        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC), globalQueue, ^{
            DNSServiceRefDeallocate(sdRef);
        });

        if (err == kDNSServiceErr_NoError) {
            DNSServiceProcessResult(sdRef);
        }

        dispatch_async(dispatch_get_main_queue(), ^{
            if ([results count])
            {
                NSDictionary* srvEntry = [results objectAtIndex:0];
                NSString* target = [srvEntry objectForKey:kSRVResolverTarget];
                NSString* port = [srvEntry objectForKey:kSRVResolverPort];
                NSLog(@"Got target %@", target);
                block([NSString stringWithFormat: @"%@:%@", target, port]);
            }
            else block(uri);
        });
    });
}

@end
